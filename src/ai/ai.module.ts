import { Module } from '@nestjs/common';
import { QueueModule } from '../jobs/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { MockAIProvider } from './providers/mock-ai-provider';
import { AiProcessor } from '../jobs/processors/ai.processor';

@Module({
  imports: [QueueModule, NotificationsModule],
  controllers: [AiController],
  providers: [AiService, AiProcessor, { provide: AI_PROVIDER, useClass: MockAIProvider }],
  exports: [AI_PROVIDER],
})
export class AiModule {}
