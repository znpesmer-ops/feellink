import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ExploreService } from './explore.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('explore')
export class ExploreController {
  constructor(private exploreService: ExploreService) {}

  @Get()
  async getExplore(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    // User optional - token yoksa da çalışır
    return this.exploreService.getExplorePosts(
      user?.id || null,
      limit ? parseInt(limit) : 20,
      cursor,
    );
  }

  @Get('hashtags')
  async searchHashtags(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.exploreService.searchHashtags(
      query,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('hashtags/:hashtag/posts')
  @UseGuards(JwtAuthGuard)
  async getHashtagPosts(
    @CurrentUser() user: any,
    @Param('hashtag') hashtag: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    // Get hashtag from route param
    const hashtagName = decodeURIComponent(hashtag);
    return this.exploreService.getHashtagPosts(
      hashtagName,
      user?.id || null,
      limit ? parseInt(limit) : 20,
      cursor,
    );
  }
}

