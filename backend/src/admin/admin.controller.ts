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
import { ReportsService } from '../reports/reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private adminService: AdminService,
    private reportsService: ReportsService,
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
    @Query('city') city?: string,
    @Query('gender') gender?: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      role,
      city,
      gender,
      ageMin ? parseInt(ageMin) : undefined,
      ageMax ? parseInt(ageMax) : undefined,
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

  // 🔒 Hesap askıya alma
  @Patch('users/:id/suspend')
  async suspendUser(
    @Param('id') userId: string,
    @Body() data: { until?: string; reason: string; note?: string },
    @CurrentUser() admin: any,
  ) {
    const until = data.until ? new Date(data.until) : null;
    return this.adminService.suspendUser(userId, admin.id, {
      until,
      reason: data.reason,
      note: data.note,
    });
  }

  // 🔒 Hesap askıdan çıkarma
  @Patch('users/:id/unsuspend')
  async unsuspendUser(@Param('id') userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  // Rol değiştirme endpoint'i (Frontend RoleChanger component'i için)
  @Patch('users/:id/roles')
  async updateUserRoles(
    @Param('id') userId: string,
    @Body() data: { roles: string[] },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUser(userId, { roles: data.roles }, user.id);
  }

  // ✅ Rol geçmişi endpoint'i
  @Get('users/:id/role-history')
  async getRoleHistory(@Param('id') userId: string) {
    return this.adminService.getRoleHistory(userId);
  }

  // ✅ Kalan gün bilgisi endpoint'i
  @Get('users/:id/role-change-remaining-days')
  async getRoleChangeRemainingDays(@Param('id') userId: string) {
    const remainingDays = await this.adminService.getRoleChangeRemainingDays(userId);
    return { remainingDays };
  }

  // Role change requests
  @Get('role-change-requests')
  async getRoleChangeRequests(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getRoleChangeRequests(
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch('role-change-requests/:id/approve')
  async approveRoleChangeRequest(
    @Param('id') requestId: string,
    @CurrentUser() adminUser: any,
    @Body() data?: { reviewNote?: string },
  ) {
    return this.adminService.approveRoleChangeRequest(requestId, adminUser.id, data?.reviewNote);
  }

  @Patch('role-change-requests/:id/reject')
  async rejectRoleChangeRequest(
    @Param('id') requestId: string,
    @CurrentUser() adminUser: any,
    @Body() data?: { reviewNote?: string },
  ) {
    return this.adminService.rejectRoleChangeRequest(requestId, adminUser.id, data?.reviewNote);
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

  // Reports management
  @Get('reports')
  async getReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getReports(
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('reports/:id')
  async getReportById(@Param('id') reportId: string) {
    return this.reportsService.getReportById(reportId);
  }

  @Patch('reports/:id')
  async updateReportStatus(
    @Param('id') reportId: string,
    @Body() body: { status: string },
  ) {
    return this.reportsService.updateReportStatus(reportId, body.status);
  }

  // Settings endpoints
  @Patch('settings/site-name')
  async updateSiteName(
    @Body() body: { value: string },
    @CurrentUser() user: any,
  ) {
    // 🔒 KRİTİK: await + response kontrolü
    const result = await this.adminService.updateSetting('siteName', body.value, user.id);
    return {
      success: true,
      data: result,
    };
  }

  @Patch('settings/site-description')
  async updateSiteDescription(
    @Body() body: { value: string },
    @CurrentUser() user: any,
  ) {
    // 🔒 KRİTİK: await + response kontrolü
    const result = await this.adminService.updateSetting('siteDescription', body.value, user.id);
    return {
      success: true,
      data: result,
    };
  }

  @Patch('settings/admin-email')
  async updateAdminEmail(
    @Body() body: { value: string },
    @CurrentUser() user: any,
  ) {
    // 🔒 KRİTİK: await + response kontrolü
    const result = await this.adminService.updateSetting('adminEmail', body.value, user.id);
    return {
      success: true,
      data: result,
    };
  }

  @Get('settings')
  async getSettings() {
    const settings = await this.adminService.getSettings();
    return {
      success: true,
      data: settings,
    };
  }
}
