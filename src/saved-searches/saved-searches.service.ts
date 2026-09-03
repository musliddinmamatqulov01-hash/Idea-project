import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { NotFoundAppException } from '../common/errors/app.exception';
import { SaveSearchDto } from './dto/save-search.dto';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: string, dto: SaveSearchDto) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        filters: dto.filters as unknown as Prisma.InputJsonValue,
        alertsEnabled: dto.alertsEnabled ?? true,
      },
    });
  }

  async update(userId: string, id: string, dto: Partial<SaveSearchDto>) {
    await this.assertOwned(userId, id);
    return this.prisma.savedSearch.update({
      where: { id },
      data: {
        name: dto.name,
        filters: dto.filters ? (dto.filters as unknown as Prisma.InputJsonValue) : undefined,
        alertsEnabled: dto.alertsEnabled,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
    return { success: true };
  }

  private async assertOwned(userId: string, id: string) {
    const search = await this.prisma.savedSearch.findUnique({ where: { id } });
    if (!search || search.userId !== userId) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'Saved search not found');
    }
    return search;
  }
}
