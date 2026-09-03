import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { WatchlistsService } from './watchlists.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@Controller()
export class WatchlistsController {
  constructor(private readonly watchlistsService: WatchlistsService) {}

  @Get('watchlist')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.watchlistsService.list(user.id);
  }

  @Post('businesses/:id/watchlist')
  add(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.watchlistsService.add(user.id, id);
  }

  @Delete('businesses/:id/watchlist')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.watchlistsService.remove(user.id, id);
  }
}
