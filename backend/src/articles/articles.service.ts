import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostsGateway } from '../posts/posts.gateway';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PostsGateway))
    private postsGateway: PostsGateway,
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
      where: { authorId: userId, isPublished: false },
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
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Like ve comment sayıları için placeholder (şimdilik 0)
    // TODO: ArticleLike ve ArticleComment modelleri eklendiğinde burayı güncelle
    return {
      ...article,
      views: article.views || 0,
      _count: {
        likes: 0,
        comments: 0,
      },
      comments: [],
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
}

