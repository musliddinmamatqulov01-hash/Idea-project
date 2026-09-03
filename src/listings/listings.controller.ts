import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { Public } from '../common/decorators/public.decorator';
import { SearchListingsDto } from './dto/search-listings.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Public()
  @Get()
  search(@Query() query: SearchListingsDto) {
    return this.listingsService.search(query);
  }

  @Public()
  @Get(':idOrSlug')
  getOne(@Param('idOrSlug') idOrSlug: string) {
    return this.listingsService.getPublicDetail(idOrSlug);
  }
}
