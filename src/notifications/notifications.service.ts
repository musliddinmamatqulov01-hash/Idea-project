import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from '../jobs/queue.constants';
import { NotificationsGateway } from './notifications.gateway';
import { buildCursorPage } from '../common/utils/cursor-pagination';
import { CursorPaginationQuery } from '../common/dto/pagination.dto';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async create(input: CreateNotificationInput): Promise<void> {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId: input.userId },
    });

    if (preference?.mutedTypes.includes(input.type)) {
      return;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: input.metadata,
      },
    });

    this.gateway.emitToUser(input.userId, 'notification.new', notification);

    if (preference?.emailEnabled ?? true) {
      await this.emailQueue.add(
        'notification-email',
        { userId: input.userId, type: input.type, title: input.title, body: input.body },
        DEFAULT_JOB_OPTIONS,
      );
    }
  }

  async list(userId: string, query: CursorPaginationQuery) {
    const limit = query.limit ?? 20;
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    return buildCursorPage(items, limit);
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
