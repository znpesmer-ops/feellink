import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SidebarGateway } from './sidebar.gateway';

const MUSEUM_IMAGE_MAP: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  2: 'https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=800&q=80',
  3: 'https://images.unsplash.com/photo-1522780209446-8a0e1a942334?auto=format&fit=crop&w=800&q=80',
  4: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
};

const DEFAULT_AUTHOR_AVATAR =
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80';

const DEFAULT_ARTICLE_IMAGE =
  'https://images.unsplash.com/photo-1526481280695-3c469b8c66b4?auto=format&fit=crop&w=960&q=80';

@Injectable()
export class SidebarService {
  constructor(
    private prisma: PrismaService,
    private gateway: SidebarGateway,
  ) {}

  async getGlobalData() {
    const resolveImageUrl = (
      image: string | null | undefined,
      fallback: string,
    ): string => {
      if (!image || image.trim() === '') {
        return fallback;
      }

      if (image.startsWith('http')) {
        if (image.includes('localhost:3000')) {
          return fallback;
        }
        return image;
      }

      const cdnBase = process.env.CDN_BASE_URL;
      if (cdnBase) {
        return `${cdnBase}${image.startsWith('/') ? image : `/${image}`}`;
      }

      return fallback;
    };

    // 🔥 En Çok Görüntülenen Yazılar - veritabanından gerçek veri
    const topViewedArticles = await this.prisma.article.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        views: 'desc',
      },
      take: 5,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });

    // ✅ Ayın Yazarları - Son 30 gün içinde en çok gönderi paylaşan kullanıcılar
    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Son 30 gün içinde gönderi paylaşan kullanıcıları grupla ve say
    const postsByUser = await this.prisma.post.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: since,
        },
        type: 'post', // Sadece normal gönderiler (eserler değil)
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 2, // En çok paylaşan 2 kullanıcı
    });

    // Top 2 kullanıcı ID'lerini al
    const topWriterIds = postsByUser.map((p) => p.userId);

    // Bu kullanıcıların detaylarını çek
    const topWritersMap = new Map();
    if (topWriterIds.length > 0) {
      const writers = await this.prisma.user.findMany({
        where: {
          id: { in: topWriterIds },
          isPrivate: false, // Sadece public hesaplar
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          bio: true,
        },
      });
      
      // Map'e ekle (hızlı lookup için)
      writers.forEach((writer) => {
        topWritersMap.set(writer.id, writer);
      });
    }

    // Sıralamayı düzelt (postsByUser sırasına göre - en çok paylaşan ilk sırada)
    const sortedWriters = topWriterIds
      .map((userId) => topWritersMap.get(userId))
      .filter((w) => w !== undefined);

    // Ayın Müzeleri - sabit veri
    const museums = [
      { 
        id: 1, 
        name: 'İstanbul Modern', 
        image: MUSEUM_IMAGE_MAP[1],
        color: 'from-[#f97316]/80 to-[#fbbf24]/60'
      },
      { 
        id: 2, 
        name: 'Pera Müzesi', 
        image: MUSEUM_IMAGE_MAP[2],
        color: 'from-[#fb923c]/80 to-[#fed7aa]/60'
      },
      { 
        id: 3, 
        name: 'Odunpazarı Müzesi', 
        image: MUSEUM_IMAGE_MAP[3],
        color: 'from-[#fcd34d]/80 to-[#fde68a]/60'
      },
      { 
        id: 4, 
        name: 'Sabancı Müzesi', 
        image: MUSEUM_IMAGE_MAP[4],
        color: 'from-[#f59e0b]/80 to-[#fcd34d]/60'
      },
    ];

    // Son yazılarını al (her yazar için)
    const authorsWithLastPost = await Promise.all(
      sortedWriters.map(async (writer) => {
        // Bu yazarın son yazısını (article) bul
        const lastArticle = await this.prisma.article.findFirst({
          where: {
            authorId: writer.id,
            isPublished: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            excerpt: true,
          },
        });

        return {
          id: writer.id,
          slug: writer.username,
          name: writer.fullName || writer.username,
          avatar: resolveImageUrl(writer.avatar, DEFAULT_AUTHOR_AVATAR),
          preview: writer.bio 
            ? (writer.bio.length > 60 ? writer.bio.substring(0, 60) + '...' : writer.bio)
            : (sortedWriters.indexOf(writer) === 0 
                ? 'Duyguların izi her eserde saklıdır.' 
                : 'Bellek, malzeme ve zamanın sessiz diyaloğu.'),
          bio: writer.bio || 'Sanat ve yaratıcılık üzerine yazılar.',
          lastPost: lastArticle
            ? {
                title: lastArticle.title,
                preview: lastArticle.excerpt || 'Son yazılarını keşfet...',
                link: `/articles/${lastArticle.id}`,
              }
            : {
                title: 'Son Yazı',
                preview: 'Son yazılarını keşfet...',
                link: `/profile/${writer.username}`,
              },
        };
      })
    );

    // Fallback: Eğer yeterli yazar yoksa sabit verileri kullan
    const authors = authorsWithLastPost.length >= 2 
      ? authorsWithLastPost
      : [
          {
            id: 'zeynep',
            slug: 'zeynep',
            name: 'Zeynep Esmer',
            avatar: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=320&q=80',
            preview: 'Duyguların izi her eserde saklıdır.',
            bio: 'Çağdaş sanat pratiklerinde hafıza, duygu ve materyal ilişkisini araştıran bir sanatçı ve yazar. Feellink\'in kurucu üyelerindendir.',
            lastPost: {
              title: 'Duyguların Malzemesi: Hafıza ve Nesneler Arasında',
              preview: 'Nesneler yalnızca fiziksel değil, duygusal taşıyıcılardır. Her malzeme, geçmişten bugüne bir iz taşır. Bu yazı, sanatın duygusal hafızayı nasıl görünür kıldığını inceliyor...',
              link: '/writer/zeynep',
            },
          },
          {
            id: 'sude',
            slug: 'sude',
            name: 'Sude Esmer',
            avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=320&q=80',
            preview: 'Bellek, malzeme ve zamanın sessiz diyaloğu.',
            bio: 'Atık malzeme ve kültürel bellek temalı üretim yapan bir sanatçı. Yazılarında sürdürülebilirlik, çevre etiği ve toplumsal hafıza üzerine odaklanır.',
            lastPost: {
              title: 'Sessiz Dönüşüm: Atığın Estetiği',
              preview: 'Bir atığın güzelliğini görebilmek, yalnızca çevresel değil, etik bir farkındalıktır. Bu yazıda sanat ve atık arasındaki görünmez estetik diyaloğu keşfediyoruz...',
              link: '/writer/sude',
            },
          },
        ];

    return {
      museums,
      authors,
      topLikedArticles: topViewedArticles.map(article => ({
        id: article.id,
        title: article.title,
        coverImage: resolveImageUrl(article.coverImage, DEFAULT_ARTICLE_IMAGE),
        totalLikes: article.views, // Görüntülenme sayısını göster (geçici)
        author: {
          id: article.author.id,
          username: article.author.username,
          fullName: article.author.fullName,
          avatar: resolveImageUrl(article.author.avatar, DEFAULT_AUTHOR_AVATAR),
        },
      })),
    };
  }

  // Admin panelinden veya cron jobdan çağrılabilir
  async updateSidebarData() {
    const newData = await this.getGlobalData();
    this.gateway.broadcastSidebarUpdate(newData);
    return newData;
  }
}

