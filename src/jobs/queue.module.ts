import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../config/configuration';
import { QUEUE_NAMES } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => ({
        connection: { url: configService.get('redis', { infer: true }).url },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.AI },
      { name: QUEUE_NAMES.SAVED_SEARCH_ALERTS },
      { name: QUEUE_NAMES.DOCUMENT_PROCESSING },
      { name: QUEUE_NAMES.ANALYTICS },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
