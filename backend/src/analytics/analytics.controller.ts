import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
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
  async getVisits(@CurrentUser() user: any) {
    const capabilities = computeCapabilities(
      (user.roles as string[]) ?? [],
      (user.plan as SubscriptionPlanCode) ?? 'FREE',
      (user.badges as string[]) ?? [],
    );

    if (!capabilities.permissions.canAccessAnalytics) {
      throw new ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
    }
    return this.analyticsService.getVisitStats(user.id);
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
}

