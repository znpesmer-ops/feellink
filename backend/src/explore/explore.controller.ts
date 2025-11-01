import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ExploreService } from './explore.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('explore')
@UseGuards(JwtAuthGuard)
export class ExploreController {
  constructor(private exploreService: ExploreService) {}

  @Get()
  async getExplore(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.exploreService.getExplorePosts(
      user.id,
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
      user.id,
      limit ? parseInt(limit) : 20,
      cursor,
    );
  }
}

