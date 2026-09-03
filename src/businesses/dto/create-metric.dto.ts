import { IsIn, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import { MetricType, MetricSource } from '@prisma/client';

const METRIC_TYPES: MetricType[] = [
  'MRR',
  'ARR',
  'REVENUE',
  'EXPENSES',
  'PROFIT',
  'CUSTOMERS',
  'CHURN',
  'GROWTH',
  'TRAFFIC',
];

const METRIC_SOURCES: MetricSource[] = [
  'SELLER_PROVIDED',
  'STRIPE',
  'PADDLE',
  'SHOPIFY',
  'ACCOUNTING',
  'ADMIN_VERIFIED',
];

export class CreateMetricDto {
  @IsIn(METRIC_TYPES)
  metricType!: MetricType;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsISO8601()
  period!: string;

  @IsOptional()
  @IsIn(METRIC_SOURCES)
  source?: MetricSource;
}
