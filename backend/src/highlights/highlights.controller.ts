import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { HighlightsService } from './highlights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { AddPostsToHighlightDto } from './dto/add-posts-to-highlight.dto';

@Controller('highlights')
export class HighlightsController {
  constructor(private highlightsService: HighlightsService) {}

  @Get(':username')
  async getHighlightsForUser(@Param('username') username: string) {
    return this.highlightsService.getByUsername(username);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createHighlight(
    @Body() dto: CreateHighlightDto,
    @CurrentUser() user: any,
  ) {
    return this.highlightsService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateHighlight(
    @Param('id') id: string,
    @Body() dto: UpdateHighlightDto,
    @CurrentUser() user: any,
  ) {
    return this.highlightsService.updateTitle(id, dto.title, user.id);
  }

  @Post(':id/add-posts')
  @UseGuards(JwtAuthGuard)
  async addPostsToHighlight(
    @Param('id') id: string,
    @Body() dto: AddPostsToHighlightDto,
    @CurrentUser() user: any,
  ) {
    return this.highlightsService.addPosts(id, dto.postIds, user.id);
  }

  @Delete(':id/remove-posts')
  @UseGuards(JwtAuthGuard)
  async removePostsFromHighlight(
    @Param('id') id: string,
    @Body() dto: AddPostsToHighlightDto,
    @CurrentUser() user: any,
  ) {
    return this.highlightsService.removePosts(id, dto.postIds, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteHighlight(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.highlightsService.delete(id, user.id);
  }
}




