import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class GrantAccessDto {
  @IsUUID()
  granteeId!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
