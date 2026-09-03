import { IsEmail, IsIn } from 'class-validator';
import { OrgMemberRole } from '@prisma/client';

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsIn(['ADMIN', 'MEMBER'])
  role!: Exclude<OrgMemberRole, 'OWNER'>;
}
