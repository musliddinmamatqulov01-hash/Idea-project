import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { uniqueSlug } from '../common/utils/slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.businessCategory.findMany({ orderBy: { name: 'asc' } });
  }

  create(name: string) {
    return this.prisma.businessCategory.create({ data: { name, slug: uniqueSlug(name) } });
  }
}
