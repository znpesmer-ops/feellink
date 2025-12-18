import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete, UnauthorizedException } from '@nestjs/common';
import { HighlightsService } from './highlights.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateHighlightDto } from './dto/create-highlight.dto';
import { UpdateHighlightDto } from './dto/update-highlight.dto';
import { AddPostsToHighlightDto } from './dto/add-posts-to-highlight.dto';

@Controller('highlights')
export class HighlightsController {
  constructor(private highlightsService: HighlightsService) {}

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getHighlightsByUserId(@Param('userId') userId: string) {
    return this.highlightsService.getByUserId(userId);
  }

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
    // 🔥 KRİTİK: userId kontrolü - null/undefined ise hata fırlat
    if (!user || !user.id) {
      throw new UnauthorizedException('Kullanıcı kimliği bulunamadı');
    }
    
    console.log('🔍 Creating highlight for user:', {
      userId: user.id,
      username: user.username,
      hasUserId: !!user.id,
      userIdType: typeof user.id,
      dto: {
        title: dto.title,
        coverPostId: dto.coverPostId,
        postIdsCount: dto.postIds?.length || 0,
        postIds: dto.postIds,
      },
    });
    
    try {
      const result = await this.highlightsService.create(dto, user.id);
      console.log('✅ Highlight created successfully, returning result');
      return result;
    } catch (error: any) {
      console.error('❌ CRITICAL: Highlight creation failed in controller:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        stack: error?.stack,
      });
      throw error; // Re-throw to let NestJS handle it
    }
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




