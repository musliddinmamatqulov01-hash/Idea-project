import { IsIn } from 'class-validator';
import { AIJobType } from '@prisma/client';

const JOB_TYPES: AIJobType[] = [
  'BUSINESS_ANALYSIS',
  'VALUATION',
  'RISK_ANALYSIS',
  'SUMMARY',
  'FINANCIAL_ANALYSIS',
];

export class RequestAnalysisDto {
  @IsIn(JOB_TYPES)
  type!: AIJobType;
}
