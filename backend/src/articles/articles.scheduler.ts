import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PostsGateway } from '../posts/posts.gateway';

@Injectable()
export class ArticleScheduler {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PostsGateway))
    private postsGateway: PostsGateway,
  ) {}

  // ⏰ Her dakika kontrol et (zamanlanmış yazıları yayınla)
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledArticles() {
    try {
      // PrismaService'in inject edildiğinden emin ol
      if (!this.prisma) {
        console.error('❌ Scheduler: PrismaService not available');
        return;
      }

      const now = new Date();

      // Zamanı gelen ama henüz yayınlanmamış yazılar
      const articles = await this.prisma.article.findMany({
      where: {
        isPublished: false,
        scheduledAt: {
          lte: now, // scheduledAt şu anki zamandan küçük veya eşit
          not: null, // scheduledAt null değil
        },
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

    if (articles.length === 0) {
      return; // Yayınlanacak yazı yok
    }

    for (const article of articles) {
      // Yazıyı yayınla
      const published = await this.prisma.article.update({
        where: { id: article.id },
        data: {
          isPublished: true,
          scheduledAt: null, // scheduledAt'ı temizle
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

      // Socket.IO ile gerçek zamanlı güncelleme
      if (this.postsGateway) {
        this.postsGateway.server.emit('articleCreated', published);
      }

      console.log(`🕒 Zamanlanmış yazı yayınlandı: ${article.title} (${article.id})`);
    }
    } catch (error: any) {
      console.error('❌ Scheduler: Error publishing scheduled articles:', error?.message);
    }
  }
}

