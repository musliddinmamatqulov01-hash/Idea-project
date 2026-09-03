import { Module } from '@nestjs/common';
import { QueueModule } from './queue.module';
import { EmailModule } from '../integrations/email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailProcessor } from './processors/email.processor';
import { SavedSearchProcessor } from './processors/saved-search.processor';

@Module({
  imports: [QueueModule, EmailModule, NotificationsModule],
  providers: [EmailProcessor, SavedSearchProcessor],
  exports: [QueueModule],
})
export class JobsModule {}
