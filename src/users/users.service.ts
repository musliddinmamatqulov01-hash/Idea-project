import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotFoundAppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/constants/error-codes';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Public-facing subset of a user's identity — never expose email/status broadly. */
export interface PublicUserDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  company: string | null;
  country: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateOwnProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
    return this.getPublicProfile(userId);
  }

  async getPublicProfile(userId: string): Promise<PublicUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'User not found');
    }
    return {
      id: user.id,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      company: user.profile?.company ?? null,
      country: user.profile?.country ?? null,
    };
  }
}
