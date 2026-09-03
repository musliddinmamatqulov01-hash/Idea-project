import { IsIn, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

const REVIEW_STATUSES: VerificationStatus[] = ['VERIFIED', 'REJECTED', 'IN_REVIEW'];

export class ReviewVerificationDto {
  @IsIn(REVIEW_STATUSES)
  status!: VerificationStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
