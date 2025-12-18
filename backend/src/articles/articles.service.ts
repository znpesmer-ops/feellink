import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostsGateway } from '../posts/posts.gateway';
import { ArticlesGateway } from './articles.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PostsGateway))
    private postsGateway: PostsGateway,
    @Inject(forwardRef(() => ArticlesGateway))
    private articlesGateway: ArticlesGateway,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, title: string, content: string, coverImage?: string, excerpt?: string, publish: boolean = false, scheduledAt?: Date) {
    try {
      const article = await this.prisma.article.create({
        data: {
          title,
          content,
          coverImage,
          excerpt: excerpt || content.slice(0, 200) + (content.length > 200 ? '...' : ''),
          isPublished: publish && !scheduledAt, // Eğer zamanlanmışsa henüz yayınlama
          scheduledAt: scheduledAt || null,
          authorId: userId,
        },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

      // Socket.IO ile gerçek zamanlı güncelleme (sadece hemen yayınlanan yazılar için)
      // Zamanlanmış yazılar cron job tarafından yayınlanacak
      if (publish && !scheduledAt && this.postsGateway) {
        this.postsGateway.server.emit('articleCreated', article);
      }

      return article;
    } catch (error: any) {
      console.error('ARTICLE_SERVICE_CREATE_ERROR:', error?.message, error);
      throw error;
    }
  }

  async findDrafts(userId: string) {
    return this.prisma.article.findMany({
      where: { 
        authorId: userId, 
        isPublished: false,
        scheduledAt: null, // Taslaklar: scheduledAt olmayanlar
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findScheduled(userId: string) {
    return this.prisma.article.findMany({
      where: { 
        authorId: userId, 
        isPublished: false,
        scheduledAt: { not: null }, // Zamanlanmış: scheduledAt olanlar
      },
      orderBy: { scheduledAt: 'asc' }, // En yakın tarihli önce
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findPublished(userId: string) {
    return this.prisma.article.findMany({
      where: { authorId: userId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });
  }

  async publish(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException('Bu yazıyı yayınlama yetkiniz yok');
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: { isPublished: true },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

    // Socket.IO ile gerçek zamanlı güncelleme
    if (this.postsGateway) {
      this.postsGateway.server.emit('articleCreated', updated);
    }

    return updated;
  }

  async findAllPublic() {
    return this.prisma.article.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    const articles = await this.prisma.article.findMany({
      where: { authorId: userId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

    // Placeholder for likes and comments count (TODO: ArticleLike ve ArticleComment modelleri eklendiğinde güncelle)
    return articles.map((article) => ({
      ...article,
      views: article.views || 0,
      _count: {
        likes: 0,
        comments: 0,
      },
    }));
  }

  async findMyArticles(userId: string) {
    return this.prisma.article.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
        comments: {
          where: {
            parentId: null, // Sadece ana yorumları getir (reply'lar dahil değil)
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                fullName: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                    fullName: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // CDN URL'leri için comment'leri düzenle ve user'ı author'a map et
    const CDN_BASE = process.env.CDN_BASE_URL || 
      `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET_NAME}`;
    
    const formattedComments = article.comments.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user.id,
        username: comment.user.username,
        avatar: comment.user.avatar
          ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`)
          : null,
        fullName: comment.user.fullName,
      },
      replies: comment.replies ? comment.replies.map((reply: any) => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        author: {
          id: reply.user.id,
          username: reply.user.username,
          avatar: reply.user.avatar
            ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`)
            : null,
          fullName: reply.user.fullName,
        },
      })) : [],
    }));

    return {
      ...article,
      views: article.views || 0,
      _count: {
        likes: 0,
        comments: article._count.comments,
      },
      comments: formattedComments,
    };
  }

  async update(id: string, userId: string, data: { title?: string; content?: string; coverImage?: string; excerpt?: string; scheduledAt?: Date }) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException('Bu yazıyı düzenleme yetkiniz yok');
    }

    // Eğer scheduledAt varsa ve yazı henüz yayınlanmamışsa, scheduledAt'ı güncelle
    // Eğer yazı zaten yayınlanmışsa scheduledAt'ı güncelleyemeyiz
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    // scheduledAt varsa ve yazı henüz yayınlanmamışsa
    if (data.scheduledAt && !article.isPublished) {
      updateData.scheduledAt = data.scheduledAt;
      // Zamanlanmış yazılar henüz yayınlanmamalı
      updateData.isPublished = false;
    } else if (data.scheduledAt === undefined) {
      // scheduledAt undefined ise mevcut değeri koru
      delete updateData.scheduledAt;
    } else if (data.scheduledAt === null && !article.isPublished) {
      // scheduledAt null ise zamanlamayı kaldır
      updateData.scheduledAt = null;
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

    // Eğer yazı yayınlanmışsa Socket.IO ile güncelleme bildir
    if (updated.isPublished && this.postsGateway) {
      this.postsGateway.server.emit('articleUpdated', updated);
    }

    return updated;
  }

  async delete(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenException('Bu yazıyı silme yetkiniz yok');
    }

    await this.prisma.article.delete({
      where: { id },
    });

    // Socket.IO ile gerçek zamanlı güncelleme
    if (this.postsGateway) {
      this.postsGateway.server.emit('articleDeleted', { id });
    }

    return { success: true };
  }

  async incrementView(id: string) {
    await this.prisma.article.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  }

  async createComment(articleId: string, userId: string, content: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const CDN_BASE = process.env.CDN_BASE_URL || 
      `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET_NAME}`;

    const comment = await this.prisma.articleComment.create({
      data: {
        articleId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

    // user'ı author'a map et ve CDN URL'lerini ekle
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user.id,
        username: comment.user.username,
        avatar: comment.user.avatar
          ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`)
          : null,
        fullName: comment.user.fullName,
      },
    };

    // 🔔 Bildirim oluştur (gönderi sahibine)
    if (article.authorId !== userId && this.notificationsService) {
      await this.notificationsService.createNotificationSync({
        userId: article.authorId,
        type: 'comment',
        message: `${comment.user.username} yazına yorum yaptı: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        fromUserId: userId,
        articleId: articleId,
        commentId: comment.id,
        targetUrl: `/articles/${articleId}#cmt-${comment.id}`,
      });

      console.log(`🔔 Notification created for article author: ${article.authorId}`);
    }

    // 🔔 Real-time yayın - Socket.IO ile yorum güncellemesi
    if (this.articlesGateway) {
      const room = `article_${articleId}`;
      this.articlesGateway.server.to(room).emit('commentAdded', formattedComment);
      
      // Article listesinde yorum sayısını güncelle
      const commentsCount = await this.prisma.articleComment.count({
        where: { articleId },
      });
      
      this.articlesGateway.server.emit('articleUpdated', {
        id: articleId,
        _count: {
          likes: 0, // Article like yok, sadece comment like var
          comments: commentsCount,
        },
      });
      
      console.log(`💬 Comment added to article ${articleId}: ${comment.id}`);
    }

    return formattedComment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    await this.prisma.articleComment.delete({
      where: { id: commentId },
    });

    // 🔔 Real-time yayın - Socket.IO ile yorum silme
    if (this.articlesGateway) {
      const room = `article_${comment.articleId}`;
      this.articlesGateway.server.to(room).emit('commentDeleted', { id: commentId });
      
      // Article listesinde yorum sayısını güncelle
      const commentsCount = await this.prisma.articleComment.count({
        where: { articleId: comment.articleId },
      });
      
      this.articlesGateway.server.emit('articleUpdated', {
        id: comment.articleId,
        _count: {
          likes: 0,
          comments: commentsCount,
        },
      });
      
      console.log(`🗑️ Comment deleted: ${commentId}`);
    }

    return { success: true };
  }

  async createReply(commentId: string, userId: string, content: string) {
    const parentComment = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!parentComment) {
      throw new NotFoundException('Parent comment not found');
    }

    const CDN_BASE = process.env.CDN_BASE_URL || 
      `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET_NAME}`;

    const reply = await this.prisma.articleComment.create({
      data: {
        articleId: parentComment.articleId,
        userId,
        content,
        parentId: commentId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

    // user'ı author'a map et ve CDN URL'lerini ekle
    const formattedReply = {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      parentId: reply.parentId,
      author: {
        id: reply.user.id,
        username: reply.user.username,
        avatar: reply.user.avatar
          ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`)
          : null,
        fullName: reply.user.fullName,
      },
    };

    // 🔔 Bildirim oluştur (yorum sahibine)
    if (parentComment.userId !== userId && this.notificationsService) {
      await this.notificationsService.createNotificationSync({
        userId: parentComment.userId,
        type: 'reply',
        message: `${reply.user.username} yorumuna yanıt verdi: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        fromUserId: userId,
        articleId: parentComment.articleId,
        commentId: reply.id,
        targetUrl: `/articles/${parentComment.articleId}#cmt-${reply.id}`,
      });

      console.log(`🔔 Reply notification created for comment author: ${parentComment.userId}`);
    }

    // 🔔 Real-time yayın - Socket.IO ile reply güncellemesi
    if (this.articlesGateway) {
      const room = `article_${parentComment.articleId}`;
      this.articlesGateway.server.to(room).emit('replyAdded', {
        ...formattedReply,
        parentId: commentId,
      });
      console.log(`💬 Reply added to comment ${commentId}: ${reply.id}`);
    }

    return formattedReply;
  }

  async toggleCommentLike(commentId: string, userId: string) {
    // Yorumun var olup olmadığını kontrol et
    const comment = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, username: true },
        },
        article: {
          select: { id: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Kullanıcı daha önce beğenmiş mi?
    const existingLike = await this.prisma.articleCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Beğenmeyi kaldır
      await this.prisma.articleCommentLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      // Beğeniyi ekle
      await this.prisma.articleCommentLike.create({
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
          articleId: comment.articleId,
          commentId: commentId,
          targetUrl: `/articles/${comment.articleId}#cmt-${commentId}`,
        });

        console.log(`🔔 Article comment like notification created for comment author: ${comment.userId}`);
      }
    }

    // Güncel beğeni sayısını al
    const likesCount = await this.prisma.articleCommentLike.count({
      where: { commentId },
    });

    return {
      liked: !existingLike,
      likesCount,
    };
  }

  /**
   * En Çok Beğenilen Yazarlar - En çok görüntülenen (views) yazıların yazarları
   * Aynı yazar birden fazla yazıda olsa bile tek satır
   */
  async getTopLikedAuthors(limit: number = 4) {
    // 1) Published yazıları views'a göre sırala
    // authorId zaten required field olduğu için null olamaz, filtrelemeye gerek yok
    const articles = await this.prisma.article.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        views: true,
        authorId: true,
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        views: 'desc',
      },
      take: 100, // İlk 100 yazıyı al, sonra yazarları tekilleştir
    });

    // 2) Aynı yazarı tekilleştir (ilk görünen yazıya göre)
    const uniqueAuthors = new Map<string, {
      id: string;
      username: string;
      fullName: string | null;
      avatar: string | null;
      totalViews: number;
    }>();

    for (const article of articles) {
      if (article.authorId && !uniqueAuthors.has(article.authorId)) {
        uniqueAuthors.set(article.authorId, {
          id: article.author.id,
          username: article.author.username,
          fullName: article.author.fullName,
          avatar: article.author.avatar,
          totalViews: article.views,
        });
      } else if (article.authorId && uniqueAuthors.has(article.authorId)) {
        // Toplam views'ı güncelle
        const existing = uniqueAuthors.get(article.authorId)!;
        existing.totalViews += article.views;
      }
      if (uniqueAuthors.size === limit) break;
    }

    // 3) Toplam views'a göre tekrar sırala
    const sortedAuthors = Array.from(uniqueAuthors.values())
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, limit);

    return sortedAuthors.map((author) => ({
      id: author.id,
      username: author.username,
      name: author.fullName || author.username,
      avatar: author.avatar,
    }));
  }

}

