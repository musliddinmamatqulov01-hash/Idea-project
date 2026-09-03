import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { GrantAccessDto } from './dto/grant-access.dto';

@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('businesses/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') businessId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.documentsService.upload(user, businessId, file, dto);
  }

  @Get('businesses/:id/documents')
  list(@CurrentUser() user: AuthenticatedUser, @Param('id') businessId: string) {
    return this.documentsService.listForBusiness(user, businessId);
  }

  @Get('documents/:id/download')
  download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.getSignedDownloadUrl(user, id);
  }

  @Post('documents/:id/access')
  grantAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GrantAccessDto,
  ) {
    return this.documentsService.grantAccess(user, id, dto);
  }

  @Delete('documents/:id/access/:granteeId')
  revokeAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('granteeId') granteeId: string,
  ) {
    return this.documentsService.revokeAccess(user, id, granteeId);
  }

  @Delete('documents/:id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.remove(user, id);
  }
}
