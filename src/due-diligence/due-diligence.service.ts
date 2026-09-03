import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DealsService } from '../deals/deals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ErrorCode } from '../common/constants/error-codes';
import { NotFoundAppException } from '../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateDueDiligenceRequestDto } from './dto/create-request.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

@Injectable()
export class DueDiligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealsService: DealsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(user: AuthenticatedUser, dealId: string, dto: CreateDueDiligenceRequestDto) {
    await this.dealsService.assertParticipant(user.id, dealId);

    const request = await this.prisma.dueDiligenceRequest.create({
      data: {
        dealId,
        category: dto.category,
        title: dto.title,
        requestedById: user.id,
        items: { create: dto.items.map((description) => ({ description })) },
      },
      include: { items: true },
    });

    await this.dealsService.addTimelineEvent(dealId, 'DUE_DILIGENCE_REQUESTED', user.id, {
      requestId: request.id,
    });

    const otherParticipants = await this.prisma.dealParticipant.findMany({
      where: { dealId, userId: { not: user.id } },
    });
    for (const participant of otherParticipants) {
      await this.notificationsService.create({
        userId: participant.userId,
        type: 'DUE_DILIGENCE_REQUEST',
        title: `New due diligence request: ${dto.title}`,
        metadata: { dealId, requestId: request.id },
      });
    }

    return request;
  }

  async listRequests(user: AuthenticatedUser, dealId: string) {
    await this.dealsService.assertParticipant(user.id, dealId);
    return this.prisma.dueDiligenceRequest.findMany({
      where: { dealId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateItemStatus(
    user: AuthenticatedUser,
    dealId: string,
    itemId: string,
    dto: UpdateItemStatusDto,
  ) {
    await this.dealsService.assertParticipant(user.id, dealId);

    const item = await this.prisma.dueDiligenceItem.findFirst({
      where: { id: itemId, request: { dealId } },
    });
    if (!item) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'Due diligence item not found');
    }

    const updated = await this.prisma.dueDiligenceItem.update({
      where: { id: itemId },
      data: { status: dto.status, documentId: dto.documentId },
    });

    await this.dealsService.addTimelineEvent(dealId, 'DUE_DILIGENCE_ITEM_UPDATED', user.id, {
      itemId,
      status: dto.status,
    });

    return updated;
  }
}
