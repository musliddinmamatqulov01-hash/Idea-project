import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DueDiligenceService } from './due-diligence.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateDueDiligenceRequestDto } from './dto/create-request.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

@Controller('deals/:dealId/due-diligence')
export class DueDiligenceController {
  constructor(private readonly dueDiligenceService: DueDiligenceService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body() dto: CreateDueDiligenceRequestDto,
  ) {
    return this.dueDiligenceService.createRequest(user, dealId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.dueDiligenceService.listRequests(user, dealId);
  }

  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.dueDiligenceService.updateItemStatus(user, dealId, itemId, dto);
  }
}
