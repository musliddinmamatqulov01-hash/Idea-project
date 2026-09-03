import { Module } from '@nestjs/common';
import { DealsModule } from '../deals/deals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DueDiligenceController } from './due-diligence.controller';
import { DueDiligenceService } from './due-diligence.service';

@Module({
  imports: [DealsModule, NotificationsModule],
  controllers: [DueDiligenceController],
  providers: [DueDiligenceService],
})
export class DueDiligenceModule {}
