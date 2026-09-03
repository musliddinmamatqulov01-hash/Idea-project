import { IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsOptional()
  @IsString()
  provider?: string;
}
