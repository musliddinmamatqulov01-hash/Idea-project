import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ErrorCode } from '../common/constants/error-codes';
import { ForbiddenAppException, NotFoundAppException } from '../common/errors/app.exception';
import { buildCursorPage } from '../common/utils/cursor-pagination';
import { CursorPaginationQuery } from '../common/dto/pagination.dto';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateConversationDto) {
    const participantIds = Array.from(new Set([user.id, ...dto.participantIds]));

    const conversation = await this.prisma.conversation.create({
      data: {
        businessId: dto.businessId,
        participants: { create: participantIds.map((userId) => ({ userId })) },
        messages: {
          create: { senderId: user.id, body: dto.initialMessage },
        },
      },
      include: { participants: true, messages: true },
    });

    for (const participantId of participantIds.filter((id) => id !== user.id)) {
      await this.notificationsService.create({
        userId: participantId,
        type: 'NEW_MESSAGE',
        title: 'New conversation started',
        metadata: { conversationId: conversation.id },
      });
    }

    return conversation;
  }

  async listForUser(user: AuthenticatedUser) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId: user.id } } },
      include: {
        participants: { include: { user: { include: { profile: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listMessages(
    user: AuthenticatedUser,
    conversationId: string,
    query: CursorPaginationQuery,
  ) {
    await this.assertParticipant(user.id, conversationId);
    const limit = query.limit ?? 30;

    const messages = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { attachments: true },
    });

    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: user.id },
      data: { lastReadAt: new Date() },
    });

    return buildCursorPage(messages, limit);
  }

  async sendMessage(user: AuthenticatedUser, conversationId: string, dto: SendMessageDto) {
    await this.assertParticipant(user.id, conversationId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: user.id, body: dto.body },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const otherParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: user.id } },
    });
    for (const participant of otherParticipants) {
      await this.notificationsService.create({
        userId: participant.userId,
        type: 'NEW_MESSAGE',
        title: 'New message',
        metadata: { conversationId, messageId: message.id },
      });
    }

    return message;
  }

  private async assertParticipant(userId: string, conversationId: string): Promise<void> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) {
      const exists = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!exists) {
        throw new NotFoundAppException(ErrorCode.CONVERSATION_NOT_FOUND, 'Conversation not found');
      }
      throw new ForbiddenAppException(
        ErrorCode.CONVERSATION_ACCESS_DENIED,
        'You are not part of this conversation',
      );
    }
  }
}
