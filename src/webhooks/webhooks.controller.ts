import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { Public } from '../common/decorators/public.decorator';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/constants/error-codes';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('payment')
  handlePayment(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    if (!req.rawBody) {
      throw new AppException(
        ErrorCode.WEBHOOK_INVALID_SIGNATURE,
        'Missing raw body',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.webhooksService.handleStripeEvent(req.rawBody, signature);
  }
}
