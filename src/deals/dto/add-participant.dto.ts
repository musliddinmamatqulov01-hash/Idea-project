import { IsIn, IsUUID } from 'class-validator';
import { DealParticipantRole } from '@prisma/client';

const ROLES: DealParticipantRole[] = [
  'BUYER',
  'SELLER',
  'BUYER_ADVISOR',
  'SELLER_ADVISOR',
  'LAWYER',
  'ACCOUNTANT',
  'ADMIN',
];

export class AddParticipantDto {
  @IsUUID()
  userId!: string;

  @IsIn(ROLES)
  role!: DealParticipantRole;
}
