import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RequestAnalysisDto } from './dto/request-analysis.dto';

@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('businesses/:id/ai-analysis')
  requestAnalysis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RequestAnalysisDto,
  ) {
    return this.aiService.requestAnalysis(user, id, dto.type);
  }

  @Public()
  @Get('businesses/:id/ai-analysis')
  getLatestAnalysis(@Param('id') id: string) {
    return this.aiService.getLatestAnalysis(id);
  }

  @Get('ai-jobs/:id')
  getJob(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.aiService.getJob(user, id);
  }
}
