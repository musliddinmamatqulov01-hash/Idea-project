import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('deals/:dealId/transaction')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user, dealId, dto);
  }

  @Get()
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.transactionsService.getForDeal(user, dealId);
  }
}
