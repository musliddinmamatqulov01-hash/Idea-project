import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WatchlistsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.watchlist.findMany({
      where: { userId },
      include: { business: { include: { listing: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, businessId: string) {
    return this.prisma.watchlist.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId },
      update: {},
    });
  }

  async remove(userId: string, businessId: string) {
    await this.prisma.watchlist.deleteMany({ where: { userId, businessId } });
    return { success: true };
  }
}
