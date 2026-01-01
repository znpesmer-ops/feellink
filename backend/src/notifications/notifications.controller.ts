import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.notificationsService.getNotifications(
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
    // Geriye uyumluluk için: eğer sadece notifications array'i döndürülüyorsa
    // Eski frontend kodları için notifications array'ini direkt döndür
    return result;
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    // 🔥 KRİTİK: profile_incomplete bildirimleri de sayılmalı (profil tamamlanmamışsa)
    // Kullanıcının profil durumunu kontrol et
    const userData = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { profileCompleted: true },
    });
    
    // Profil tamamlanmamışsa profile_incomplete bildirimlerini de say
    const excludeProfileIncomplete = userData?.profileCompleted === true;
    const count = await this.notificationsService.getUnreadCount(user.id, excludeProfileIncomplete);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Put('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}




































