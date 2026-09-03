import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { DueDiligenceStatus } from '@prisma/client';

const STATUSES: DueDiligenceStatus[] = [
  'REQUESTED',
  'UPLOADED',
  'UNDER_REVIEW',
  'APPROVED',
  'NEEDS_CLARIFICATION',
  'REJECTED',
  'COMPLETED',
];

export class UpdateItemStatusDto {
  @IsIn(STATUSES)
  status!: DueDiligenceStatus;

  @IsOptional()
  @IsUUID()
  documentId?: string;
}
