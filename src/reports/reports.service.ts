import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateReportDto) {
    const report = await this.prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        businessId: dto.businessId,
        reason: dto.reason,
      },
    });

    await this.auditService.record({
      userId: user.id,
      action: 'REPORT_FILED',
      targetType: dto.targetType,
      targetId: dto.targetId,
    });

    return report;
  }

  listOwn(userId: string) {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
