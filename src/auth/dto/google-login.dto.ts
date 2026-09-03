import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleLoginDto {
  /** The Google Identity Services ID token (JWT) — verified server-side, never trusted as-is. */
  @IsString()
  @MinLength(20)
  credential!: string;

  /**
   * Only sent (and only meaningful) when the verified Google identity has no
   * existing VentureMarket account: the role the user picked on the
   * "How do you want to use VentureMarket?" step. The global ValidationPipe
   * (whitelist + forbidNonWhitelisted) rejects any other value outright — an
   * "ADMIN" role can never reach the service layer through this field. For
   * an existing account this is ignored entirely; the stored role always wins.
   */
  @IsOptional()
  @IsIn(['BUYER', 'SELLER'])
  role?: 'BUYER' | 'SELLER';
}
