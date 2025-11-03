import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('visits')
  async getVisits(@CurrentUser() user: any) {
    // Only corporate users can access analytics
    if (user.role !== 'CORPORATE') {
      throw new ForbiddenException('Only corporate users can access analytics');
    }
    return this.analyticsService.getVisitStats(user.id);
  }

  @Get('words')
  async getWords(@CurrentUser() user: any) {
    if (user.role !== 'CORPORATE') {
      throw new ForbiddenException('Only corporate users can access analytics');
    }
    return this.analyticsService.getTopWords(user.id);
  }

  @Get('top-users')
  async getTopUsers(@CurrentUser() user: any) {
    if (user.role !== 'CORPORATE') {
      throw new ForbiddenException('Only corporate users can access analytics');
    }
    return this.analyticsService.getTopVisitors(user.id);
  }

  @Get('event-stats')
  async getEventStats(@CurrentUser() user: any) {
    if (user.role !== 'CORPORATE') {
      throw new ForbiddenException('Only corporate users can access analytics');
    }
    return this.analyticsService.getEventStats(user.id);
  }
}

