import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { DocumentCategory, DocumentVisibility } from '@prisma/client';

const CATEGORIES: DocumentCategory[] = [
  'FINANCIAL',
  'LEGAL',
  'TECHNICAL',
  'MARKETING',
  'OPERATIONS',
  'OTHER',
];
const VISIBILITIES: DocumentVisibility[] = ['PRIVATE', 'DEAL_PARTICIPANTS', 'ORGANIZATION'];

export class UploadDocumentDto {
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: DocumentCategory;

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: DocumentVisibility;

  @IsOptional()
  @IsUUID()
  dealId?: string;
}
