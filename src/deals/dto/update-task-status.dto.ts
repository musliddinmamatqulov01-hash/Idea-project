import { IsIn } from 'class-validator';
import { DealTaskStatus } from '@prisma/client';

const STATUSES: DealTaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

export class UpdateTaskStatusDto {
  @IsIn(STATUSES)
  status!: DealTaskStatus;
}
