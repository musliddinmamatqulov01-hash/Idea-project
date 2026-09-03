import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import { validateEnv } from './config/env.validation';
import { buildConfiguration, AppConfiguration } from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { CategoriesModule } from './categories/categories.module';
import { BusinessesModule } from './businesses/businesses.module';
import { ListingsModule } from './listings/listings.module';
import { VerificationModule } from './verification/verification.module';
import { WatchlistsModule } from './watchlists/watchlists.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { OffersModule } from './offers/offers.module';
import { ConversationsModule } from './conversations/conversations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { DealsModule } from './deals/deals.module';
import { DueDiligenceModule } from './due-diligence/due-diligence.module';
import { AgreementsModule } from './agreements/agreements.module';
import { TransactionsModule } from './transactions/transactions.module';
import { BillingModule } from './billing/billing.module';
import { AiModule } from './ai/ai.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => buildConfiguration(validateEnv(process.env))],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => ({
        pinoHttp: {
          level: configService.get('nodeEnv', { infer: true }) === 'production' ? 'info' : 'debug',
          transport:
            configService.get('nodeEnv', { infer: true }) === 'production'
              ? undefined
              : { target: 'pino-pretty' },
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.passwordHash',
            '*.token',
          ],
          customProps: (req: IncomingMessage) => ({
            requestId: (req as IncomingMessage & { id?: unknown }).id,
          }),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfiguration, true>) => ({
        throttlers: [
          {
            ttl: configService.get('throttle', { infer: true }).ttlSeconds * 1000,
            limit: configService.get('throttle', { infer: true }).limit,
          },
        ],
      }),
    }),
    PrismaModule,
    AuditModule,
    JobsModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CategoriesModule,
    BusinessesModule,
    ListingsModule,
    VerificationModule,
    WatchlistsModule,
    SavedSearchesModule,
    OffersModule,
    ConversationsModule,
    NotificationsModule,
    DocumentsModule,
    DealsModule,
    DueDiligenceModule,
    AgreementsModule,
    TransactionsModule,
    BillingModule,
    AiModule,
    ReportsModule,
    AdminModule,
    WebhooksModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
