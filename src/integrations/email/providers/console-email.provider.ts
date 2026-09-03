import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailProvider } from '../email-provider.interface';

/** Development fallback provider — logs instead of sending. Swap via EMAIL_PROVIDER env. */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger('EmailProvider');

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `[email:${message.template}] to=${message.to} subject="${message.subject}" vars=${JSON.stringify(
        message.variables,
      )}`,
    );
  }
}
