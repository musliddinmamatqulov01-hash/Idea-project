import { Body, Controller, Get, Post } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { SubscribeDto } from './dto/subscribe.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Get('plans')
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('subscription')
  getOwnSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getOwnSubscription(user.id);
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) {
    return this.billingService.subscribe(user.id, dto.planCode);
  }
}
