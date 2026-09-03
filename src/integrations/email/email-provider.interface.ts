export interface EmailMessage {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, string>;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
