import { Module } from '@nestjs/common';
import { DealsModule } from '../deals/deals.module';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';

@Module({
  imports: [DealsModule],
  controllers: [AgreementsController],
  providers: [AgreementsService],
})
export class AgreementsModule {}
