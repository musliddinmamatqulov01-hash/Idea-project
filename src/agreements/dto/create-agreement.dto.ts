import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAgreementDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsBoolean()
  generatedByAI?: boolean;
}
