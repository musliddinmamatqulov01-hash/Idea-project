import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ReportTargetType } from '@prisma/client';

const TARGET_TYPES: ReportTargetType[] = ['BUSINESS', 'USER', 'MESSAGE', 'LISTING'];

export class CreateReportDto {
  @IsIn(TARGET_TYPES)
  targetType!: ReportTargetType;

  @IsUUID()
  targetId!: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason!: string;
}
