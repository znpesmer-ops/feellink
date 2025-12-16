import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  UseGuards,
  Query,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private adminService: AdminService,
  ) {}

  // Summary endpoint
  @Get('summary')
  async getSummary() {
    return this.adminService.getSummary();
  }

  // Users management
  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      role,
    );
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') userId: string,
    @Body() data: { roles?: string[]; isVerified?: boolean; isAdmin?: boolean },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUser(userId, data, user.id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string, @CurrentUser() user: any) {
    return this.adminService.deleteUser(userId, user.id);
  }

  // Posts management
  @Get('posts')
  async getPosts(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getPosts(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') postId: string, @CurrentUser() user: any) {
    return this.adminService.deletePost(postId, user.id);
  }

  // ✅ Artworks (Eserler) management
  @Get('artworks')
  async getArtworks(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getArtworks(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      userId,
    );
  }

  @Delete('artworks/:id')
  async deleteArtwork(@Param('id') artworkId: string, @CurrentUser() user: any) {
    return this.adminService.deleteArtwork(artworkId, user.id);
  }

  // Comments management
  @Get('comments')
  async getComments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getComments(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Delete('comments/:id')
  async deleteComment(
    @Param('id') commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.deleteComment(commentId, user.id);
  }

  // Articles management
  @Get('articles')
  async getArticles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getArticles(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Delete('articles/:id')
  async deleteArticle(
    @Param('id') articleId: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.deleteArticle(articleId, user.id);
  }

  // Events management
  @Get('events')
  async getEvents(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getEvents(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // Tickets management
  @Get('tickets')
  async getTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getTickets(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // Feature flags
  @Get('feature-flags')
  async getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Post('feature-flags')
  async updateFeatureFlag(
    @Body() body: { key: string; enabled: boolean },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateFeatureFlag(body.key, body.enabled, user.id);
  }

  // Audit logs
  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // Moderation
  @Get('moderation')
  async getModeration() {
    return this.adminService.getModerationItems();
  }

  // Analytics
  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // Legacy endpoint
  @Post('recalculate-follows')
  async recalculateFollows() {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    let fixed = 0;
    const updates = [];

    for (const user of users) {
      const [followers, following] = await Promise.all([
        this.prisma.follow.count({
          where: { followingId: user.id },
        }),
        this.prisma.follow.count({
          where: { followerId: user.id },
        }),
      ]);

      updates.push(
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            followerCount: followers,
            followingCount: following,
          },
        }),
      );

      fixed++;
    }

    await Promise.all(updates);

    return {
      message:
        '✅ Tüm kullanıcıların takipçi/following sayıları kontrol edildi ve güncellendi.',
      totalUsers: users.length,
      updated: fixed,
      timestamp: new Date().toISOString(),
    };
  }

  // 🎨 Renk analizi yeniden hesaplama endpoint'i
  @Post('recalculate-colors')
  async recalculateColors() {
    return this.adminService.recalculateColors();
  }
}
