import { Injectable } from '@nestjs/common';
import { OrgMemberRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { uniqueSlug } from '../common/utils/slugify';
import { ErrorCode } from '../common/constants/error-codes';
import { ForbiddenAppException, NotFoundAppException } from '../common/errors/app.exception';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: uniqueSlug(dto.name),
        logoUrl: dto.logoUrl,
        members: { create: { userId, role: OrgMemberRole.OWNER } },
      },
      include: { members: true },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: { members: true },
    });
  }

  async addMember(organizationId: string, actingUserId: string, dto: AddMemberDto) {
    await this.assertRole(organizationId, actingUserId, [OrgMemberRole.OWNER, OrgMemberRole.ADMIN]);

    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!targetUser) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'No user found with that email');
    }

    return this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId: targetUser.id } },
      create: { organizationId, userId: targetUser.id, role: dto.role },
      update: { role: dto.role },
    });
  }

  async removeMember(organizationId: string, actingUserId: string, targetUserId: string) {
    await this.assertRole(organizationId, actingUserId, [OrgMemberRole.OWNER, OrgMemberRole.ADMIN]);
    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    return { success: true };
  }

  private async assertRole(organizationId: string, userId: string, allowed: OrgMemberRole[]) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!member || !allowed.includes(member.role)) {
      throw new ForbiddenAppException(
        ErrorCode.AUTH_FORBIDDEN,
        'Insufficient organization permissions',
      );
    }
    return member;
  }
}
