import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UserRoleCode } from '../roles/roles.types';
import { CreateJobApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

type CurrentUserPayload = {
  id: string;
  roles?: UserRoleCode[];
};

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateJobDto) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const canCreate = roles.includes('corporate') || roles.includes('collector');

    if (!canCreate) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok.');
    }

    return this.jobsService.create(user.id, dto);
  }

  @Get('public')
  async getPublicListings() {
    return this.jobsService.getAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/applications')
  async applyToJob(
    @Param('id') jobListingId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateJobApplicationDto,
  ) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const canCreate = roles.includes('corporate') || roles.includes('collector');
    
    // İlan açma yetkisi olmayanlar başvurabilir
    if (canCreate) {
      throw new ForbiddenException('İlan açma yetkisine sahip kullanıcılar başvuru yapamaz');
    }

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
  @Get('me/applications')
  async getMyApplications(@CurrentUser() user: CurrentUserPayload) {
    return this.jobsService.getMyApplications(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/check-application')
  async checkApplication(
    @Param('id') jobListingId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.checkUserApplication(jobListingId, user.id);
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

  // 🔥 İlan sahibi için analiz endpoint'i
  @UseGuards(JwtAuthGuard)
  @Get('me/analytics')
  async getMyListingsAnalytics(@CurrentUser() user: CurrentUserPayload) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const canCreate = roles.includes('corporate') || roles.includes('collector');

    if (!canCreate) {
      throw new ForbiddenException('İlan analizi görüntüleme yetkiniz yok');
    }

    return this.jobsService.getOwnerListingsAnalytics(user.id);
  }
}






