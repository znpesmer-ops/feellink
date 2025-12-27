import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { EmailChangeService } from './email-change.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('email-change')
@UseGuards(JwtAuthGuard)
export class EmailChangeController {
  constructor(private emailChangeService: EmailChangeService) {}

  @Post('request')
  async requestEmailChange(
    @CurrentUser() user: any,
    @Body() body: { newEmail: string },
  ) {
    return this.emailChangeService.requestEmailChange(user.id, body.newEmail);
  }

  @Get('confirm')
  async confirmEmailChange(@Query('token') token: string) {
    return this.emailChangeService.confirmEmailChange(token);
  }

  @Get('pending')
  async getPendingEmailChange(@CurrentUser() user: any) {
    return this.emailChangeService.getPendingEmailChange(user.id);
  }

  @Post('resend')
  async resendConfirmationEmail(@CurrentUser() user: any) {
    return this.emailChangeService.resendConfirmationEmail(user.id);
  }
}








