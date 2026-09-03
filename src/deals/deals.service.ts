import { Injectable } from '@nestjs/common';
import { DealParticipantRole, DealStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../common/audit/audit.service';
import { StateMachine } from '../common/utils/state-machine';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ErrorCode } from '../common/constants/error-codes';
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../common/errors/app.exception';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AddParticipantDto } from './dto/add-participant.dto';
import { UpdateDealStatusDto } from './dto/update-deal-status.dto';

const dealStateMachine = new StateMachine<DealStatus>({
  INITIATED: ['NDA', 'CANCELLED'],
  NDA: ['DUE_DILIGENCE', 'CANCELLED', 'DISPUTED'],
  DUE_DILIGENCE: ['AGREEMENT', 'CANCELLED', 'DISPUTED'],
  AGREEMENT: ['TRANSACTION', 'CANCELLED', 'DISPUTED'],
  TRANSACTION: ['TRANSFER', 'CANCELLED', 'DISPUTED'],
  TRANSFER: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ['NDA', 'DUE_DILIGENCE', 'AGREEMENT', 'TRANSACTION', 'TRANSFER', 'CANCELLED'],
});

const MANAGE_ROLES: DealParticipantRole[] = ['BUYER', 'SELLER', 'ADMIN'];

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async assertParticipant(userId: string, dealId: string) {
    const participant = await this.prisma.dealParticipant.findUnique({
      where: { dealId_userId: { dealId, userId } },
    });
    if (!participant) {
      const exists = await this.prisma.deal.findUnique({ where: { id: dealId } });
      if (!exists) {
        throw new NotFoundAppException(ErrorCode.DEAL_NOT_FOUND, 'Deal not found');
      }
      throw new ForbiddenAppException(
        ErrorCode.DEAL_ACCESS_DENIED,
        'You are not part of this deal',
      );
    }
    return participant;
  }

  async listForUser(user: AuthenticatedUser) {
    return this.prisma.deal.findMany({
      where: { participants: { some: { userId: user.id } } },
      include: { business: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(user: AuthenticatedUser, dealId: string) {
    await this.assertParticipant(user.id, dealId);
    return this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        business: true,
        participants: { include: { user: { include: { profile: true } } } },
        tasks: { orderBy: { createdAt: 'desc' } },
        timelineEvents: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, dealId: string, dto: UpdateDealStatusDto) {
    const participant = await this.assertParticipant(user.id, dealId);
    if (!MANAGE_ROLES.includes(participant.role) && user.role !== UserRole.ADMIN) {
      throw new ForbiddenAppException(
        ErrorCode.DEAL_ACCESS_DENIED,
        'Insufficient permissions to change deal status',
      );
    }

    const deal = await this.prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
    if (!dealStateMachine.canTransition(deal.status, dto.status)) {
      throw new ConflictAppException(
        ErrorCode.DEAL_INVALID_STATE_TRANSITION,
        `Cannot transition deal from ${deal.status} to ${dto.status}`,
      );
    }

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: { status: dto.status },
    });
    await this.addTimelineEvent(dealId, 'DEAL_STATUS_CHANGED', user.id, {
      from: deal.status,
      to: dto.status,
    });

    const others = await this.prisma.dealParticipant.findMany({
      where: { dealId, userId: { not: user.id } },
    });
    for (const p of others) {
      await this.notificationsService.create({
        userId: p.userId,
        type: 'DEAL_UPDATE',
        title: `Deal status changed to ${dto.status}`,
        metadata: { dealId },
      });
    }

    return updated;
  }

  async addParticipant(user: AuthenticatedUser, dealId: string, dto: AddParticipantDto) {
    const participant = await this.assertParticipant(user.id, dealId);
    if (!MANAGE_ROLES.includes(participant.role) && user.role !== UserRole.ADMIN) {
      throw new ForbiddenAppException(
        ErrorCode.DEAL_ACCESS_DENIED,
        'Insufficient permissions to add participants',
      );
    }

    const created = await this.prisma.dealParticipant.upsert({
      where: { dealId_userId: { dealId, userId: dto.userId } },
      create: { dealId, userId: dto.userId, role: dto.role },
      update: { role: dto.role },
    });

    await this.addTimelineEvent(dealId, 'PARTICIPANT_ADDED', user.id, {
      userId: dto.userId,
      role: dto.role,
    });
    return created;
  }

  async createTask(user: AuthenticatedUser, dealId: string, dto: CreateTaskDto) {
    await this.assertParticipant(user.id, dealId);
    const task = await this.prisma.dealTask.create({
      data: {
        dealId,
        title: dto.title,
        description: dto.description,
        ownerId: dto.ownerId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
    await this.addTimelineEvent(dealId, 'TASK_CREATED', user.id, { taskId: task.id });
    return task;
  }

  async listTasks(user: AuthenticatedUser, dealId: string) {
    await this.assertParticipant(user.id, dealId);
    return this.prisma.dealTask.findMany({ where: { dealId }, orderBy: { createdAt: 'asc' } });
  }

  async updateTaskStatus(
    user: AuthenticatedUser,
    dealId: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
  ) {
    await this.assertParticipant(user.id, dealId);
    const task = await this.prisma.dealTask.findFirst({ where: { id: taskId, dealId } });
    if (!task) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'Task not found');
    }
    const updated = await this.prisma.dealTask.update({
      where: { id: taskId },
      data: { status: dto.status },
    });
    if (dto.status === 'COMPLETED') {
      await this.addTimelineEvent(dealId, 'TASK_COMPLETED', user.id, { taskId });
    }
    return updated;
  }

  async addTimelineEvent(
    dealId: string,
    type: string,
    actorId: string | null,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.dealTimelineEvent.create({ data: { dealId, type, actorId, metadata } });
  }
}
