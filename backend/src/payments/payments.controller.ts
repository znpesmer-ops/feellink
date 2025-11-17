import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Request } from 'express';

interface RequestUser {
  id: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: RequestUser,
  ) {
    const userId = user?.id ?? dto.userId;

    if (!userId) {
      throw new BadRequestException('Kullanıcı bilgisi bulunamadı');
    }

    if (dto.userId && dto.userId !== userId) {
      throw new ForbiddenException('Yetkisiz işlem');
    }

    const session = await this.paymentsService.createCheckoutSession({
      ...dto,
      userId,
      extras: dto.extras ?? [],
    });

    return {
      id: session.id,
      url: session.url,
    };
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody =
      req.rawBody ??
      (Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})));

    await this.paymentsService.handleWebhook(rawBody, signature);

    return { received: true };
  }
}


