import { ArrayMinSize, IsArray, IsIn, IsString, MaxLength } from 'class-validator';
import { DueDiligenceCategory } from '@prisma/client';

const CATEGORIES: DueDiligenceCategory[] = [
  'BUSINESS',
  'FINANCIAL',
  'CUSTOMERS',
  'TECHNOLOGY',
  'LEGAL',
  'IP',
  'OPERATIONS',
];

export class CreateDueDiligenceRequestDto {
  @IsIn(CATEGORIES)
  category!: DueDiligenceCategory;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  items!: string[];
}
