import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { SearchListingsDto } from '../../listings/dto/search-listings.dto';

export class SaveSearchDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @ValidateNested()
  @Type(() => SearchListingsDto)
  filters!: SearchListingsDto;

  @IsOptional()
  @IsBoolean()
  alertsEnabled?: boolean;
}
