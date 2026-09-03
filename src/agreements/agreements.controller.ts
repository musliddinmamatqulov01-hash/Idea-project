import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { CreateAgreementVersionDto } from './dto/create-version.dto';

@Controller('deals/:dealId/agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body() dto: CreateAgreementDto,
  ) {
    return this.agreementsService.create(user, dealId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.agreementsService.list(user, dealId);
  }

  @Post(':agreementId/versions')
  addVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('agreementId') agreementId: string,
    @Body() dto: CreateAgreementVersionDto,
  ) {
    return this.agreementsService.addVersion(user, dealId, agreementId, dto);
  }

  @Post(':agreementId/versions/:versionId/sign')
  sign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('agreementId') agreementId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.agreementsService.sign(user, dealId, agreementId, versionId);
  }
}
