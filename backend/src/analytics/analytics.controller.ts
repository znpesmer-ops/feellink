import { Controller, Get, UseGuards, ForbiddenException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { computeCapabilities } from '../roles/roles.utils';
import { SubscriptionPlanCode } from '../roles/roles.types';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('visits')
  async getVisits(
    @CurrentUser() user: any,
    @Query('range') range?: 'today' | '7d' | '30d',
  ) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getVisitStats(user.id, range || '30d');
  }

  @Get('words')
  async getWords(@CurrentUser() user: any) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getTopWords(user.id);
  }

  @Get('top-users')
  async getTopUsers(@CurrentUser() user: any) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getTopVisitors(user.id);
  }

  @Get('event-stats')
  async getEventStats(@CurrentUser() user: any) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getEventStats(user.id);
  }

  @Get('color-palette')
  async getColorPalette(@CurrentUser() user: any) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getColorPalette(user.id);
  }

  @Get('color-match/top5')
  async getTopColorMatches(@CurrentUser() user: any) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getTopColorMatches(user.id);
  }

  @Get('top-performing')
  async getTopPerforming(
    @CurrentUser() user: any,
    @Query('range') range?: 'today' | '7d' | '30d',
  ) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getTopPerformingContent(user.id, range || '30d');
  }

  @Get('saves')
  async getSaveAnalytics(
    @CurrentUser() user: any,
    @Query('range') range?: 'today' | '7d' | '30d',
  ) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getSaveAnalytics(user.id, range || '30d');
  }

  @Get('sources')
  async getSourceDistribution(
    @CurrentUser() user: any,
    @Query('range') range?: 'today' | '7d' | '30d',
  ) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getSourceDistribution(user.id, range || '30d');
  }

  @Get('comparison')
  async getComparison(
    @CurrentUser() user: any,
    @Query('range') range?: 'today' | '7d' | '30d',
  ) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getPeriodComparison(user.id, range || '30d');
  }

  @Get('low-engagement')
  async getLowEngagement(@CurrentUser() user: any) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getLowEngagementWarning(user.id);
  }
}

