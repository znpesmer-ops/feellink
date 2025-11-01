import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('users')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    if (!query || query.trim() === '') {
      return [];
    }
    return this.searchService.searchUsers(
      query.trim(),
      limit ? parseInt(limit) : 20,
      user?.id,
    );
  }

  @Get('hashtags')
  async searchHashtags(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.searchService.searchHashtags(query, limit ? parseInt(limit) : 20);
  }
}


