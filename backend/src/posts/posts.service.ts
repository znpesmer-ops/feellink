import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AnalyticsService } from '../analytics/analytics.service';
import { FeedService } from '../feed/feed.service';
import { SearchService } from '../search/search.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsGateway } from './posts.gateway';
import { CommentsGateway } from './comments.gateway';
import { ConfigService } from '@nestjs/config';
import { LimitsService } from '../limits/limits.service';
import { generateUniqueArtworkCode } from './artwork.utils';
import { generateQrDataUrl } from '../tickets/ticket.utils';
import { ColorAnalysisService } from './color-analysis.service';
import { containsBadWord } from '../common/utils/containsBadWord';
import { resolveFeellinkAssetsRoot, fontPathForRegister } from '../common/resolve-feellink-assets';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import sharp from 'sharp';

/** Eser ID → deterministik sayı (logo varyasyonu vb.) */
function hashPostIdForLayout(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Tek satır; taşarsa kısalt */
function truncateOneLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (ctx.measureText(t).width <= maxWidth) return t;
  const ell = '\u2026';
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const slice = t.slice(0, mid) + ell;
    if (ctx.measureText(slice).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${t.slice(0, lo)}${ell}` : ell;
}

/** Canvas: metni max genişliğe göre satırlara böl (en fazla maxLines) */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) {
      current = trial;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
    } else {
      let w = word;
      while (w.length > 1 && ctx.measureText(`${w}…`).width > maxWidth) {
        w = w.slice(0, -1);
      }
      lines.push(w.length < word.length ? `${w}…` : w);
      current = '';
    }
    if (lines.length >= maxLines) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = truncateOneLine(ctx, last.replace(/\u2026$/, ''), maxWidth) || last;
      return lines.slice(0, maxLines);
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private analyticsService: AnalyticsService,
    private feedService: FeedService,
    private searchService: SearchService,
    @Inject(forwardRef(() => PostsGateway))
    private postsGateway: PostsGateway,
    @Inject(forwardRef(() => CommentsGateway))
    private commentsGateway: CommentsGateway,
    private configService: ConfigService,
    private readonly limitsService: LimitsService,
    private colorAnalysisService: ColorAnalysisService,
  ) {}

  // Helper: Transform media URLs for mobile compatibility
  private transformMediaUrl(url: string): string {
    if (!url) return url;
    
    // If it's already a full URL with localhost, replace with BASE_URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const baseUrl = this.configService.get('BASE_URL');
      if (baseUrl && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        try {
          const urlObj = new URL(url);
          return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
        } catch {
          return url;
        }
      }
      return url;
    }
    
    // Relative path (e.g., /uploads/image.png) - MUST use BASE_URL with port (3002)
    const baseUrl = this.configService.get('BASE_URL');
    if (!baseUrl) {
      // Fallback: Use backend port (3002) NOT MinIO port (9000)
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
    }
    
    // BASE_URL format: http://192.168.1.38:3002 (port included)
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  }

  // Helper: Transform avatar URLs
  private transformAvatarUrl(avatar: string | null): string | null {
    if (!avatar) return null;
    
    // If it's already a full URL with localhost, replace with BASE_URL
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      const baseUrl = this.configService.get('BASE_URL');
      if (baseUrl && (avatar.includes('localhost') || avatar.includes('127.0.0.1'))) {
        try {
          const urlObj = new URL(avatar);
          return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
        } catch {
          return avatar;
        }
      }
      return avatar;
    }
    
    // Relative path - MUST use BASE_URL with port (3001, not MinIO 9000)
    const baseUrl = this.configService.get('BASE_URL');
    if (!baseUrl) {
      const backendPort = this.configService.get('PORT') || '3002';
      const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
      const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
        ? '192.168.1.38' 
        : endpoint;
      const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
      return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
    }
    
    const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
    return `${baseUrl}${cleanPath}`;
  }

  async createPost(userId: string, dto: CreatePostDto) {
    try {
      if (!dto.media || dto.media.length === 0) {
        throw new BadRequestException('At least one media file is required');
      }

      // Küfür kontrolü
      if (dto.caption && containsBadWord(dto.caption)) {
        throw new BadRequestException('Bu içerik topluluk kurallarına uygun değil.');
      }

      // 🎨 Sanatsever Free gönderi oluşturabilir ama yalnızca "artwork" tipindeki paylaşımlar yasaktır
      // Eğer post.type === "artwork" ise engelle, diğer her şeyi (post, photo, video) serbest bırak
      const postType = dto.type || 'post'; // Default to 'post' if not provided
      
      console.log(`[createPost] Creating ${postType} for user ${userId}`);
      
      if (postType === 'artwork') {
        // Sadece artwork oluştururken rol kontrolü yap
        console.log('[createPost] Checking artwork creation limits...');
        await this.limitsService.ensureCanCreateArtwork(userId);
        console.log('[createPost] Artwork limits OK');
      }

      // Extract hashtags from caption
      const hashtags = this.extractHashtags(dto.caption || '');

      // Eğer artwork ise, otomatik kod üret
      let artworkCode: string | undefined;
      
      if (postType === 'artwork') {
        console.log('[createPost] Generating unique artwork code...');
        artworkCode = await generateUniqueArtworkCode(this.prisma);
        console.log(`[createPost] Generated artwork code: ${artworkCode}`);
      }

      // Create post
      console.log('[createPost] Creating post in database...');
      const post = await this.prisma.post.create({
      data: {
        userId,
        caption: dto.caption,
        title: dto.title, // 🎨 Eser adı (artwork için)
        location: dto.location,
        type: postType, // postType değişkenini kullan (artwork kontrolü yapıldı)
        code: artworkCode, // Artwork için otomatik kod
        colorPalette: dto.colorPalette ?? [], // 🎨 Frontend'den gelen renk paleti (hex string listesi)
        isDeleted: false, // 🗑️ Default: not deleted
        media: {
          create: dto.media.map(m => ({
            url: m.url,
            type: m.type,
            order: m.order,
          })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        media: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Process hashtags
    for (const tag of hashtags) {
      const hashtag = await this.prisma.hashtag.upsert({
        where: { name: tag },
        create: { name: tag },
        update: { postCount: { increment: 1 } },
      });

      await this.prisma.postHashtag.create({
        data: {
          postId: post.id,
          hashtagId: hashtag.id,
        },
      });

      // Index hashtag in Meilisearch
      await this.searchService.indexHashtag(hashtag);
    }

    // Add to feed cache (fan-out-on-write)
    await this.feedService.addToFollowersFeeds(userId, post.id);

    // 🔔 Real-time yayın - Socket.IO ile tüm kullanıcılara bildir
    const CDN_BASE = this.configService.get('CDN_BASE_URL') || 
      `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;
    
    // 🔥 MongoDB: Manuel count
    const [likeCount, commentCount] = await Promise.all([
      this.prisma.like.count({ where: { postId: post.id } }),
      this.prisma.comment.count({ where: { postId: post.id, parentId: null } }),
    ]);

    const postPayload = {
      id: post.id,
      caption: post.caption,
      imageUrl: post.media && post.media.length > 0 ? post.media[0].url : null,
      likeCount: likeCount,
      commentCount: commentCount,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.user.id,
        username: post.user.username,
        fullName: post.user.fullName,
        avatarUrl: post.user.avatar ? (post.user.avatar.startsWith('http') ? post.user.avatar : `${CDN_BASE}/${post.user.avatar}`) : null,
        isVerified: post.user.isVerified,
      },
    };

    // PostsGateway üzerinden yayınla
    if (this.postsGateway) {
      this.postsGateway.server.emit('postCreated', postPayload);
      console.log(`📡 Post created event broadcasted: ${post.id}`);
    }

    console.log(`[createPost] ✅ Post created successfully: ${post.id}`);
    return post;
    } catch (error) {
      console.error('[createPost] ❌ Error:', {
        message: error?.message,
        stack: error?.stack?.split('\n').slice(0, 3),
        userId,
        postType: dto.type,
      });
      
      // Re-throw known exceptions
      if (error instanceof BadRequestException || 
          error instanceof ForbiddenException ||
          error instanceof NotFoundException) {
        throw error;
      }
      
      // Unknown error - wrap in BadRequestException with clear message
      throw new BadRequestException(
        error?.message || 'Gönderi oluşturulurken bir hata oluştu'
      );
    }
  }

  async getPost(postId: string, currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        media: {
          orderBy: { order: 'asc' },
        },
        hashtags: {
          include: {
            hashtag: true,
          },
        },
        // _count removed - using manual count instead for MongoDB compatibility
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // 🔥 KRİTİK: MongoDB'de relation'lar bazen include ile çalışmayabilir, manuel query yap
    // 🔥 DEBUG: Önce tüm yorumları kontrol et (parentId kontrolü olmadan)
    const allComments = await this.prisma.comment.findMany({
      where: {
        postId: postId,
      },
      select: {
        id: true,
        postId: true,
        parentId: true,
        content: true,
      },
    });
    console.log(`🔍 [getPost] Post "${postId}" (type: ${typeof postId}) için toplam ${allComments.length} yorum bulundu (parentId kontrolü olmadan):`, allComments.map((c: any) => ({ id: c.id, postId: c.postId, postIdType: typeof c.postId, parentId: c.parentId })));
    
    // 🔥 KRİTİK: parentId: null veya undefined olan yorumları al
    // 🔥 KRİTİK: parentId: null olan yorumları al (MongoDB'de undefined değil null olarak saklanıyor)
    const comments = await this.prisma.comment.findMany({
      where: {
        postId: String(postId), // ✅ postId'yi string'e çevir (MongoDB uyumluluğu için)
        parentId: null, // Sadece ana yorumlar
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
        likes: currentUserId ? {
          where: {
            userId: currentUserId,
          },
          select: {
            id: true,
          },
        } : false,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                isVerified: true,
              },
            },
            _count: {
              select: {
                likes: true,
              },
            },
            likes: currentUserId ? {
              where: {
                userId: currentUserId,
              },
              select: {
                id: true,
              },
            } : false,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      // Tek tutarlı sıra: en yeni üstte (pinned önce, sonra createdAt DESC)
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let isLiked = false;
    let isSaved = false;
    
    if (currentUserId) {
      const pid = String(postId);
      const uid = String(currentUserId);
      // Like kalıcı: (postId, userId) unique — getPost'ta doğru isLiked ve sayı
      const [like, savedPost, savedArtwork] = await Promise.all([
        this.prisma.like.findFirst({
          where: {
            postId: pid,
            userId: uid,
          },
        }),
        this.prisma.savedPost.findFirst({
          where: {
            userId: uid,
            postId: pid,
          },
        }),
        this.prisma.savedArtwork.findFirst({
          where: {
            userId: uid,
            postId: pid,
          },
        }),
      ]);
      isLiked = !!like;
      // ✅ İKİSİNDEN BİRİ VARSA KAYDEDİLMİŞ!
      isSaved = !!savedPost || !!savedArtwork;
      
      // 🔍 DEBUG LOG
      if (isSaved) {
        console.log(`✅ [getPost] Post ${postId} isSaved=true (savedPost: ${!!savedPost}, savedArtwork: ${!!savedArtwork})`);
      }
    }

    const pidForCount = String(postId);
    const [likeCount, commentCount] = await Promise.all([
      this.prisma.like.count({ where: { postId: pidForCount } }),
      this.prisma.comment.count({ where: { postId: pidForCount, parentId: null } }),
    ]);

    // Avatar URL'lerini formatla
    const CDN_BASE = this.configService.get('CDN_BASE_URL') || 
      `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;

    // 🔥 DEBUG: Yorumları logla
    console.log(`📝 [getPost] Post ${postId} için ${comments.length} yorum bulundu:`, comments.map((c: any) => ({ id: c.id, content: c.content?.substring(0, 30) })))
    
    // Comments'leri formatla (nested replies dahil) - MongoDB entegrasyonu
    const formattedComments = comments.map((comment: any) => ({
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
      updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt.toISOString() : comment.updatedAt,
      userId: comment.userId,
      isPinned: comment.isPinned || false,
      isLikedByCurrentUser: comment.likes && comment.likes.length > 0,
      likesCount: comment._count?.likes || 0,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        fullName: comment.user.fullName,
        avatar: comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`) : null,
        isVerified: comment.user.isVerified || false,
      },
      replies: (comment.replies || []).map((reply: any) => ({
        id: reply.id,
        postId: reply.postId,
        parentId: reply.parentId,
        content: reply.content,
        createdAt: reply.createdAt instanceof Date ? reply.createdAt.toISOString() : reply.createdAt,
        updatedAt: reply.updatedAt instanceof Date ? reply.updatedAt.toISOString() : reply.updatedAt,
        userId: reply.userId,
        isLikedByCurrentUser: reply.likes && reply.likes.length > 0,
        likesCount: reply._count?.likes || 0,
        user: {
          id: reply.user.id,
          username: reply.user.username,
          fullName: reply.user.fullName,
          avatar: reply.user.avatar ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`) : null,
          isVerified: reply.user.isVerified || false,
        },
      })),
    }));

    // Transform media URLs
    const transformedMedia = post.media?.map((m: any) => ({
      ...m,
      url: this.transformMediaUrl(m.url),
    })) || [];

    // Transform user avatar
    const transformedUser = {
      ...post.user,
      avatar: this.transformAvatarUrl(post.user.avatar),
    };

    return {
      ...post,
      id: post.id,
      userId: post.userId,
      caption: post.caption,
      title: post.title,
      location: post.location,
      type: post.type,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
      updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
      media: transformedMedia,
      user: transformedUser,
      comments: formattedComments, // ✅ MongoDB'den gelen yorumlar formatlanmış şekilde
      isLiked,
      isSaved,
      _count: {
        likes: likeCount,
        comments: commentCount,
      },
    };
  }

  async updatePost(postId: string, userId: string, data: { caption?: string; title?: string }) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Cannot update this post');
    }

    // Küfür kontrolü
    if (data.caption && containsBadWord(data.caption)) {
      throw new BadRequestException('Bu içerik topluluk kurallarına uygun değil.');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(data.caption !== undefined && { caption: data.caption }),
        ...(data.title !== undefined && { title: data.title }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
        media: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // 🔔 Real-time yayın - Socket.IO ile güncelleme bildirimi
    if (this.postsGateway) {
      this.postsGateway.server.emit('post:updated', { postId, post: updatedPost });
      console.log(`✏️ Post updated event broadcasted: ${postId}`);
    }

    return updatedPost;
  }

  async deletePost(postId: string, userId: string) {
    // Validate input
    if (!postId || postId === 'undefined' || postId === 'null') {
      throw new BadRequestException('Valid post ID is required');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if already deleted
    if (post.isDeleted) {
      return { success: true, message: 'Post already deleted' };
    }

    // Check ownership
    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    try {
      // 🗑️ SOFT DELETE - Mark as deleted instead of removing
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Remove from feed cache
      try {
        await this.feedService.removeFromFeeds(postId);
      } catch (error) {
        console.warn('[deletePost] Feed removal failed:', error);
      }

      // 🔔 Real-time broadcast - Socket.IO
      if (this.postsGateway) {
        try {
          this.postsGateway.server.emit('post:deleted', postId);
          console.log(`🗑️ Post deleted event broadcasted: ${postId}`);
        } catch (error) {
          console.warn('[deletePost] Socket broadcast failed:', error);
        }
      }

      return { success: true, message: 'Post deleted successfully' };
    } catch (error: any) {
      // Prisma errors
      if (error.code === 'P2025') {
        throw new NotFoundException('Post not found or already deleted');
      }

      console.error('[deletePost] error:', error);
      throw new BadRequestException('Failed to delete post');
    }
  }

  async likePost(postId: string, userId: string) {
    const pid = String(postId);
    const uid = String(userId);
    console.log(`❤️ [likePost] ========== START ==========`);
    console.log(`❤️ [likePost] User ${uid} liking post ${pid}`);

    const post = await this.prisma.post.findUnique({
      where: { id: pid },
    });

    if (!post) {
      console.error(`❌ [likePost] Post ${pid} NOT FOUND!`);
      throw new NotFoundException('Post not found');
    }

    console.log(`✅ [likePost] Post found: ${post.id}`);

    // Kalıcı kayıt: (postId, userId) unique — aynı kullanıcı aynı posta tek like
    const existingLike = await this.prisma.like.findFirst({
      where: {
        postId: pid,
        userId: uid,
      },
    });

    if (!existingLike) {
      console.log(`💾 [likePost] Creating new like...`);
      await this.prisma.like.create({
        data: {
          postId: pid,
          userId: uid,
        },
      });
      console.log(`✅ [likePost] Like created successfully!`);
    } else {
      console.log(`⚠️ [likePost] Like already exists - skipping create`);
    }

    const likeCount = await this.prisma.like.count({
      where: { postId: pid },
    });
    
    console.log(`✅ [likePost] Total likes: ${likeCount}`);
    console.log(`❤️ [likePost] ========== SUCCESS ==========`);

    // Send notification (don't notify if user likes their own post)
    if (post.userId !== userId) {
      const allowed = await this.notificationsService.isAllowed(post.userId, 'like')
      
      if (allowed) {
        await this.notificationsService.createNotification({
          userId: post.userId,
          type: 'like',
          fromUserId: userId,
          postId,
          targetUrl: `/posts/${postId}`,
        });
      } else {
        console.log(`⏭️ Like notification skipped for post owner (preference disabled)`)
      }
    }

    // 🔔 Real-time yayın - Socket.IO ile beğeni güncellemesi
    if (this.postsGateway) {
      this.postsGateway.server.emit('postLikeUpdated', {
        postId,
        change: +1,
        likeCount: likeCount,
        isLiked: true,
        userId,
      });
      // Admin panel için özel event
      this.postsGateway.server.emit('post:like', {
        postId,
        likes: likeCount,
      });
      console.log(`❤️ Post liked event broadcasted: ${postId}, likeCount: ${likeCount}`);
    }

    // 🏆 Ziyaretçi güncelleme - Post sahibi corporate ise analytics'i güncelle
    try {
      const postOwner = await this.prisma.user.findUnique({
        where: { id: post.userId },
        select: { roles: true },
      });

      if (postOwner && Array.isArray(postOwner.roles) && postOwner.roles.includes('corporate')) {
        const topVisitors = await this.analyticsService.getTopVisitors(post.userId);
        this.notificationsGateway.emitVisitorUpdate(post.userId, topVisitors);
      }
    } catch (error) {
      console.error('Error updating visitor analytics:', error);
    }

    return { success: true, liked: true, likeCount: likeCount };
  }

  async unlikePost(postId: string, userId: string) {
    const pid = String(postId);
    const uid = String(userId);
    console.log(`💔 [unlikePost] ========== START ==========`);
    console.log(`💔 [unlikePost] User ${uid} unliking post ${pid}`);

    const post = await this.prisma.post.findUnique({
      where: { id: pid },
    });

    if (!post) {
      console.error(`❌ [unlikePost] Post ${pid} NOT FOUND!`);
      throw new NotFoundException('Post not found');
    }

    console.log(`✅ [unlikePost] Post found: ${post.id}`);

    const deleteResult = await this.prisma.like.deleteMany({
      where: {
        postId: pid,
        userId: uid,
      },
    });

    console.log(`🗑️ [unlikePost] Deleted ${deleteResult.count} like(s)`);

    const likeCount = await this.prisma.like.count({
      where: { postId: pid },
    });
    
    console.log(`✅ [unlikePost] Total likes: ${likeCount}`);
    console.log(`💔 [unlikePost] ========== SUCCESS ==========`);

    // 🔔 Real-time yayın - Socket.IO ile beğeni kaldırma güncellemesi
    if (this.postsGateway) {
      this.postsGateway.server.emit('postLikeUpdated', {
        postId,
        change: -1,
        likeCount: likeCount,
        isLiked: false,
        userId,
      });
      // Admin panel için özel event
      this.postsGateway.server.emit('post:like', {
        postId,
        likes: likeCount,
      });
      console.log(`💔 Post unliked event broadcasted: ${postId}, likeCount: ${likeCount}`);
    }

    return { success: true, liked: false, likeCount: likeCount };
  }

  async createComment(postId: string, userId: string, content: string, parentId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // 🔥 DEBUG: Yorum oluşturulmadan önce postId'yi logla
    console.log(`💬 [createComment] Yorum oluşturuluyor - postId: "${postId}" (type: ${typeof postId}), userId: ${userId}, content: ${content.substring(0, 50)}`);
    
    const comment = await this.prisma.comment.create({
      data: {
        postId: String(postId), // ✅ Açıkça postId'yi string'e çevir ve kaydet (MongoDB uyumluluğu için)
        userId: String(userId),
        content: String(content),
        parentId: parentId ? String(parentId) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });
    
    // 🔥 DEBUG: Yorum oluşturulduktan sonra logla
    console.log(`✅ [createComment] Yorum oluşturuldu - id: ${comment.id}, postId: "${comment.postId}" (type: ${typeof comment.postId}, length: ${comment.postId?.length}), userId: ${comment.userId}`);
    
    // 🔥 DEBUG: Yorumun gerçekten kaydedildiğini doğrula
    const verifyComment = await this.prisma.comment.findUnique({
      where: { id: comment.id },
      select: { id: true, postId: true, content: true },
    });
    console.log(`✅ [createComment] Yorum doğrulandı - id: ${verifyComment?.id}, postId: "${verifyComment?.postId}"`);

    // Send notification to post owner (preference kontrolü ile)
    if (post.userId !== userId) {
      const allowed = await this.notificationsService.isAllowed(post.userId, 'comment')
      
      if (allowed) {
        await this.notificationsService.createNotification({
          userId: post.userId,
          type: 'comment',
          fromUserId: userId,
          postId,
          commentId: comment.id,
          targetUrl: `/posts/${postId}`,
        });
      } else {
        console.log(`⏭️ Comment notification skipped for post owner (preference disabled)`)
      }
    }

    // 🔁 Reply notification - yorum sahibine bildirim gönder
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
        include: { user: true },
      });

      if (parentComment && parentComment.userId !== userId) {
        const allowed = await this.notificationsService.isAllowed(parentComment.userId, 'reply')
        
        if (allowed) {
          await this.notificationsService.createNotificationSync({
            userId: parentComment.userId,
            type: 'reply',
            fromUserId: userId,
            postId,
            commentId: comment.id,
            message: `${comment.user.username} yorumuna yanıt verdi: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            targetUrl: `/posts/${postId}`,
          });
        } else {
          console.log(`⏭️ Reply notification skipped (preference disabled)`)
        }
      }
    }

    // 🔍 @mention tespiti - Yorum içindeki @kullanıcı etiketlerini bul
    const mentionRegex = /@(\w+)/g
    const mentions = Array.from(content.matchAll(mentionRegex)).map((match) => match[1])
    
    if (mentions.length > 0) {
      // Etiketlenen kullanıcıları bul
      const mentionedUsers = await this.prisma.user.findMany({
        where: {
          username: { in: mentions },
          id: { not: userId }, // Kendini etiketleme bildirimi gönderme
        },
        select: {
          id: true,
          username: true,
        },
      })

      // Her etiketlenen kullanıcıya bildirim gönder (sync olarak direkt oluştur)
      for (const mentionedUser of mentionedUsers) {
        // 🔔 Bildirim ayarı kontrolü
        const allowed = await this.notificationsService.isAllowed(mentionedUser.id, 'mention')
        
        if (!allowed) {
          console.log(`⏭️ Mention notification skipped for ${mentionedUser.username} (preference disabled)`)
          continue
        }

        // createNotificationSync kullanarak direkt bildirim oluştur ve Socket.IO ile gönder
        await this.notificationsService.createNotificationSync({
          userId: mentionedUser.id,
          type: 'mention',
          fromUserId: userId,
          postId,
          commentId: comment.id,
          message: `${comment.user.username} seni bir yorumda etiketledi`,
          targetUrl: `/posts/${postId}`,
        })

        console.log(`🔔 Mention notification sent to ${mentionedUser.username} from ${comment.user.username}`)
      }
    }

    // 🔔 Real-time yayın - Socket.IO ile yorum güncellemesi
    const CDN_BASE = this.configService.get('CDN_BASE_URL') || 
      `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;

    const commentPayload = {
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        fullName: comment.user.fullName,
        avatarUrl: comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`) : null,
        isVerified: comment.user.isVerified,
      },
      replies: [], // Yeni yorum için boş replies array
    };

    // CommentsGateway üzerinden yayınla
    if (this.commentsGateway) {
      const room = `post_${postId}`;
      this.commentsGateway.server.to(room).emit('newComment', commentPayload);
      // Global yayın (tüm bağlı kullanıcılar için)
      this.commentsGateway.server.emit('commentCreated', {
        ...commentPayload,
        change: +1,
      });
      console.log(`💬 Comment created event broadcasted: ${comment.id}`);
    }

    // Admin panel için post comment sayısını güncelle
    if (this.postsGateway) {
      const updatedPost = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });
      if (updatedPost) {
        this.postsGateway.server.emit('post:comment', {
          postId,
          comments: updatedPost._count.comments,
        });
      }
    }

    // 🏆 Ziyaretçi güncelleme - Post sahibi corporate ise analytics'i güncelle
    try {
      const postOwner = await this.prisma.user.findUnique({
        where: { id: post.userId },
        select: { roles: true },
      });

      if (postOwner && Array.isArray(postOwner.roles) && postOwner.roles.includes('corporate')) {
        const topVisitors = await this.analyticsService.getTopVisitors(post.userId);
        this.notificationsGateway.emitVisitorUpdate(post.userId, topVisitors);
      }
    } catch (error) {
      console.error('Error updating visitor analytics:', error);
    }

    // 🔥 KRİTİK: Response'u frontend formatına çevir
    const CDN_BASE_RESPONSE = this.configService.get('CDN_BASE_URL') || 
      `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;

    // Frontend PostModal ile aynı formatta dön (getPost comments ile uyumlu)
    const avatarUrl = comment.user.avatar
      ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE_RESPONSE}/${comment.user.avatar}`)
      : null;
    return {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt.toISOString() : (comment.updatedAt as string),
      parentId: comment.parentId ?? undefined,
      isPinned: comment.isPinned ?? false,
      isLikedByCurrentUser: false,
      likesCount: 0,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        fullName: comment.user.fullName,
        avatar: avatarUrl,
        isVerified: comment.user.isVerified ?? false,
      },
      replies: [],
    };
  }

  async getUserComments(userId: string) {
    // Kullanıcının tüm yorumlarını getir (ana yorumlar ve yanıtlar dahil)
    const comments = await this.prisma.comment.findMany({
      where: {
        userId: userId, // ✅ Kullanıcının yaptığı tüm yorumlar
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        post: {
          select: {
            id: true,
            caption: true,
            media: {
              orderBy: { order: 'asc' },
              take: 1,
              select: {
                url: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // En yeni yorumlar önce
    });

    return comments;
  }

  async getComments(postId: string, parentId?: string) {
    // Eğer parentId varsa sadece o parent'ın yanıtlarını getir
    if (parentId) {
      return this.prisma.comment.findMany({
        where: {
          postId,
          parentId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    // Ana yorumları ve yanıtlarını getir
    const comments = await this.prisma.comment.findMany({
      where: {
        postId: postId, // ✅ Açıkça postId ile filtrele (tüm yorumlar görünür)
        parentId: null, // Sadece ana yorumlar
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                isVerified: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Avatar URL'lerini formatla
    const CDN_BASE = this.configService.get('CDN_BASE_URL') || 
      `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;

    return comments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        fullName: comment.user.fullName,
        avatar: comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`) : null,
        isVerified: comment.user.isVerified,
      },
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        postId: reply.postId,
        parentId: reply.parentId,
        content: reply.content,
        createdAt: reply.createdAt,
        user: {
          id: reply.user.id,
          username: reply.user.username,
          fullName: reply.user.fullName,
          avatar: reply.user.avatar ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`) : null,
          isVerified: reply.user.isVerified,
        },
      })),
      _count: comment._count,
    }));
  }

  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { userId: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Sadece yorum sahibi düzenleyebilir
    if (comment.userId !== userId) {
      throw new ForbiddenException('You do not have permission to edit this comment');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    // 🔔 Real-time yayın
    if (this.commentsGateway) {
      const room = `post_${comment.postId}`;
      this.commentsGateway.server.to(room).emit('commentUpdated', {
        id: updatedComment.id,
        postId: comment.postId,
        content: updatedComment.content,
        updatedAt: updatedComment.updatedAt,
      });
    }

    return {
      id: updatedComment.id,
      content: updatedComment.content,
      updatedAt: updatedComment.updatedAt,
      createdAt: updatedComment.createdAt,
      user: updatedComment.user,
      likesCount: updatedComment._count.likes,
      repliesCount: updatedComment._count.replies,
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { userId: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Yorum sahibi VEYA gönderi sahibi silebilir
    if (comment.userId !== userId && comment.post.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    const postId = comment.postId;

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    // 🔔 Real-time yayın - Socket.IO ile yorum silme güncellemesi
    if (this.commentsGateway) {
      const room = `post_${postId}`;
      this.commentsGateway.server.to(room).emit('commentDeleted', { id: commentId, postId });
      // Global yayın
      this.commentsGateway.server.emit('commentDeleted', {
        id: commentId,
        postId,
        change: -1,
      });
      console.log(`🗑️ Comment deleted event broadcasted: ${commentId}`);
    }

    // Admin panel için post comment sayısını güncelle
    if (this.postsGateway) {
      const updatedPost = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });
      if (updatedPost) {
        this.postsGateway.server.emit('post:comment', {
          postId,
          comments: updatedPost._count.comments,
        });
      }
    }

    return { success: true, message: 'Comment deleted successfully' };
  }

  async toggleCommentReaction(userId: string, commentId: string, emoji: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.commentReaction.delete({
        where: { id: existing.id },
      });
      
      // 🔔 Real-time yayın
      if (this.commentsGateway) {
        this.commentsGateway.server.emit('commentReactionUpdated', {
          commentId,
          emoji,
          change: -1,
          userId,
        });
        console.log(`💔 Comment reaction removed: ${commentId} ${emoji}`);
      }
      
      return { reacted: false };
    }

    await this.prisma.commentReaction.create({
      data: {
        commentId,
        userId,
        emoji,
      },
    });

    // 🔔 Real-time yayın
    if (this.commentsGateway) {
      this.commentsGateway.server.emit('commentReactionUpdated', {
        commentId,
        emoji,
        change: +1,
        userId,
      });
      console.log(`❤️ Comment reaction added: ${commentId} ${emoji}`);
    }

    return { reacted: true };
  }

  async getCommentReactions(commentId: string) {
    const reactions = await this.prisma.commentReaction.groupBy({
      by: ['emoji'],
      where: { commentId },
      _count: {
        emoji: true,
      },
    });

    return reactions.map((r) => ({
      emoji: r.emoji,
      count: r._count.emoji,
    }));
  }

  async getUserCommentReactions(commentId: string, userId: string) {
    const reactions = await this.prisma.commentReaction.findMany({
      where: {
        commentId,
        userId,
      },
      select: {
        emoji: true,
      },
    });

    return reactions.map((r) => r.emoji);
  }

  async getUserPosts(userId: string, currentUserId?: string, type?: 'post' | 'artwork') {
    // 🔥 KRİTİK: userId null/undefined kontrolü
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.warn(`⚠️ [PostsService] getUserPosts called with invalid userId: ${userId}`);
      return [];
    }

    // 🔥 KRİTİK: Eğer userId MongoDB ObjectId formatında değilse (username olabilir), önce userId'yi bul
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    let actualUserId = userId;
    
    if (!isObjectId) {
      // Username ile kullanıcıyı bul
      console.log(`🔍 [PostsService] userId looks like username, searching for user: ${userId}`);
      const allUsers = await this.prisma.user.findMany({
        select: { id: true, username: true },
      });
      
      const normalizedSearch = userId.toLowerCase().trim();
      const foundUser = allUsers.find(
        (u) => u.username?.toLowerCase().trim() === normalizedSearch
      );
      
      if (!foundUser) {
        console.warn(`⚠️ [PostsService] User not found by username: ${userId}`);
        return [];
      }
      
      actualUserId = foundUser.id;
      console.log(`✅ [PostsService] Found user by username: ${userId} -> ${actualUserId}`);
    }

    // Check if current user can see posts (privacy check)
    if (currentUserId && currentUserId !== actualUserId) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: actualUserId },
      });

      // 🔥 KRİTİK: targetUser null kontrolü
      if (!targetUser) {
        console.warn(`⚠️ [PostsService] User not found: ${actualUserId}`);
        return [];
      }

      if (targetUser.isPrivate) {
        // 🔥 MongoDB: Compound unique için findFirst kullan
        const isFollowing = await this.prisma.follow.findFirst({
          where: {
            followerId: currentUserId,
            followingId: actualUserId,
          },
        });

        if (!isFollowing) {
          throw new ForbiddenException('Cannot view posts from private account');
        }
      }
    }

    // ✅ Type filtresi ekle: post veya artwork
    const whereClause: any = { 
      userId: actualUserId,
      isDeleted: false, // 🗑️ Silinen postları gösterme
    };
    if (type) {
      whereClause.type = type;
    }

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            isVerified: true,
          },
        },
        media: true,
        // _count removed - using manual count instead for MongoDB compatibility
      },
      orderBy: { createdAt: 'desc' },
    });

    // 🔥 MongoDB: Manuel count ile beğeni ve yorum sayılarını hesapla
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const [likeCount, commentCount] = await Promise.all([
          this.prisma.like.count({ where: { postId: post.id } }),
          this.prisma.comment.count({ where: { postId: post.id, parentId: null } }),
        ]);
        
        return {
          ...post,
          _count: {
            likes: likeCount,
            comments: commentCount,
          },
        };
      }),
    );

    // Check if liked by current user
    if (currentUserId) {
      const postIds = postsWithCounts.map(p => p.id);
      const likes = await this.prisma.like.findMany({
        where: {
          postId: { in: postIds },
          userId: currentUserId,
        },
      });

      const likedPostIds = new Set(likes.map(l => l.postId));

      // Transform media URLs and return posts with type field
      return postsWithCounts.map(post => {
        const transformedMedia = post.media?.map((m: any) => ({
          ...m,
          url: this.transformMediaUrl(m.url),
        })) || [];

        return {
          ...post,
          id: post.id,
          title: post.title || null, // Eser adı - eksik olmamalı
          caption: post.caption || null, // Açıklama
          type: post.type || 'post', // Ensure type field exists, default to 'post'
          media: transformedMedia,
          isLiked: likedPostIds.has(post.id),
        };
      });
    }

    // Transform media URLs and return posts with type field
    return postsWithCounts.map(post => {
      const transformedMedia = post.media?.map((m: any) => ({
        ...m,
        url: this.transformMediaUrl(m.url),
      })) || [];

      return {
        ...post,
        id: post.id,
        title: post.title || null, // Eser adı - eksik olmamalı
        caption: post.caption || null, // Açıklama
        type: post.type || 'post', // Ensure type field exists, default to 'post'
        media: transformedMedia,
        isLiked: false,
      };
    });
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(m => m.substring(1).toLowerCase()) : [];
  }

  async savePost(postId: string, userId: string) {
    console.log(`💾 [savePost] ========== START ==========`);
    console.log(`💾 [savePost] User ${userId} saving post ${postId}`);
    
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      console.error(`❌ [savePost] Post ${postId} not found`);
      throw new NotFoundException('Post not found');
    }

    console.log(`✅ [savePost] Post found: ${post.id}, type: ${post.type}`);
    
    // ⚠️ UYARI: Artwork'ler SavedArtwork tablosuna kaydedilmeli!
    if (post.type === 'artwork') {
      console.warn(`⚠️ [savePost] Post is artwork! Frontend /save-artwork endpoint kullanmalı!`);
      // Yine de SavedPost'a kaydet (backward compatibility)
    }

    // Check if already saved - MongoDB uyumlu findFirst kullan
    const existing = await this.prisma.savedPost.findFirst({
      where: {
        userId,
        postId,
      },
    });

    if (existing) {
      console.log(`⚠️ [savePost] Post already saved`);
      return { success: true, message: 'Post already saved' };
    }

    console.log(`💾 [savePost] Creating new savedPost entry...`);

    try {
      const savedPost = await this.prisma.savedPost.create({
        data: {
          userId,
          postId,
        },
      });
      
      console.log(`✅ [savePost] SavedPost created successfully: ${savedPost.id}`);
      console.log(`✅ [savePost] ========== SUCCESS ==========`);
      return { success: true, message: 'Post saved successfully', savedPost };
    } catch (error: any) {
      console.error(`❌ [savePost] Failed to create savedPost:`, {
        message: error?.message,
        code: error?.code,
        userId,
        postId,
      });
      throw error;
    }
  }

  async unsavePost(postId: string, userId: string) {
    console.log(`🗑️ [unsavePost] User ${userId} unsaving post ${postId}`);
    
    try {
      // MongoDB uyumlu - önce bul, sonra sil
      const savedPost = await this.prisma.savedPost.findFirst({
        where: {
          userId,
          postId,
        },
      });

      if (savedPost) {
        await this.prisma.savedPost.delete({
          where: {
            id: savedPost.id,
          },
        });
        console.log(`✅ [unsavePost] SavedPost deleted: ${savedPost.id}`);
      } else {
        console.log(`⚠️ [unsavePost] SavedPost not found (already unsaved)`);
      }
    } catch (error: any) {
      console.error(`❌ [unsavePost] Error:`, error?.message);
      // Ignore if not found
    }

    return { success: true, message: 'Post unsaved successfully' };
  }

  async getSavedPosts(userId: string) {
    try {
      console.log(`🔖 [getSavedPosts] ========== START ==========`);
      console.log(`🔖 [getSavedPosts] QUERY - userId: ${userId}`);
      console.log(`🔖 [getSavedPosts] Querying SavedPost and SavedArtwork tables...`);
      
      // ✅ HEM SavedPost HEM SavedArtwork query et!
      const [savedPosts, savedArtworks] = await Promise.all([
        // Normal posts
        this.prisma.savedPost.findMany({
          where: { userId },
          include: {
            post: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatar: true,
                    isVerified: true,
                  },
                },
                media: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Artworks
        this.prisma.savedArtwork.findMany({
          where: { userId },
          include: {
            post: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatar: true,
                    isVerified: true,
                  },
                },
                media: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      console.log(`✅ [getSavedPosts] RAW QUERY RESULT: ${savedPosts.length} posts + ${savedArtworks.length} artworks`);
      
      // ✅ İlk kayıt detayı
      if (savedPosts.length > 0) {
        console.log(`✅ [getSavedPosts] First SavedPost:`, {
          id: savedPosts[0]?.id,
          postId: savedPosts[0]?.postId,
          userId: savedPosts[0]?.userId,
          hasPost: !!savedPosts[0]?.post,
          postDeleted: savedPosts[0]?.post?.isDeleted,
          hasMedia: !!savedPosts[0]?.post?.media,
          mediaCount: savedPosts[0]?.post?.media?.length,
        });
      } else {
        console.warn(`⚠️ [getSavedPosts] NO SAVED POSTS FOUND FOR userId: ${userId}`);
        console.warn(`⚠️ [getSavedPosts] Bu kullanıcı hiç post kaydetmemiş olabilir!`);
      }
      
      // Combine both arrays
      const allSaved = [...savedPosts, ...savedArtworks];

      // ✅ NULL-SAFE Filter: Bozuk kayıtları atla (DAHA TOLERANT)
      const validSavedPosts = allSaved.filter((sp) => {
        // 1. Post null mu?
        if (!sp.post) {
          console.log(`⚠️ [getSavedPosts] SKIP: null post - savedItem: ${sp.id}`);
          return false;
        }
        
        // 2. Post deleted mi?
        if (sp.post.isDeleted === true) {
          console.log(`⚠️ [getSavedPosts] SKIP: deleted - postId: ${sp.postId}`);
          return false;
        }
        
        // 3. ⚠️ UYARI SADECE (media yoksa bile devam et - eski postlar için)
        if (!sp.post.media || sp.post.media.length === 0) {
          console.warn(`⚠️ [getSavedPosts] WARNING: No media - postId: ${sp.postId} (keeping anyway)`);
          // return false; // ❌ SKIP ETME! Eski postlar media yoksa bile görünsün
        }
        
        // 4. Media varsa URL kontrolü yap
        if (sp.post.media && sp.post.media.length > 0) {
          const firstMedia = sp.post.media[0];
          if (!firstMedia || !firstMedia.url) {
            console.warn(`⚠️ [getSavedPosts] WARNING: Null media URL - postId: ${sp.postId} (keeping anyway)`);
            // return false; // ❌ SKIP ETME!
          }
        }
        
        console.log(`✅ [getSavedPosts] VALID: postId: ${sp.postId}, hasMedia: ${!!sp.post.media?.length}`);
        return true;
      });
      
      // Sort by savedAt date (createdAt of SavedPost/SavedArtwork)
      validSavedPosts.sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return bDate - aDate; // Newest first
      });

      console.log(`✅ [getSavedPosts] Valid items: ${validSavedPosts.length} (sorted by date)`);

      if (validSavedPosts.length === 0) {
        return [];
      }

      // Check if liked
      const postIds = validSavedPosts.map(sp => sp.postId);
      const likes = await this.prisma.like.findMany({
        where: {
          postId: { in: postIds },
          userId,
        },
      });

      const likedPostIds = new Set(likes.map(l => l.postId));

      // Manuel count (MongoDB uyumlu)
      const likeCounts = await Promise.all(
        postIds.map(async (postId) => ({
          postId,
          count: await this.prisma.like.count({ where: { postId } }),
        }))
      );

      const commentCounts = await Promise.all(
        postIds.map(async (postId) => ({
          postId,
          count: await this.prisma.comment.count({ where: { postId, parentId: null } }),
        }))
      );

      const likeCountMap = new Map(likeCounts.map(lc => [lc.postId, lc.count]));
      const commentCountMap = new Map(commentCounts.map(cc => [cc.postId, cc.count]));

      const result = validSavedPosts.map(savedPost => ({
        ...savedPost.post,
        isLiked: likedPostIds.has(savedPost.postId),
        savedAt: savedPost.createdAt,
        _count: {
          likes: likeCountMap.get(savedPost.postId) || 0,
          comments: commentCountMap.get(savedPost.postId) || 0,
        },
      }));

      console.log(`✅ [getSavedPosts] Returning ${result.length} posts`);
      return result;
    } catch (error: any) {
      console.error('❌ [getSavedPosts] ERROR:', error?.message, error?.stack);
      return []; // Boş array dön, 500 verme!
    }
  }

  // Artwork save/unsave methods
  async saveArtwork(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Artwork not found');
    }

    if (post.type !== 'artwork') {
      throw new BadRequestException('This post is not an artwork');
    }

    // Check if already saved - MongoDB uyumlu findFirst kullan
    const existing = await this.prisma.savedArtwork.findFirst({
      where: {
        userId,
        postId,
      },
    });

    if (existing) {
      return { success: true, message: 'Artwork already saved' };
    }

    const saved =     await this.prisma.savedArtwork.create({
      data: {
        userId,
        postId,
      },
    });

    console.log('✅ Artwork saved to database:', { id: saved.userId, postId: saved.postId })

    return { success: true, message: 'Artwork saved successfully', saved: true };
  }

  async unsaveArtwork(postId: string, userId: string) {
    try {
      // MongoDB uyumlu - önce bul, sonra sil
      const savedArtwork = await this.prisma.savedArtwork.findFirst({
        where: {
          userId,
          postId,
        },
      });

      if (savedArtwork) {
        await this.prisma.savedArtwork.delete({
          where: {
            id: savedArtwork.id,
          },
        });
        console.log('✅ Artwork unsaved from database:', { userId: savedArtwork.userId, postId: savedArtwork.postId });
      } else {
        console.log('⚠️ Artwork not found (already unsaved)');
      }
    } catch (error: any) {
      console.warn('⚠️ Artwork unsave error:', error?.message);
      // Ignore if not found
    }

    return { success: true, message: 'Artwork unsaved successfully', saved: false };
  }

  async getSavedArtworks(userId: string) {
    const savedArtworks = await this.prisma.savedArtwork.findMany({
      where: {
        userId,
        post: {
          type: 'artwork',
        },
      },
      include: {
        post: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                isVerified: true,
              },
            },
            media: {
              orderBy: { order: 'asc' },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out null posts (in case artwork was deleted)
    const validArtworks = savedArtworks.filter((sa): sa is typeof sa & { post: NonNullable<typeof sa.post> } => sa.post !== null);

    // Check if liked
    const postIds = validArtworks.map(sa => sa.postId);
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    return validArtworks.map(savedArtwork => ({
      ...savedArtwork.post,
      isLiked: likedPostIds.has(savedArtwork.postId),
      savedAt: savedArtwork.createdAt,
    }));
  }

  // Alias for consistency with user's example
  async getSaved(userId: string) {
    return this.getSavedPosts(userId);
  }

  async toggleCommentLike(commentId: string, userId: string) {
    // Yorumun var olup olmadığını kontrol et
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Kullanıcı daha önce beğenmiş mi?
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Beğenmeyi kaldır
      await this.prisma.commentLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      // Beğeniyi ekle
      await this.prisma.commentLike.create({
        data: {
          commentId,
          userId,
        },
      });

      // 🔔 Bildirim oluştur (kendine beğenme hariç)
      if (comment.userId !== userId && this.notificationsService) {
        await this.notificationsService.createNotificationSync({
          userId: comment.userId,
          type: 'comment_like',
          message: `${comment.user.username} yorumunu beğendi.`,
          fromUserId: userId,
          postId: comment.postId,
          commentId: commentId,
          targetUrl: `/posts/${comment.postId}#cmt-${commentId}`,
        });

        console.log(`🔔 Comment like notification created for comment author: ${comment.userId}`);
      }
    }

    // Güncel beğeni sayısını al
    const likesCount = await this.prisma.commentLike.count({
      where: { commentId },
    });

    // 🔔 Socket.IO ile real-time güncelleme gönder (MongoDB entegrasyonu)
    if (this.commentsGateway) {
      const room = `post_${comment.postId}`;
      this.commentsGateway.server.to(room).emit('commentLikeUpdated', {
        commentId,
        postId: comment.postId,
        liked: !existingLike,
        likesCount,
        userId,
      });
      // Global event de gönder
      this.commentsGateway.server.emit('commentLikeUpdated', {
        commentId,
        postId: comment.postId,
        liked: !existingLike,
        likesCount,
        userId,
      });
      console.log(`💬 Comment like updated event broadcasted: ${commentId} (liked: ${!existingLike}, count: ${likesCount})`);
    }

    return {
      liked: !existingLike,
      likesCount,
    };
  }

  async toggleCommentPin(commentId: string, userId: string, pinned: boolean) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { userId: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Sadece gönderi sahibi yorumu sabitleyebilir/unpin edebilir
    if (comment.post.userId !== userId) {
      throw new ForbiddenException('Only the post owner can pin/unpin comments');
    }

    // Önce aynı posttaki diğer pinned yorumları kaldır (sadece bir yorum pinned olabilir)
    if (pinned) {
      await this.prisma.comment.updateMany({
        where: {
          postId: comment.postId,
          isPinned: true,
          id: { not: commentId },
        },
        data: {
          isPinned: false,
        },
      });
    }

    // Yorumun pin durumunu güncelle
    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isPinned: pinned,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            roles: true,
            plan: true,
          },
        },
        post: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    // ✅ Yorum sabitlendiğinde bildirim gönder (sadece pin edildiğinde)
    if (pinned && updatedComment.userId !== userId) {
      // Yorumu yazan kişiye bildirim gönder (gönderi sahibi kendi yorumunu sabitlemişse bildirim gönderme)
      const allowed = await this.notificationsService.isAllowed(updatedComment.userId, 'comment_pinned');
      if (allowed) {
        await this.notificationsService.createNotificationSync({
          userId: updatedComment.userId,
          type: 'comment_pinned',
          fromUserId: userId, // Gönderi sahibi
          postId: updatedComment.postId,
          commentId: updatedComment.id,
          targetUrl: `/posts/${updatedComment.postId}`,
        });
      }
    }

    // Socket.IO ile real-time güncelleme gönder
    if (this.commentsGateway) {
      const room = `post:${updatedComment.postId}`;
      this.commentsGateway.server.to(room).emit('commentPinned', {
        id: updatedComment.id,
        postId: updatedComment.postId,
        isPinned: updatedComment.isPinned,
      });
      // Global event de gönder
      this.commentsGateway.server.emit('commentPinned', {
        id: updatedComment.id,
        postId: updatedComment.postId,
        isPinned: updatedComment.isPinned,
      });
    }

    // Tüm comment bilgilerini döndür (frontend'in ihtiyacı olan tüm alanlar)
    return {
      id: updatedComment.id,
      content: updatedComment.content,
      isPinned: updatedComment.isPinned,
      createdAt: updatedComment.createdAt,
      user: updatedComment.user,
      likesCount: updatedComment._count.likes,
      repliesCount: updatedComment._count.replies,
    };
  }

  /**
   * Eser için QR kodlu PDF etiket oluşturma
   */
  async generateArtworkQrPdf(postId: string, res: Response) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        caption: true,
        type: true,
        code: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        media: {
          orderBy: { order: 'asc' },
          take: 1,
          select: {
            url: true,
            type: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Eser bulunamadı');
    }

    if (post.type !== 'artwork') {
      throw new BadRequestException('Bu gönderi bir eser değil');
    }

    // Eğer kod yoksa, şimdi oluştur
    let artworkCode = post.code;
    if (!artworkCode) {
      artworkCode = await generateUniqueArtworkCode(this.prisma);
      await this.prisma.post.update({
        where: { id: postId },
        data: { code: artworkCode },
      });
    }

    // Frontend URL'ini al
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    // QR kod URL'i - Eser detay sayfasına yönlendir
    const artworkUrl = `${frontendUrl}/posts/${postId}`;
    const qrDataUrl = await generateQrDataUrl(artworkUrl);

    // PDF oluştur - Küçük etiket formatı (210mm x 120mm)
    const doc = new PDFDocument({
      size: [210, 120], // mm cinsinden küçük etiket
      margin: 10,
      layout: 'landscape',
      bufferPages: false,
      info: {
        Title: `Feellink Eser Etiketi - ${post.caption || artworkCode}`,
        Author: 'Feellink',
        Subject: 'Eser QR Etiketi',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Feellink_Eser_Etiketi_${artworkCode}.pdf"`,
    );
    doc.pipe(res);

    // Renk paleti
    const orange = '#ff7b00';
    const dark = '#111827';
    const gray = '#374151';
    const bgColor = '#f4f0e8';

    // Arka plan rengi
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(bgColor);

    // Üst kısım - Sol taraf: Eser bilgileri
    const leftMargin = 15;
    let currentY = 20;

    // Eser adı (caption veya kod)
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(dark)
      .text(post.caption || artworkCode, leftMargin, currentY, {
        width: 180,
        ellipsis: true,
      });

    currentY += 25;

    // Sanatçı adı
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor(dark)
      .text(post.user.fullName || post.user.username, leftMargin, currentY);

    currentY += 20;

    // Eser kodu
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(gray)
      .text(artworkCode, leftMargin, currentY);

    // Üst kısım - Sağ taraf: Turuncu şerit
    doc
      .rect(doc.page.width - 20, 0, 20, doc.page.height)
      .fill(orange);

    // Orta blok - Sol: QR Kod
    const qrSize = 80;
    const qrX = leftMargin;
    const qrY = currentY + 15;

    // QR çerçevesi
    doc
      .roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 5)
      .lineWidth(2)
      .stroke(orange)
      .fill('#FFFFFF');

    // QR kod resmi
    try {
      const tmpDir = '/tmp';
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const qrPath = path.join(tmpDir, `${postId}-qr.png`);
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(qrPath, base64Data, 'base64');

      doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize });

      fs.unlinkSync(qrPath);
    } catch (error) {
      console.error('QR kod yüklenemedi:', error);
    }

    // Orta blok - Sağ: Slogan
    const sloganX = qrX + qrSize + 20;
    const sloganY = qrY + 15;

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(dark)
      .text('Feellink ile', sloganX, sloganY, { width: 80 });

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(orange)
      .text('sanat daha anlamlı!', sloganX, sloganY + 20, { width: 80 });

    // Alt blok - Bilgilendirme kutusu
    const infoBoxY = qrY + qrSize + 10;
    const infoBoxWidth = doc.page.width - leftMargin * 2 - 25;

    doc
      .roundedRect(leftMargin, infoBoxY, infoBoxWidth, 35, 4)
      .lineWidth(1.5)
      .stroke(orange)
      .fill('#FFFFFF');

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(dark)
      .text(
        'Bu eser hakkında ne düşünüyorsun? Duygularını, fikirlerini bizimle paylaş! QR kodu tarat, yorumunu bırak ve diğer sanatseverlerin görüşlerini keşfet.',
        leftMargin + 5,
        infoBoxY + 5,
        {
          width: infoBoxWidth - 10,
          align: 'left',
          lineGap: 2,
        },
      );

    doc.end();
  }

  /**
   * Kullanıcının eserlerinden renk eşleşmelerini bulur
   * @param userId - Analiz edilecek kullanıcı ID'si
   * @returns Renk eşleşmesi olan diğer kullanıcılar ve skorları
   */
  async getColorMatches(userId: string) {
    // Kullanıcının tüm artwork'lerini al
    const userArtworks = await this.prisma.post.findMany({
      where: {
        userId,
        type: 'artwork',
        colors: {
          isEmpty: false, // Renk analizi yapılmış olanlar
        },
      },
      select: {
        colors: true,
      },
    });

    // Kullanıcının tüm renklerini topla
    const userColors = [
      ...new Set(userArtworks.flatMap((artwork) => artwork.colors || [])),
    ];

    if (userColors.length === 0) {
      return [];
    }

    // Tüm kullanıcıları ve artwork'lerini al
    const allUsers = await this.prisma.user.findMany({
      where: {
        id: {
          not: userId, // Kendisini hariç tut
        },
      },
      include: {
        posts: {
          where: {
            type: 'artwork',
            colors: {
              isEmpty: false,
            },
          },
          select: {
            colors: true,
          },
        },
      },
    });

    const matches = [];

    for (const otherUser of allUsers) {
      // Diğer kullanıcının renklerini topla
      const otherColors = [
        ...new Set(otherUser.posts.flatMap((artwork) => artwork.colors || [])),
      ];

      if (otherColors.length === 0) {
        continue;
      }

      // Ortak renkleri bul
      const ortakRenkler = otherColors.filter((color) =>
        userColors.includes(color),
      );

      if (ortakRenkler.length > 0) {
        // Renk benzerliği skoru hesapla
        let similarityScore = 0;
        let totalSimilarity = 0;

        for (const userColor of userColors) {
          let maxSimilarity = 0;
          for (const otherColor of otherColors) {
            const similarity =
              this.colorAnalysisService.calculateColorSimilarity(
                userColor,
                otherColor,
              );
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }
          totalSimilarity += maxSimilarity;
        }

        const avgSimilarity = totalSimilarity / userColors.length;

        // Skor hesaplama: ortak renk sayısı + benzerlik oranı
        const matchScore =
          ortakRenkler.length * 20 + // Her ortak renk 20 puan
          avgSimilarity * 0.6; // Benzerlik %60 ağırlıkta

        matches.push({
          user: {
            id: otherUser.id,
            username: otherUser.username,
            fullName: otherUser.fullName,
            avatar: otherUser.avatar,
            isVerified: otherUser.isVerified,
            roles: otherUser.roles,
          },
          ortakRenkSayisi: ortakRenkler.length,
          ortakRenkler: ortakRenkler.slice(0, 5), // En fazla 5 renk göster
          matchScore: Math.round(matchScore),
          similarityPercentage: Math.round(avgSimilarity),
        });
      }
    }

    // Skora göre sırala (yüksekten düşüğe)
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // En iyi 10 eşleşme
  }

  /**
   * Kullanıcının renk paletini döndürür (tüm artwork'lerinden)
   * @param userId - Kullanıcı ID'si
   * @returns Kullanıcının renk paleti (en sık kullanılanlar)
   */
  async getUserColorPalette(userId: string): Promise<string[]> {
    const userArtworks = await this.prisma.post.findMany({
      where: {
        userId,
        type: 'artwork',
        colors: {
          isEmpty: false,
        },
      },
      select: {
        colors: true,
      },
    });

    // Tüm renkleri topla
    const allColors = userArtworks.flatMap((artwork) => artwork.colors || []);

    // Renk sıklığını hesapla
    const colorFrequency: Record<string, number> = {};
    for (const color of allColors) {
      colorFrequency[color] = (colorFrequency[color] || 0) + 1;
    }

    // En sık kullanılan renkleri sırala
    const sortedColors = Object.entries(colorFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([color]) => color);

    return sortedColors;
  }

  /**
   * Eser QR bilet PDF — grid/flex mantığıyla tek layout: üst metin bloğu | alt bant (QR + slogan) | logo köşe.
   * Koordinatlar bölgelerden türetilir; slogan QR ile top-align, logo için sağda rezerv alan.
   */
  async generateQrLabelPdf(postId: string): Promise<Buffer> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Eser bulunamadı');
    }

    if (post.type !== 'artwork') {
      throw new BadRequestException('Bu gönderi bir eser değil');
    }

    let artworkCode = post.code;
    if (!artworkCode) {
      artworkCode = await generateUniqueArtworkCode(this.prisma);
      await this.prisma.post.update({
        where: { id: postId },
        data: { code: artworkCode },
      });
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const artworkUrl = `${frontendUrl}/posts/${postId}`;

    const { createCanvas, loadImage, registerFont } = require('canvas');

    // Sunucuda Arial yok; Vercel’de assets/ paket dışı kalabiliyor → vercel.json includeFiles + çoklu path.
    const assetsRoot = resolveFeellinkAssetsRoot();
    const fontsDir = path.join(assetsRoot, 'fonts');
    const notoRegPath = path.join(fontsDir, 'NotoSans-Regular.ttf');
    const notoBoldPath = path.join(fontsDir, 'NotoSans-SemiBold.ttf');
    const interRegularPath = path.join(fontsDir, 'Inter-Regular.ttf');
    const interBoldPath = path.join(fontsDir, 'Inter-Bold.ttf');

    const F_REG = 'FeellinkTicket';
    const F_BOLD = 'FeellinkTicketBold';

    try {
      if (fs.existsSync(notoRegPath)) {
        registerFont(fontPathForRegister(notoRegPath, 'feellink-NotoSans-Regular.ttf'), {
          family: F_REG,
        });
      } else if (fs.existsSync(interRegularPath)) {
        registerFont(fontPathForRegister(interRegularPath, 'feellink-Inter-Regular.ttf'), {
          family: F_REG,
        });
      }
      if (fs.existsSync(notoBoldPath)) {
        registerFont(fontPathForRegister(notoBoldPath, 'feellink-NotoSans-SemiBold.ttf'), {
          family: F_BOLD,
        });
      } else if (fs.existsSync(interBoldPath)) {
        registerFont(fontPathForRegister(interBoldPath, 'feellink-Inter-Bold.ttf'), {
          family: F_BOLD,
        });
      }
    } catch (error) {
      console.warn('Font kayıt hatası:', error);
    }

    const hasReg = fs.existsSync(notoRegPath) || fs.existsSync(interRegularPath);
    const hasBold = fs.existsSync(notoBoldPath) || fs.existsSync(interBoldPath);
    if (!hasReg) {
      console.error(
        `[generateQrLabelPdf] Font yok. cwd=${process.cwd()} assetsRoot=${assetsRoot} — PDF □ olur.`,
      );
    }
    const fontReg = hasReg ? F_REG : 'sans-serif';
    const fontBold = hasBold ? F_BOLD : fontReg;
    const fontMono = fontReg;

    // —— Kart (sabit oran) ——
    const width = 1000;
    const height = 425;
    const dpiScale = 2;

    // Layout token’ları (flex/grid karşılığı; tüm çizim bunlardan türetilir)
    const PAD = 32;
    const GAP_STACK = 6; // başlık / sanatçı / kod arası 4–8px
    const GAP_SECTION = 26; // üst blok ↔ QR — daha ferah
    const GAP_QR_SLOGAN = 24;
    const QR_SIZE = 192;
    const QR_INNER_PAD = 8;
    const LOGO_MAX_W = 252;
    const LOGO_MAX_H = 70;
    const LOGO_RESERVE_W = Math.round(LOGO_MAX_W + 52);
    const TITLE_MAX_LINES = 2;
    /** Başlık → ince divider → sanatçı dikey ritim */
    const GAP_AFTER_TITLE = 6;
    const DIVIDER_H = 1;
    const GAP_AFTER_DIVIDER = 9;
    const TITLE_BLOCK_TO_META =
      GAP_AFTER_TITLE + DIVIDER_H + GAP_AFTER_DIVIDER;
    const BRAND_ORANGE = '#ff7b00';
    const BRAND_TEAL = '#1fb4bc';

    const canvas = createCanvas(width * dpiScale, height * dpiScale);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpiScale, dpiScale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const contentTop = PAD;
    const qrX = PAD;
    const qrY = height - PAD - QR_SIZE;
    const bottomBandTop = qrY;

    // Üst blok alt sınırı (metin buranın üstünde kalmalı)
    const topBlockMaxBottom = bottomBandTop - GAP_SECTION;

    const titleRaw =
      (post.title && post.title.trim()) ||
      (post.caption && post.caption.trim()) ||
      '';
    const ownerRaw =
      (post.user.fullName && post.user.fullName.trim()) ||
      (post.user.username || '').trim();

    const topContentW = width - PAD * 2;

    // Tipografi token’ları (hiyerarşi sabit; sadece başlık fontu sığmazsa küçülür)
    const ARTIST_FS = 18;
    const CODE_FS = 14;
    const SLOGAN_BASE_FS = 28;
    const TITLE_LINE_HEIGHT = 1.2;

    let titleFont = 28;
    let titleLines: string[] = [];
    for (; titleFont >= 19; titleFont -= 1) {
      ctx.font = `${titleFont}px ${fontBold}`;
      titleLines = titleRaw ? wrapCanvasText(ctx, titleRaw, topContentW, TITLE_MAX_LINES) : [];
      const titleH =
        titleLines.length > 0
          ? titleLines.length * titleFont * TITLE_LINE_HEIGHT
          : Math.round(titleFont * 0.35);
      const ruleBlock = TITLE_BLOCK_TO_META;
      let cursorY = contentTop + titleH + ruleBlock;
      ctx.font = `${ARTIST_FS}px ${fontReg}`;
      const artistH = ownerRaw ? ARTIST_FS * 1.25 : 0;
      if (ownerRaw) {
        cursorY += artistH + GAP_STACK;
      }
      ctx.font = `${CODE_FS}px ${fontMono}`;
      cursorY += CODE_FS * 1.25;
      if (cursorY <= topBlockMaxBottom) {
        break;
      }
    }

    // —— Başlık → ince divider (metin genişliğinde) → sanatçı → kod ——
    let drawY = contentTop;
    ctx.fillStyle = '#0f172a';
    ctx.font = `${titleFont}px ${fontBold}`;
    if (titleLines.length > 0) {
      for (const line of titleLines) {
        ctx.fillText(line, PAD, drawY);
        drawY += titleFont * TITLE_LINE_HEIGHT;
      }
      drawY += GAP_AFTER_TITLE;
      const divGrad = ctx.createLinearGradient(PAD, 0, PAD + topContentW, 0);
      divGrad.addColorStop(0, '#f0e8e2');
      divGrad.addColorStop(0.45, '#e8eaef');
      divGrad.addColorStop(1, '#e0eef0');
      ctx.fillStyle = divGrad;
      ctx.fillRect(PAD, drawY, topContentW, DIVIDER_H);
      drawY += DIVIDER_H + GAP_AFTER_DIVIDER;
    } else {
      drawY += Math.round(titleFont * 0.2);
      drawY += GAP_AFTER_TITLE + GAP_AFTER_DIVIDER;
    }

    ctx.font = `${ARTIST_FS}px ${fontReg}`;
    ctx.fillStyle = '#334155';
    if (ownerRaw) {
      ctx.fillText(truncateOneLine(ctx, ownerRaw, topContentW), PAD, drawY);
      drawY += ARTIST_FS * 1.25 + GAP_STACK;
    }

    ctx.font = `${CODE_FS}px ${fontMono}`;
    ctx.fillStyle = '#475569';
    ctx.fillText(artworkCode, PAD, drawY);

    const qrBuffer = await QRCode.toBuffer(artworkUrl, {
      margin: 1,
      width: 640,
      type: 'png',
    });
    const qrImg = await loadImage(qrBuffer);
    const innerQr = QR_SIZE - QR_INNER_PAD * 2;

    // QR: beyaz zemin, tek ince çerçeve (okunabilirlik korunur)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, QR_SIZE, QR_SIZE);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(qrX + 0.5, qrY + 0.5, QR_SIZE - 1, QR_SIZE - 1);
    ctx.drawImage(
      qrImg,
      qrX + QR_INNER_PAD,
      qrY + QR_INNER_PAD,
      innerQr,
      innerQr,
    );

    // Slogan: QR sağı ile logo rezervi arasındaki şeritte yatayda ortalı (metin sola hizalı)
    const sloganBandLeft = qrX + QR_SIZE + GAP_QR_SLOGAN;
    const sloganBandRight = width - PAD - LOGO_RESERVE_W;
    const sloganSlotW = Math.max(160, sloganBandRight - sloganBandLeft);
    const sloganBrand = 'Feellink';
    const sloganRest = ' ile sanat daha anlamlı!';
    const sloganFontItalic = (size: number) =>
      `italic 500 ${size}px ${fontBold}`;

    let sloganFont = SLOGAN_BASE_FS;
    let wBrand = 0;
    let wRest = 0;
    for (; sloganFont >= 17; sloganFont -= 1) {
      ctx.font = sloganFontItalic(sloganFont);
      wBrand = ctx.measureText(sloganBrand).width;
      wRest = ctx.measureText(sloganRest).width;
      if (wBrand + wRest <= sloganSlotW - 8) {
        break;
      }
    }

    const totalSloganW = wBrand + wRest;
    const sy = qrY;
    let sx =
      sloganBandLeft + Math.max(0, (sloganSlotW - totalSloganW) / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = BRAND_ORANGE;
    ctx.font = sloganFontItalic(sloganFont);
    ctx.fillText(sloganBrand, sx, sy);
    sx += wBrand;
    ctx.fillStyle = '#0f172a';
    ctx.font = sloganFontItalic(sloganFont);
    ctx.fillText(sloganRest, sx, sy);

    const logosDir = path.join(assetsRoot, 'logos');
    const orangeLogo = path.join(logosDir, 'feellink-turuncu.png');
    const blueLogo = path.join(logosDir, 'feellink-mavi.png');
    const useOrange = hashPostIdForLayout(postId) % 2 === 0;
    let logoPath = useOrange ? orangeLogo : blueLogo;
    if (!fs.existsSync(logoPath)) {
      const alt = useOrange ? blueLogo : orangeLogo;
      logoPath = fs.existsSync(alt) ? alt : path.join(assetsRoot, 'logo.png');
    }
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(process.cwd(), 'assets', 'logo.png');
    }

    try {
      if (fs.existsSync(logoPath)) {
        const logoImg = await loadImage(fs.readFileSync(logoPath));
        const ratio = logoImg.width / logoImg.height;
        let lw = LOGO_MAX_W;
        let lh = Math.round(lw / ratio);
        if (lh > LOGO_MAX_H) {
          lh = LOGO_MAX_H;
          lw = Math.round(lh * ratio);
        }
        const lx = width - PAD - lw;
        const ly = height - PAD - lh;
        ctx.drawImage(logoImg, lx, ly, lw, lh);
      }
    } catch (e) {
      console.warn('Logo yüklenemedi:', e);
    }

    // Kart çerçevesi — turuncu → teal yatay gradient stroke (PDF’te PNG olarak embed)
    const cardR = 14;
    const bx = 0.75;
    const by = 0.75;
    const bw = width - 1.5;
    const bh = height - 1.5;
    const borderGrad = ctx.createLinearGradient(0, 0, width, 0);
    borderGrad.addColorStop(0, BRAND_ORANGE);
    borderGrad.addColorStop(1, BRAND_TEAL);
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx + cardR, by);
    ctx.lineTo(bx + bw - cardR, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + cardR);
    ctx.lineTo(bx + bw, by + bh - cardR);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - cardR, by + bh);
    ctx.lineTo(bx + cardR, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - cardR);
    ctx.lineTo(bx, by + cardR);
    ctx.quadraticCurveTo(bx, by, bx + cardR, by);
    ctx.closePath();
    ctx.stroke();

    const pngBuffer = canvas.toBuffer('image/png');

    const pdfDoc = await PDFLibDocument.create();
    const a4Width = 210;
    const a4Height = 297;
    const mmPerInch = 25.4;
    const dpi = 144;
    const mmPerPx = mmPerInch / dpi;
    const labelWidthMm = width * mmPerPx;
    const labelHeightMm = height * mmPerPx;

    let pdfScale = 1;
    if (labelWidthMm > a4Width || labelHeightMm > a4Height) {
      const scaleX = (a4Width - 20) / labelWidthMm;
      const scaleY = (a4Height - 20) / labelHeightMm;
      pdfScale = Math.min(scaleX, scaleY, 1);
    }

    const finalWidthMm = labelWidthMm * pdfScale;
    const finalHeightMm = labelHeightMm * pdfScale;

    const page = pdfDoc.addPage([a4Width, a4Height]);
    const xOffset = (a4Width - finalWidthMm) / 2;
    const yOffset = (a4Height - finalHeightMm) / 2;

    const pngImage = await pdfDoc.embedPng(pngBuffer);
    page.drawImage(pngImage, {
      x: xOffset,
      y: a4Height - yOffset - finalHeightMm,
      width: finalWidthMm,
      height: finalHeightMm,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
  /**
   * 🎟️ Premium Bilet PDF üretimi - PNG şablon tabanlı profesyonel bilet sistemi
   * Bilet boyutu: 1400x700px, tek sayfa PDF, A4 üzerinde ortalanmış
   */
  async generateArtworkTicket(postId: string, userId: string): Promise<Buffer> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Eser bulunamadı');
    }

    if (post.type !== 'artwork') {
      throw new BadRequestException('Bu gönderi bir eser değil');
    }

    // Kullanıcı kontrolü
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Eser kodu oluştur veya mevcut kodu kullan
    let artworkCode = post.code;
    if (!artworkCode) {
      artworkCode = await generateUniqueArtworkCode(this.prisma);
      await this.prisma.post.update({
        where: { id: postId },
        data: { code: artworkCode },
      });
    }

    // Frontend URL'ini al
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const artworkUrl = `${frontendUrl}/posts/${postId}`;

    // === CANVAS LAZY IMPORT (Webpack hatası için) ===
    const { createCanvas, loadImage, registerFont } = require('canvas');

    // === PNG ŞABLONUNU YÜKLE ===
    const ticketAssetsRoot = resolveFeellinkAssetsRoot();
    const templatePath = path.join(ticketAssetsRoot, 'templates', 'bilet_template.png');
    
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException(
        `Bilet şablonu bulunamadı: ${templatePath}. Lütfen backend/assets/templates/bilet_template.png dosyasını ekleyin.`
      );
    }

    const template = await loadImage(templatePath);
    const width = template.width;
    const height = template.height;

    // === CANVAS OLUŞTUR ===
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // PNG şablonunu arka plana çiz
    ctx.drawImage(template, 0, 0, width, height);

    // === FONT KAYDI ===
    try {
      const fontsDir = path.join(ticketAssetsRoot, 'fonts');
      const interRegular = path.join(fontsDir, 'Inter-Regular.ttf');
      const interBold = path.join(fontsDir, 'Inter-Bold.ttf');
      const notoReg = path.join(fontsDir, 'NotoSans-Regular.ttf');
      const notoBold = path.join(fontsDir, 'NotoSans-SemiBold.ttf');

      if (fs.existsSync(notoReg)) {
        registerFont(fontPathForRegister(notoReg, 'feellink-ticket-NotoSans-Regular.ttf'), {
          family: 'Inter',
        });
      } else if (fs.existsSync(interRegular)) {
        registerFont(fontPathForRegister(interRegular, 'feellink-ticket-Inter-Regular.ttf'), {
          family: 'Inter',
        });
      }
      if (fs.existsSync(notoBold)) {
        registerFont(fontPathForRegister(notoBold, 'feellink-ticket-NotoSans-SemiBold.ttf'), {
          family: 'InterBold',
        });
      } else if (fs.existsSync(interBold)) {
        registerFont(fontPathForRegister(interBold, 'feellink-ticket-Inter-Bold.ttf'), {
          family: 'InterBold',
        });
      }
    } catch (error) {
      console.warn('Font kayıt hatası (sistem fontları kullanılacak):', error);
    }

    // === METİNLER ===
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    // Font kontrolü için path
    const fontsDir = path.join(ticketAssetsRoot, 'fonts');
    const hasInterBold =
      fs.existsSync(path.join(fontsDir, 'NotoSans-SemiBold.ttf')) ||
      fs.existsSync(path.join(fontsDir, 'Inter-Bold.ttf'));
    const hasInterRegular =
      fs.existsSync(path.join(fontsDir, 'NotoSans-Regular.ttf')) ||
      fs.existsSync(path.join(fontsDir, 'Inter-Regular.ttf'));

    // Eser Adı (Bold, 48px) - Referans: X=120, Y=180
    // 🎨 Eser adı: title > caption > artworkCode (öncelik sırası)
    const artworkName = post.title || post.caption || artworkCode;
    const nameFontSize = width * (48 / 1400); // Dinamik: 48/1400
    ctx.font = `${nameFontSize}px ${hasInterBold ? 'InterBold' : 'Arial-Bold'}`;
    ctx.fillText(artworkName, width * (120 / 1400), height * (180 / 700));

    // Sanatçı Adı (Regular, 36px) - Referans: X=120, Y=240
    const artistName = post.user.fullName || post.user.username || '';
    const artistFontSize = width * (36 / 1400);
    ctx.font = `${artistFontSize}px ${hasInterRegular ? 'Inter' : 'Arial'}`;
    ctx.fillText(artistName, width * (120 / 1400), height * (240 / 700));

    // Eser Kodu (Regular, 28px, gri) - Referans: X=120, Y=290
    const codeFontSize = width * (28 / 1400);
    ctx.font = `${codeFontSize}px ${hasInterRegular ? 'Inter' : 'Arial'}`;
    ctx.fillStyle = '#555555';
    ctx.fillText(`Kod: ${artworkCode}`, width * (120 / 1400), height * (290 / 700));

    // === QR KOD OLUŞTUR VE YERLEŞTİR ===
    const qrBuffer = await QRCode.toBuffer(artworkUrl, {
      margin: 1,
      width: 400,
      type: 'png',
    });
    const qrImg = await loadImage(qrBuffer);

    // QR koordinatları - Referans: X=120, Y=320, Size=280
    const qrX = width * (120 / 1400);
    const qrY = height * (320 / 700);
    const qrSize = width * (280 / 1400);

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // === CANVAS'I PNG'YE ÇEVİR ===
    const pngBuffer = canvas.toBuffer('image/png');

    // === PDF OLUŞTUR (PDF-lib ile) ===
    const pdfDoc = await PDFLibDocument.create();
    
    // A4 sayfa boyutları (mm cinsinden)
    const a4Width = 210; // mm
    const a4Height = 297; // mm
    
    // PNG boyutlarını mm'ye çevir (72 DPI varsayımı)
    const mmPerInch = 25.4;
    const dpi = 72;
    const mmPerPx = mmPerInch / dpi;
    
    const labelWidthMm = width * mmPerPx;
    const labelHeightMm = height * mmPerPx;
    
    // A4'e sığdır (scale if needed)
    let scale = 1;
    if (labelWidthMm > a4Width || labelHeightMm > a4Height) {
      const scaleX = (a4Width - 20) / labelWidthMm; // 10mm margin each side
      const scaleY = (a4Height - 20) / labelHeightMm; // 10mm margin top/bottom
      scale = Math.min(scaleX, scaleY, 1);
    }
    
    const finalWidthMm = labelWidthMm * scale;
    const finalHeightMm = labelHeightMm * scale;
    
    // A4 sayfası oluştur
    const page = pdfDoc.addPage([a4Width, a4Height]);
    
    // PNG'yi PDF'e ekle (ortalanmış)
    const xOffset = (a4Width - finalWidthMm) / 2;
    const yOffset = (a4Height - finalHeightMm) / 2;
    
    const pngImage = await pdfDoc.embedPng(pngBuffer);
    page.drawImage(pngImage, {
      x: xOffset,
      y: a4Height - yOffset - finalHeightMm, // PDF koordinat sistemi alttan başlar
      width: finalWidthMm,
      height: finalHeightMm,
    });

    // PDF'i kaydet
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Helper: PDF stream'i Buffer'a çevir
   */
  private streamToBuffer(doc: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });
  }
}

