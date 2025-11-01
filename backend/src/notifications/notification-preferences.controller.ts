import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getMyPrefs(@CurrentUser() user: any) {
    return this.notificationsService.getPrefs(user.id);
  }

  @Put()
  async updatePrefs(
    @CurrentUser() user: any,
    @Body() body: { mention?: boolean; follow?: boolean; like?: boolean; comment?: boolean },
  ) {
    return this.notificationsService.updatePrefs(user.id, body);
  }
}

