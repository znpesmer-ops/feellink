import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private storiesService: StoriesService) {}

  @Post()
  async createStory(
    @CurrentUser() user: any,
    @Body() data: { mediaUrl: string; mediaType: string },
  ) {
    return this.storiesService.createStory(user.id, data.mediaUrl, data.mediaType);
  }

  @Get()
  async getStories(@CurrentUser() user: any) {
    return this.storiesService.getStories(user.id);
  }

  @Post(':id/view')
  async viewStory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.storiesService.viewStory(id, user.id);
  }

  @Delete(':id')
  async deleteStory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.storiesService.deleteStory(id, user.id);
  }
}











































