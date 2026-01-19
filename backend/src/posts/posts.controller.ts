import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Query, UseInterceptors, UploadedFiles, BadRequestException, Res } from '@nestjs/common';
import { containsBadWord } from '../common/utils/containsBadWord';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
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
    @Body() body: { caption?: string; title?: string; location?: string; type?: string; colorPalette?: string | string[] },
  ) {
    console.log('🚀 [POST /posts/create] Request received:', {
      userId: user?.id,
      filesCount: files?.length || 0,
      bodyType: body?.type || 'post',
      caption: body?.caption?.substring(0, 50) || 'none',
    });

    try {
      if (!files || files.length === 0) {
        console.error('❌ [POST /posts/create] No files uploaded');
        throw new BadRequestException('En az bir dosya gereklidir');
      }

      if (!user?.id) {
        console.error('❌ [POST /posts/create] No user ID');
        throw new BadRequestException('Kullanıcı kimliği bulunamadı');
      }

      // Upload files to MinIO/Vercel Blob Storage
      console.log('📤 [POST /posts/create] Starting media uploads...');
      const mediaUploads = await Promise.all(
        files.map(async (file, index) => {
          console.log(`📁 [POST /posts/create] Uploading file ${index + 1}/${files.length}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          
          try {
            const uploadResult = await this.mediaService.uploadFile(file, 'posts');
            console.log(`✅ [POST /posts/create] File ${index + 1} uploaded: ${uploadResult.url.substring(0, 50)}...`);
            
            return {
              url: typeof uploadResult === 'string' ? uploadResult : uploadResult.url,
              type: file.mimetype.startsWith('video/') ? 'video' : 'image',
              order: index,
            };
          } catch (uploadError: any) {
            console.error(`❌ [POST /posts/create] File ${index + 1} upload failed:`, {
              message: uploadError?.message,
              stack: uploadError?.stack?.split('\n').slice(0, 3),
            });
            throw new BadRequestException(`Dosya yükleme hatası: ${uploadError instanceof Error ? uploadError.message : 'Bilinmeyen hata'}`);
          }
        }),
      );
      
      console.log(`✅ [POST /posts/create] All ${mediaUploads.length} files uploaded successfully`);

      // Parse colorPalette if it's a string (from FormData)
      let colorPalette: string[] | undefined;
      if (body.colorPalette) {
        if (typeof body.colorPalette === 'string') {
          try {
            colorPalette = JSON.parse(body.colorPalette);
          } catch {
            colorPalette = [body.colorPalette];
          }
        } else if (Array.isArray(body.colorPalette)) {
          colorPalette = body.colorPalette;
        }
      }

      const dto: CreatePostDto = {
        caption: body.caption,
        title: body.title, // 🎨 Eser adı (artwork için)
        location: body.location,
        type: body.type || 'post', // Default to 'post' if not provided
        media: mediaUploads,
        colorPalette, // 🎨 Frontend'den gelen renk paleti
      };

      return await this.postsService.createPost(user.id, dto);
    } catch (error) {
      // HttpException ise olduğu gibi fırlat
      if (error instanceof BadRequestException || error instanceof Error && 'status' in error) {
        throw error;
      }
      // Diğer hatalar için Internal Server Error
      throw new BadRequestException(error instanceof Error ? error.message : 'Gönderi oluşturulurken bir hata oluştu');
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create post with media URLs' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  async createPostWithUrls(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.postsService.createPost(user.id, dto);
  }

  // ⚠️ ÖZEL ROUTE'LAR GENEL ROUTE'LARDAN ÖNCE OLMALI
  // QR Label endpoint'i - :id route'undan ÖNCE tanımlanmalı
  @Get(':id/qr-label')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate QR code label PDF for artwork' })
  @ApiResponse({ status: 200, description: 'QR label PDF generated successfully' })
  async getQrLabel(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.postsService.generateQrLabelPdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Eser_Etiketi_${id}.pdf"`,
    });

    return res.send(pdf);
  }

  // QR PDF endpoint'i - :id route'undan ÖNCE tanımlanmalı
  @Get(':id/qr-pdf')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate QR code PDF label for artwork' })
  @ApiResponse({ status: 200, description: 'QR PDF generated successfully' })
  async generateArtworkQrPdf(
    @Param('id') postId: string,
    @Res() res: Response,
  ) {
    return this.postsService.generateArtworkQrPdf(postId, res);
  }

  // GENEL ROUTE EN SONDA OLMALI
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  async getPost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.getPost(params.id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  async updatePost(
    @Param() params: PostIdDto,
    @CurrentUser() user: any,
    @Body() body: { caption?: string; title?: string },
  ) {
    return this.postsService.updatePost(params.id, user.id, { caption: body.caption, title: body.title });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  async deletePost(@Param() params: PostIdDto, @CurrentUser() user: any) {
    if (!user || !user.id) {
      throw new BadRequestException('Kullanıcı doğrulaması başarısız');
    }
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
    // Küfür kontrolü
    if (containsBadWord(dto.content)) {
      throw new BadRequestException('Bu yorum topluluk kurallarına uygun değil.');
    }
    
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

  @Get('comments/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all comments by user' })
  @ApiResponse({ status: 200, description: 'User comments retrieved successfully' })
  async getUserComments(@Param('userId') userId: string) {
    return this.postsService.getUserComments(userId);
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

  @Post(':id/save-artwork')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save an artwork' })
  @ApiResponse({ status: 200, description: 'Artwork saved successfully' })
  async saveArtwork(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.saveArtwork(params.id, user.id);
  }

  @Delete(':id/save-artwork')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unsave an artwork' })
  @ApiResponse({ status: 200, description: 'Artwork unsaved successfully' })
  async unsaveArtwork(@Param() params: PostIdDto, @CurrentUser() user: any) {
    return this.postsService.unsaveArtwork(params.id, user.id);
  }

  @Patch(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  async updateComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    // Küfür kontrolü
    if (containsBadWord(dto.content)) {
      throw new BadRequestException('Bu yorum topluluk kurallarına uygun değil.');
    }
    
    return this.postsService.updateComment(commentId, user.id, dto.content);
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
    if (!user || !user.id) {
      throw new BadRequestException('Kullanıcı doğrulaması başarısız');
    }
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

  @Post('comments/:commentId/pin')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pin or unpin a comment' })
  @ApiResponse({ status: 200, description: 'Comment pin status updated successfully' })
  async toggleCommentPin(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @Body() body: { pinned: boolean },
  ) {
    return this.postsService.toggleCommentPin(commentId, user.id, body.pinned);
  }

  @Get('color-matches/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get color matches for user artworks' })
  @ApiResponse({ status: 200, description: 'Color matches retrieved successfully' })
  async getColorMatches(@Param('userId') userId: string) {
    return this.postsService.getColorMatches(userId);
  }

  @Get('color-palette/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user color palette from artworks' })
  @ApiResponse({ status: 200, description: 'Color palette retrieved successfully' })
  async getUserColorPalette(@Param('userId') userId: string) {
    const palette = await this.postsService.getUserColorPalette(userId);
    return { palette };
  }

  @Get('ticket/:artworkId/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate Premium Bilet PDF for artwork' })
  @ApiResponse({ status: 200, description: 'Premium Bilet PDF generated successfully' })
  async generateArtworkTicket(
    @Param('artworkId') artworkId: string,
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.postsService.generateArtworkTicket(artworkId, userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Feellink_Bilet_${artworkId}.pdf"`,
    });

    return res.send(pdf);
  }
}
