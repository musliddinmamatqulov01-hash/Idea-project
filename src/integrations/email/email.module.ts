import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { EmailService } from './email.service';

@Module({
  providers: [
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      useClass: ConsoleEmailProvider,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
