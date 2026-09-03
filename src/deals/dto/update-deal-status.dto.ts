import { IsIn } from 'class-validator';
import { DealStatus } from '@prisma/client';

const STATUSES: DealStatus[] = [
  'INITIATED',
  'NDA',
  'DUE_DILIGENCE',
  'AGREEMENT',
  'TRANSACTION',
  'TRANSFER',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
];

export class UpdateDealStatusDto {
  @IsIn(STATUSES)
  status!: DealStatus;
}
