import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
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
  ) {}

  async createPost(userId: string, dto: CreatePostDto) {
    if (!dto.media || dto.media.length === 0) {
      throw new BadRequestException('At least one media file is required');
    }

    // Extract hashtags from caption
    const hashtags = this.extractHashtags(dto.caption || '');

    // Create post
    const post = await this.prisma.post.create({
      data: {
        userId,
        caption: dto.caption,
        location: dto.location,
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
    
    const postPayload = {
      id: post.id,
      caption: post.caption,
      imageUrl: post.media && post.media.length > 0 ? post.media[0].url : null,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
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

    return post;
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
        comments: {
          where: {
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
          orderBy: [
            { isPinned: 'desc' }, // Sabitlenmiş yorumlar en üstte
            { createdAt: 'desc' },
          ],
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let isLiked = false;
    let isSaved = false;
    
    if (currentUserId) {
      const [like, savedPost] = await Promise.all([
        this.prisma.like.findUnique({
          where: {
            postId_userId: {
              postId,
              userId: currentUserId,
            },
          },
        }),
        this.prisma.savedPost.findUnique({
          where: {
            userId_postId: {
              userId: currentUserId,
              postId,
            },
          },
        }),
      ]);
      isLiked = !!like;
      isSaved = !!savedPost;
    }

    // Avatar URL'lerini formatla
    const CDN_BASE = this.configService.get('CDN_BASE_URL') || 
      `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;

    // Comments'leri formatla (nested replies dahil)
    const formattedComments = post.comments.map((comment: any) => ({
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      content: comment.content,
      createdAt: comment.createdAt,
      isLikedByCurrentUser: comment.likes && comment.likes.length > 0,
      likesCount: comment._count?.likes || 0,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        fullName: comment.user.fullName,
        avatar: comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`) : null,
        isVerified: comment.user.isVerified,
      },
      replies: comment.replies.map((reply: any) => ({
        id: reply.id,
        postId: reply.postId,
        parentId: reply.parentId,
        content: reply.content,
        createdAt: reply.createdAt,
        isLikedByCurrentUser: reply.likes && reply.likes.length > 0,
        likesCount: reply._count?.likes || 0,
        user: {
          id: reply.user.id,
          username: reply.user.username,
          fullName: reply.user.fullName,
          avatar: reply.user.avatar ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`) : null,
          isVerified: reply.user.isVerified,
        },
      })),
    }));

    return {
      ...post,
      comments: formattedComments,
      isLiked,
      isSaved,
    };
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Cannot delete this post');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    // Remove from feed cache
    await this.feedService.removeFromFeeds(postId);

    return { status: 'deleted' };
  }

  async likePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Use upsert to handle already liked case
    await this.prisma.like.upsert({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      update: {},
      create: {
        postId,
        userId,
      },
    });

    // Get updated like count
    const updatedPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

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
        likeCount: updatedPost._count.likes,
        isLiked: true,
        userId,
      });
      console.log(`❤️ Post liked event broadcasted: ${postId}`);
    }

    // 🏆 Ziyaretçi güncelleme - Post sahibi corporate ise analytics'i güncelle
    try {
      const postOwner = await this.prisma.user.findUnique({
        where: { id: post.userId },
        select: { role: true },
      });

      if (postOwner && postOwner.role === 'CORPORATE') {
        const topVisitors = await this.analyticsService.getTopVisitors(post.userId);
        this.notificationsGateway.emitVisitorUpdate(post.userId, topVisitors);
      }
    } catch (error) {
      console.error('Error updating visitor analytics:', error);
    }

    return { success: true, liked: true, likeCount: updatedPost._count.likes };
  }

  async unlikePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.like.deleteMany({
      where: {
        postId,
        userId,
      },
    });

    // Get updated like count
    const updatedPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    // 🔔 Real-time yayın - Socket.IO ile beğeni kaldırma güncellemesi
    if (this.postsGateway) {
      this.postsGateway.server.emit('postLikeUpdated', {
        postId,
        change: -1,
        likeCount: updatedPost._count.likes,
        isLiked: false,
        userId,
      });
      console.log(`💔 Post unliked event broadcasted: ${postId}`);
    }

    return { success: true, liked: false, likeCount: updatedPost._count.likes };
  }

  async createComment(postId: string, userId: string, content: string, parentId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId,
        content,
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
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

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

    // 🏆 Ziyaretçi güncelleme - Post sahibi corporate ise analytics'i güncelle
    try {
      const postOwner = await this.prisma.user.findUnique({
        where: { id: post.userId },
        select: { role: true },
      });

      if (postOwner && postOwner.role === 'CORPORATE') {
        const topVisitors = await this.analyticsService.getTopVisitors(post.userId);
        this.notificationsGateway.emitVisitorUpdate(post.userId, topVisitors);
      }
    } catch (error) {
      console.error('Error updating visitor analytics:', error);
    }

    return comment;
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
        postId,
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

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
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

  async getUserPosts(userId: string, currentUserId?: string) {
    // Check if current user can see posts (privacy check)
    if (currentUserId && currentUserId !== userId) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (targetUser.isPrivate) {
        const isFollowing = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: userId,
            },
          },
        });

        if (!isFollowing) {
          throw new ForbiddenException('Cannot view posts from private account');
        }
      }
    }

    const posts = await this.prisma.post.findMany({
      where: { userId },
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
      orderBy: { createdAt: 'desc' },
    });

    // Check if liked by current user
    if (currentUserId) {
      const postIds = posts.map(p => p.id);
      const likes = await this.prisma.like.findMany({
        where: {
          postId: { in: postIds },
          userId: currentUserId,
        },
      });

      const likedPostIds = new Set(likes.map(l => l.postId));

      return posts.map(post => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      }));
    }

    return posts.map(post => ({ ...post, isLiked: false }));
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(m => m.substring(1).toLowerCase()) : [];
  }

  async savePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if already saved
    const existing = await this.prisma.savedPost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existing) {
      return { success: true, message: 'Post already saved' };
    }

    await this.prisma.savedPost.create({
      data: {
        userId,
        postId,
      },
    });

    return { success: true, message: 'Post saved successfully' };
  }

  async unsavePost(postId: string, userId: string) {
    try {
      await this.prisma.savedPost.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
    } catch (error) {
      // Ignore if not found
    }

    return { success: true, message: 'Post unsaved successfully' };
  }

  async getSavedPosts(userId: string) {
    const savedPosts = await this.prisma.savedPost.findMany({
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

    // Check if liked
    const postIds = savedPosts.map(sp => sp.postId);
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        userId,
      },
    });

    const likedPostIds = new Set(likes.map(l => l.postId));

    return savedPosts.map(savedPost => ({
      ...savedPost.post,
      isLiked: likedPostIds.has(savedPost.postId),
      savedAt: savedPost.createdAt,
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
            username: true,
            fullName: true,
          },
        },
      },
    });

    return {
      id: updatedComment.id,
      isPinned: updatedComment.isPinned,
      user: updatedComment.user,
    };
  }
}

