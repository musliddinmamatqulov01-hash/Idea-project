import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ListingVisibility } from '@prisma/client';

export class UpdateListingDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  askingPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'UNLISTED', 'PRIVATE'])
  visibility?: ListingVisibility;
}
