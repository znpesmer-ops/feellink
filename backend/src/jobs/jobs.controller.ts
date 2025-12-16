import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UserRoleCode } from '../roles/roles.types';
import { CreateJobApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { isAdmin } from '../auth/permissions.util';

type CurrentUserPayload = {
  id: string;
  roles?: UserRoleCode[];
  isAdmin?: boolean;
  superAdmin?: boolean;
};

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateJobDto) {
    // Tüm authenticated kullanıcılar iş ilanı oluşturabilir
    // LimitsService içinde limit kontrolü yapılıyor
    return this.jobsService.create(user.id, dto);
  }

  @Get('public')
  async getPublicListings() {
    return this.jobsService.getAll();
  }

  // ⚠️ ÖNEMLİ: Route sıralaması kritik!
  // 1. 'me' route'ları (en spesifik)
  // 2. 'applications' route'ları (spesifik)
  // 3. ':id' route'ları (genel, en sonda)

  @UseGuards(JwtAuthGuard)
  @Get('me/applications')
  async getMyApplications(@CurrentUser() user: CurrentUserPayload) {
    return this.jobsService.getMyApplications(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyJobs(@CurrentUser() user: CurrentUserPayload) {
    // Herkes kendi ilanlarını görebilir (rol kontrolü yok)
    return this.jobsService.getMyJobs(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/analytics')
  async getMyListingsAnalytics(@CurrentUser() user: CurrentUserPayload) {
    // Tüm authenticated kullanıcılar kendi ilanlarının analizini görebilir
    return this.jobsService.getOwnerListingsAnalytics(user.id);
  }

  // ⚠️ 'applications' route'ları ':id' route'larından ÖNCE olmalı
  // Aksi halde ':id' route'u 'applications' string'ini yakalar

  // Admin notu güncelleme
  @UseGuards(JwtAuthGuard)
  @Patch('applications/:applicationId/note')
  async updateAdminNote(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { note: string | null },
  ) {
    return this.jobsService.updateAdminNote(applicationId, user.id, body.note);
  }

  // İletişim geçmişi
  @UseGuards(JwtAuthGuard)
  @Get('applications/:applicationId/activities')
  async getApplicationActivities(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.getApplicationActivities(applicationId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('applications/:applicationId/status')
  async updateApplicationStatus(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.jobsService.updateApplicationStatus(applicationId, user.id, dto.status);
  }

  // ':id' route'ları en sonda (genel route'lar)
  @UseGuards(JwtAuthGuard)
  @Post(':id/applications')
  async applyToJob(
    @Param('id') jobListingId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateJobApplicationDto,
  ) {
    // Herkes başvurabilir - sadece kendi ilanına başvuramaz (bu kontrol service'de yapılıyor)
    return this.jobsService.applyToJob(jobListingId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/applications')
  async getApplicationsForJob(
    @Param('id') jobListingId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.getApplicationsForJob(jobListingId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/check-application')
  async checkApplication(
    @Param('id') jobListingId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.checkUserApplication(jobListingId, user.id);
  }

  // 🔥 İlan silme endpoint'i
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteJob(@Param('id') jobId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.jobsService.deleteJob(jobId, user.id, isAdmin(user as any));
  }
}






