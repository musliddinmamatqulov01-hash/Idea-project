import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AI_PROVIDER, AIProvider } from '../../ai/providers/ai-provider.interface';
import { BusinessAnalysisResultSchema } from '../../ai/schemas/business-analysis.schema';
import { QUEUE_NAMES } from '../queue.constants';

interface AnalyzeBusinessJobData {
  jobId: string;
}

@Processor(QUEUE_NAMES.AI)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
  ) {
    super();
  }

  async process(job: Job<AnalyzeBusinessJobData>): Promise<void> {
    const started = Date.now();
    const aiJob = await this.prisma.aIJob.findUnique({ where: { id: job.data.jobId } });
    if (!aiJob || !aiJob.businessId) {
      this.logger.warn(`AI job ${job.data.jobId} missing or has no business`);
      return;
    }

    await this.prisma.aIJob.update({
      where: { id: aiJob.id },
      data: { status: 'RUNNING', provider: this.aiProvider.name },
    });

    try {
      const business = await this.prisma.business.findUniqueOrThrow({
        where: { id: aiJob.businessId },
        include: { metrics: true },
      });

      const raw = await this.aiProvider.analyzeBusiness({
        businessName: business.name,
        businessModel: business.businessModel,
        foundedAt: business.foundedAt?.toISOString() ?? null,
        description: business.description,
        metrics: business.metrics.map((m) => ({
          type: m.metricType,
          value: Number(m.valueMinor) / 100,
          currency: m.currency,
          period: m.period.toISOString(),
          verificationStatus: m.verificationStatus,
        })),
      });

      const parsed = BusinessAnalysisResultSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(
          `AI provider returned an invalid/unvalidatable result: ${parsed.error.message}`,
        );
      }

      await this.prisma.$transaction([
        this.prisma.aIAnalysis.create({
          data: {
            businessId: aiJob.businessId,
            jobId: aiJob.id,
            type: aiJob.type,
            result: parsed.data as unknown as Prisma.InputJsonValue,
            confidence: parsed.data.valuation
              ? this.confidenceToScore(parsed.data.valuation.confidence)
              : null,
          },
        }),
        this.prisma.aIJob.update({
          where: { id: aiJob.id },
          data: { status: 'COMPLETED', durationMs: Date.now() - started },
        }),
      ]);

      await this.notificationsService.create({
        userId: aiJob.userId,
        type: 'SYSTEM',
        title: 'Your AI business analysis is ready',
        metadata: { businessId: aiJob.businessId, jobId: aiJob.id },
      });
    } catch (error) {
      this.logger.error(
        `AI job ${aiJob.id} failed`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.prisma.aIJob.update({
        where: { id: aiJob.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown AI provider failure',
          durationMs: Date.now() - started,
        },
      });
      // Do not rethrow past the notification step — a failed AI job must never
      // take down the worker or the main API; the user is notified instead.
      await this.notificationsService.create({
        userId: aiJob.userId,
        type: 'SYSTEM',
        title: 'AI analysis unavailable — please try again later',
        metadata: { businessId: aiJob.businessId, jobId: aiJob.id },
      });
    }
  }

  private confidenceToScore(confidence: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    return { LOW: 0.3, MEDIUM: 0.6, HIGH: 0.9 }[confidence];
  }
}
