import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../integrations/email/email.service';
import { QUEUE_NAMES } from '../queue.constants';

interface NotificationEmailData {
  userId: string;
  type: string;
  title: string;
  body?: string;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<NotificationEmailData>): Promise<void> {
    const { userId, title, body } = job.data;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      this.logger.warn(`Skipping email job ${job.id}: user ${userId} not found`);
      return;
    }
    await this.emailService.sendGenericNotificationEmail(user.email, title, body);
    this.logger.log(`Sent notification email "${title}" to ${user.email}`);
  }
}
