import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new article' })
  async create(
    @CurrentUser() user: any,
    @Body() body: { title: string; content: string; coverImage?: string; excerpt?: string; publish?: boolean; scheduledAt?: string },
  ) {
    try {
      // Validation
      if (!body?.title?.trim() || !body?.content?.trim()) {
        throw new HttpException('Başlık ve içerik zorunludur', HttpStatus.BAD_REQUEST);
      }

      // Parse scheduledAt
      let scheduledAt: Date | undefined = undefined;
      if (body.scheduledAt && body.scheduledAt.trim() !== '') {
        const parsed = new Date(body.scheduledAt);
        if (isNaN(parsed.getTime())) {
          throw new HttpException('Geçersiz tarih formatı', HttpStatus.BAD_REQUEST);
        }
        scheduledAt = parsed;
      }

      return await this.articlesService.create(
        user.id,
        body.title.trim(),
        body.content.trim(),
        body.coverImage,
        body.excerpt?.trim(),
        Boolean(body.publish),
        scheduledAt,
      );
    } catch (error: any) {
      // Log detaylı hata
      console.error('ARTICLE_CREATE_ERROR:', error?.message, error);
      
      // Eğer zaten HttpException ise olduğu gibi fırlat
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Diğer hatalar için genel mesaj
      throw new HttpException(
        error?.message || 'Yazı oluşturulurken bir hata oluştu',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my drafts' })
  async getDrafts(@CurrentUser() user: any) {
    return this.articlesService.findDrafts(user.id);
  }

  @Get('/published')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my published articles' })
  async getPublished(@CurrentUser() user: any) {
    return this.articlesService.findPublished(user.id);
  }

  @Put('/:id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a draft article' })
  async publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.publish(id, user.id);
  }

  @Get('/public')
  @ApiOperation({ summary: 'Get all public articles' })
  async getAllPublic() {
    return this.articlesService.findAllPublic();
  }

  @Get('/published/all')
  @ApiOperation({ summary: 'Get all published articles from all users' })
  async getAllPublishedArticles() {
    return this.articlesService.findAllPublic();
  }

  @Get('/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my articles (including unpublished)' })
  async getMyArticles(@CurrentUser() user: any) {
    // Hem yayınlanmış hem taslakları getir
    const [published, drafts] = await Promise.all([
      this.articlesService.findPublished(user.id),
      this.articlesService.findDrafts(user.id),
    ]);
    return [...published, ...drafts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  @Get('/user/:userId')
  @ApiOperation({ summary: 'Get articles by user ID' })
  async getUserArticles(@Param('userId') userId: string) {
    return this.articlesService.findByUserId(userId);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get article by ID' })
  async getArticle(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Put('/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update article' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { title?: string; content?: string; coverImage?: string; excerpt?: string; scheduledAt?: string },
  ) {
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
    return this.articlesService.update(id, user.id, { ...body, scheduledAt });
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete article' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.delete(id, user.id);
  }

  @Post('/:id/view')
  @ApiOperation({ summary: 'Increment article view count' })
  async incrementView(@Param('id') id: string) {
    try {
      await this.articlesService.incrementView(id);
      return { success: true };
    } catch (error) {
      console.error('View Increment Error:', error);
      return { success: false };
    }
  }

  @Post('/:id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to article' })
  async createComment(
    @Param('id') articleId: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return this.articlesService.createComment(articleId, user.id, body.content);
  }

  @Delete('/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete article comment' })
  async deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: any) {
    return this.articlesService.deleteComment(commentId, user.id);
  }

  @Post('/comments/:commentId/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a comment' })
  async replyComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return this.articlesService.createReply(commentId, user.id, body.content);
  }

  @Post('/comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle like on a comment' })
  async toggleCommentLike(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
  ) {
    return this.articlesService.toggleCommentLike(commentId, user.id);
  }
}

