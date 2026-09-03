import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });

  app.use(cookieParser('test-cookie-secret'));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.setGlobalPrefix('api/v1');

  await app.init();
  return app;
}

export function extractCookie(setCookieHeader: string[] | undefined, name: string): string {
  const raw = setCookieHeader?.find((c) => c.startsWith(`${name}=`));
  if (!raw) {
    throw new Error(`Cookie ${name} not found in response`);
  }
  return raw.split(';')[0];
}
