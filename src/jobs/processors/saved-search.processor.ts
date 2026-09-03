import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SearchListingsDto } from '../../listings/dto/search-listings.dto';
import { QUEUE_NAMES } from '../queue.constants';

interface MatchSavedSearchesJobData {
  businessId: string;
}

@Processor(QUEUE_NAMES.SAVED_SEARCH_ALERTS)
export class SavedSearchProcessor extends WorkerHost {
  private readonly logger = new Logger(SavedSearchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<MatchSavedSearchesJobData>): Promise<void> {
    const business = await this.prisma.business.findUnique({
      where: { id: job.data.businessId },
      include: { listing: true, metrics: true, verifications: true },
    });
    if (!business || business.status !== 'PUBLISHED') {
      return;
    }

    const savedSearches = await this.prisma.savedSearch.findMany({
      where: { alertsEnabled: true },
    });
    const askingPriceMajor = business.listing?.askingPriceMinor
      ? Number(business.listing.askingPriceMinor) / 100
      : undefined;
    const mrrMajor = business.metrics.find((m) => m.metricType === 'MRR');
    const isVerified = business.verifications.some((v) => v.status === 'VERIFIED');

    for (const savedSearch of savedSearches) {
      const filters = savedSearch.filters as unknown as SearchListingsDto;
      if (
        !this.matches(filters, {
          categoryId: business.categoryId,
          country: business.country,
          askingPriceMajor,
          mrrMajor: mrrMajor ? Number(mrrMajor.valueMinor) / 100 : undefined,
          isVerified,
        })
      ) {
        continue;
      }

      await this.notificationsService.create({
        userId: savedSearch.userId,
        type: 'SYSTEM',
        title: `New listing matches "${savedSearch.name}"`,
        metadata: { businessId: business.id, savedSearchId: savedSearch.id },
      });

      await this.prisma.savedSearch.update({
        where: { id: savedSearch.id },
        data: { lastNotifiedAt: new Date() },
      });
    }

    this.logger.log(
      `Matched business ${business.id} against ${savedSearches.length} saved searches`,
    );
  }

  private matches(
    filters: SearchListingsDto,
    business: {
      categoryId: string | null;
      country: string | null;
      askingPriceMajor?: number;
      mrrMajor?: number;
      isVerified: boolean;
    },
  ): boolean {
    if (filters.categoryId && filters.categoryId !== business.categoryId) return false;
    if (filters.country && filters.country !== business.country) return false;
    if (filters.minPrice !== undefined && (business.askingPriceMajor ?? 0) < filters.minPrice)
      return false;
    if (
      filters.maxPrice !== undefined &&
      (business.askingPriceMajor ?? Infinity) > filters.maxPrice
    )
      return false;
    if (filters.minMrr !== undefined && (business.mrrMajor ?? 0) < filters.minMrr) return false;
    if (filters.verified === 'true' && !business.isVerified) return false;
    return true;
  }
}
