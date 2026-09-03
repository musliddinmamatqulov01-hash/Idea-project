import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CursorPaginationQuery } from '../common/dto/pagination.dto';

class ModerationActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Query() query: CursorPaginationQuery) {
    return this.adminService.listUsers(query);
  }

  @Get('businesses')
  listBusinesses(@Query() query: CursorPaginationQuery) {
    return this.adminService.listBusinesses(query);
  }

  @Get('verifications')
  listVerifications(@Query() query: CursorPaginationQuery) {
    return this.adminService.listVerifications(query);
  }

  @Get('reports')
  listReports(@Query() query: CursorPaginationQuery) {
    return this.adminService.listReports(query);
  }

  @Get('deals')
  listDeals(@Query() query: CursorPaginationQuery) {
    return this.adminService.listDeals(query);
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: CursorPaginationQuery) {
    return this.adminService.listAuditLogs(query);
  }

  @Post('businesses/:id/approve')
  approve(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerationActionDto,
  ) {
    return this.adminService.approveBusiness(admin, id, dto.reason);
  }

  @Post('businesses/:id/reject')
  reject(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerationActionDto,
  ) {
    return this.adminService.rejectBusiness(admin, id, dto.reason);
  }

  @Post('businesses/:id/suspend')
  suspend(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerationActionDto,
  ) {
    return this.adminService.suspendBusiness(admin, id, dto.reason);
  }
}
