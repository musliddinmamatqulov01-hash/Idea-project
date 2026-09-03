import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AIJobType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AppConfiguration } from '../config/configuration';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from '../jobs/queue.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ErrorCode } from '../common/constants/error-codes';
import { AppException, NotFoundAppException } from '../common/errors/app.exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfiguration, true>,
    @InjectQueue(QUEUE_NAMES.AI) private readonly aiQueue: Queue,
  ) {}

  async requestAnalysis(user: AuthenticatedUser, businessId: string, type: AIJobType) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) {
      throw new NotFoundAppException(ErrorCode.BUSINESS_NOT_FOUND, 'Business not found');
    }

    await this.assertWithinDailyLimit(user.id);

    const job = await this.prisma.aIJob.create({
      data: { userId: user.id, businessId, type, status: 'PENDING' },
    });

    await this.aiQueue.add('analyze-business', { jobId: job.id }, DEFAULT_JOB_OPTIONS);

    return job;
  }

  async getLatestAnalysis(businessId: string) {
    const analysis = await this.prisma.aIAnalysis.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) {
      throw new NotFoundAppException(
        ErrorCode.AI_ANALYSIS_UNAVAILABLE,
        'No AI analysis available yet for this business',
      );
    }
    return analysis;
  }

  async getJob(user: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.aIJob.findUnique({
      where: { id: jobId },
      include: { analysis: true },
    });
    if (!job || job.userId !== user.id) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'AI job not found');
    }
    return job;
  }

  private async assertWithinDailyLimit(userId: string): Promise<void> {
    const aiConfig = this.configService.get('ai', { infer: true });
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    const dailyLimit = subscription
      ? aiConfig.maxRequestsPerDayPro
      : aiConfig.maxRequestsPerDayFree;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const usedToday = await this.prisma.aIJob.count({
      where: { userId, createdAt: { gte: startOfDay } },
    });

    if (usedToday >= dailyLimit) {
      throw new AppException(
        ErrorCode.AI_RATE_LIMITED,
        `Daily AI analysis limit reached (${dailyLimit}/day on your plan)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
