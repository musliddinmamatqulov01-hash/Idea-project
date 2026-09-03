import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { NotFoundAppException } from '../common/errors/app.exception';
import { buildCursorPage } from '../common/utils/cursor-pagination';
import { toMinorUnits, toMajorUnits } from '../common/utils/money';
import { SearchListingsDto } from './dto/search-listings.dto';

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchListingsDto) {
    const limit = query.limit ?? 20;

    const listingWhere: Prisma.BusinessListingWhereInput = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    };

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      listingWhere.askingPriceMinor = {
        gte: query.minPrice !== undefined ? toMinorUnits(query.minPrice) : undefined,
        lte: query.maxPrice !== undefined ? toMinorUnits(query.maxPrice) : undefined,
      };
    }

    const where: Prisma.BusinessWhereInput = {
      deletedAt: null,
      status: 'PUBLISHED',
      listing: listingWhere,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.country) {
      where.country = query.country;
    }
    if (query.minMrr !== undefined) {
      where.metrics = {
        some: { metricType: 'MRR', valueMinor: { gte: toMinorUnits(query.minMrr) } },
      };
    }
    if (query.verified === 'true') {
      where.verifications = { some: { status: 'VERIFIED' } };
    }

    const orderBy = this.buildOrderBy(query.sortBy, query.sortDir ?? 'desc');

    const businesses = await this.prisma.business.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { listing: true, category: true },
    });

    const page = buildCursorPage(businesses, limit);
    return { ...page, data: page.data.map((b) => this.toPublicSummary(b)) };
  }

  async getPublicDetail(idOrSlug: string) {
    const business = await this.prisma.business.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        deletedAt: null,
        status: 'PUBLISHED',
        listing: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      },
      include: { listing: true, category: true, verifications: true },
    });

    if (!business) {
      throw new NotFoundAppException(ErrorCode.LISTING_NOT_FOUND, 'Listing not found');
    }

    return this.toPublicDetail(business);
  }

  private buildOrderBy(
    sortBy: string | undefined,
    dir: 'asc' | 'desc',
  ): Prisma.BusinessOrderByWithRelationInput {
    switch (sortBy) {
      case 'price':
        return { listing: { askingPriceMinor: dir } };
      case 'createdAt':
      default:
        return { createdAt: dir };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublicSummary(business: any) {
    return {
      id: business.id,
      slug: business.slug,
      name: business.name,
      headline: business.listing?.headline ?? null,
      category: business.category?.name ?? null,
      country: business.country,
      askingPrice: business.listing?.askingPriceMinor
        ? toMajorUnits(business.listing.askingPriceMinor)
        : null,
      currency: business.listing?.currency ?? 'USD',
      publishedAt: business.listing?.publishedAt ?? null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublicDetail(business: any) {
    return {
      ...this.toPublicSummary(business),
      ownerId: business.ownerId,
      description: business.description,
      businessModel: business.businessModel,
      foundedAt: business.foundedAt,
      website: business.website,
      verifications: business.verifications.map((v: { type: string; status: string }) => ({
        type: v.type,
        status: v.status,
      })),
    };
  }
}
