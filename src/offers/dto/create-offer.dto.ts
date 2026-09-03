import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateOfferDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  terms?: string;
}
