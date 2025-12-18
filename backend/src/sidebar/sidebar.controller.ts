import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { SidebarService } from './sidebar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('sidebar')
export class SidebarController {
  constructor(private readonly sidebarService: SidebarService) {}

  @Get('global')
  async getGlobalSidebarData() {
    return this.sidebarService.getGlobalData();
  }

  @Get('explore/posts')
  @UseGuards(JwtAuthGuard)
  async getExplorePosts(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.sidebarService.getExplorePosts(user.id, limitNum);
  }

  @Get('featured')
  async getFeaturedHighlights() {
    return this.sidebarService.getFeaturedHighlights();
  }
}

