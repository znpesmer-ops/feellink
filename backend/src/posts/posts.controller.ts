import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MediaService } from '../media/media.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostIdDto } from './dto/post-id.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('posts')
@ApiBearerAuth()
@Controller('posts')
export class PostsController {
  constructor(
    private postsService: PostsService,
    private mediaService: MediaService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Create post with file upload' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  async createPost(
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { caption?: string; location?: string },
  ) {
    if (!files || files.length === 0) {
      throw new Error('At least one file is required');
    }

    // Upload files to MinIO
    const mediaUploads = await Promise.all(
      files.map(async (file, index) => {
        const uploadResult = await this.mediaService.uploadFile(file, 'posts');
        return {
          url: typeof uploadResult === 'string' ? uploadResult : uploadResult.url,
          type: file.mimetype.startsWith('video/') ? 'video' : 'image',
          order: index,
        };
      }),
    );

    const dto: CreatePostDto = {
      caption: body.caption,
      location: body.location,
      media: mediaUploads,
    };

    return this.postsService.createPost(user.id, dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create post with media URLs' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  async createPostWithUrls(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.postsService.createPost(user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  async getPost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.getPost(params.id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  async deletePost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.deletePost(params.id, user.id);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ status: 200, description: 'Post liked successfully' })
  async likePost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.likePost(params.id, user.id);
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ status: 200, description: 'Post unliked successfully' })
  async unlikePost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.unlikePost(params.id, user.id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add comment to post' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async createComment(
    @Param() params: PostIdDto,
    @CurrentUser() user: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(params.id, user.id, dto.content, dto.parentId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get post comments' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  async getComments(@Param() params: PostIdDto, @Query('parentId') parentId?: string) {
    return this.postsService.getComments(params.id, parentId);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user posts' })
  @ApiResponse({ status: 200, description: 'User posts retrieved successfully' })
  async getUserPosts(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.postsService.getUserPosts(userId, user.id);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save a post' })
  @ApiResponse({ status: 200, description: 'Post saved successfully' })
  async savePost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.savePost(params.id, user.id);
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unsave a post' })
  @ApiResponse({ status: 200, description: 'Post unsaved successfully' })
  async unsavePost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.unsavePost(params.id, user.id);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get saved posts' })
  @ApiResponse({ status: 200, description: 'Saved posts retrieved successfully' })
  async getSavedPosts(@CurrentUser() user: any) {
    return this.postsService.getSavedPosts(user.id);
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  async deleteComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.deleteComment(commentId, user.id);
  }

  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle comment like' })
  @ApiResponse({ status: 200, description: 'Comment like toggled successfully' })
  async toggleCommentLike(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.toggleCommentLike(commentId, user.id);
  }

  @Post('comments/:commentId/react')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle comment reaction' })
  @ApiResponse({ status: 200, description: 'Reaction toggled successfully' })
  async toggleCommentReaction(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @Body() dto: { emoji: string },
  ) {
    return this.postsService.toggleCommentReaction(user.id, commentId, dto.emoji);
  }

  @Get('comments/:commentId/reactions')
  @ApiOperation({ summary: 'Get comment reactions' })
  @ApiResponse({ status: 200, description: 'Reactions retrieved successfully' })
  async getCommentReactions(@Param('commentId') commentId: string) {
    return this.postsService.getCommentReactions(commentId);
  }

  @Get('comments/:commentId/reactions/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user reactions for comment' })
  @ApiResponse({ status: 200, description: 'User reactions retrieved successfully' })
  async getUserCommentReactions(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.getUserCommentReactions(commentId, user.id);
  }
}
