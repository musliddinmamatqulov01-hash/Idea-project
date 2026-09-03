import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';

/**
 * Standalone worker entry point. The HTTP server (main.ts) also runs all
 * BullMQ processors in-process for MVP simplicity — this entry point exists
 * so processors can be split into their own deployment/scaled independently
 * once queue volume warrants it, without duplicating processor registration.
 */
async function bootstrapWorker(): Promise<void> {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  logger.log('VentureMarket worker process started — consuming BullMQ queues');
}

bootstrapWorker();
