import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds!: string[];

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsString()
  initialMessage!: string;
}
