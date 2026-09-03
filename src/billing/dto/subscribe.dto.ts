import { IsIn } from 'class-validator';
import { PlanCode } from '@prisma/client';

const PLAN_CODES: PlanCode[] = ['FREE', 'BUYER_PRO', 'SELLER_PRO', 'BUSINESS'];

export class SubscribeDto {
  @IsIn(PLAN_CODES)
  planCode!: PlanCode;
}
