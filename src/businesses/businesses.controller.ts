import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateMetricDto } from './dto/create-metric.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(user, dto);
  }

  @Get()
  listOwned(@CurrentUser() user: AuthenticatedUser) {
    return this.businessesService.listOwned(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.businessesService.findOwned(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.businessesService.softDelete(user, id);
  }

  @Patch(':id/listing')
  updateListing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.businessesService.updateListing(user, id, dto);
  }

  @Post(':id/metrics')
  addMetric(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateMetricDto,
  ) {
    return this.businessesService.addMetric(user, id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.businessesService.publish(user, id);
  }

  @Post(':id/unpublish')
  unpublish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.businessesService.unpublish(user, id);
  }
}
