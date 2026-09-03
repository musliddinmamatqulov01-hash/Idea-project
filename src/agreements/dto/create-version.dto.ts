import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateAgreementVersionDto {
  @IsOptional()
  @IsUrl()
  contentUrl?: string;

  @IsOptional()
  @IsString()
  contentHash?: string;
}
