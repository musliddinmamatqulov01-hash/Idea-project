import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEventInput {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Writes immutable audit trail entries. Never mutate or delete audit rows. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEventInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: event.userId ?? null,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        requestId: event.requestId,
        ipAddress: event.ipAddress,
        metadata: event.metadata,
      },
    });
  }
}
