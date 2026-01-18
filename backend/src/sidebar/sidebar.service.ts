import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SidebarGateway } from './sidebar.gateway';
import { ArticlesService } from '../articles/articles.service';

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
    @Inject(forwardRef(() => ArticlesService))
    private articlesService: ArticlesService,
  ) {}

  /**
   * Ayın Müzeleri - Sadece kurumsal hesaplar (corporate role)
   * Metrikler: Görüntülenme, Etkileşim, İçerik, Takipçi Artışı
   */
  async getFeaturedMuseums() {
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

    // Son 30 günün başlangıç tarihi
    const since = new Date();
    since.setDate(since.getDate() - 30);

    // Sadece corporate role'lü aktif kullanıcıları getir
    const corporateUsers = await this.prisma.user.findMany({
      where: {
        roles: {
          has: 'corporate',
        },
        isPrivate: false, // Sadece public hesaplar
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        followerCount: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            articles: true,
          },
        },
      },
    });

    if (corporateUsers.length === 0) {
      return [];
    }

    // Her kurumsal kullanıcı için metrikleri hesapla
    const museumsWithScores = await Promise.all(
      corporateUsers.map(async (user) => {
        // Son 30 gün içindeki postlar
        const recentPosts = await this.prisma.post.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: since },
          },
          include: {
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        });

        // Son 30 gün içindeki yayınlanmış yazılar
        const recentArticles = await this.prisma.article.findMany({
          where: {
            authorId: user.id,
            isPublished: true,
            createdAt: { gte: since },
          },
          include: {
            _count: {
              select: {
                comments: true,
              },
            },
          },
        });

        // Metrikler
        // Görüntülenme: Sadece article views (Post model'de views yok)
        const monthlyViews = recentArticles.reduce(
          (sum, article) => sum + (article.views || 0),
          0,
        );

        // Etkileşim: Likes + Comments
        const monthlyLikes = recentPosts.reduce(
          (sum, post) => sum + post._count.likes,
          0,
        );

        const monthlyComments =
          recentPosts.reduce((sum, post) => sum + post._count.comments, 0) +
          recentArticles.reduce(
            (sum, article) => sum + article._count.comments,
            0,
          );

        // Yayınlanan içerik sayısı
        const monthlyPosts = recentPosts.length + recentArticles.length;

        // Takipçi sayısı (basitleştirilmiş - gerçek uygulamada growth hesaplanabilir)
        const followerCount = user.followerCount || 0;

        // Skor hesaplama (normalize edilmiş)
        // Görüntülenme: 0.4, Etkileşim: 0.3, İçerik: 0.2, Takipçi: 0.1
        const score =
          monthlyViews * 0.4 +
          (monthlyLikes + monthlyComments) * 0.3 +
          monthlyPosts * 0.2 +
          followerCount * 0.1;

        return {
          id: user.id,
          username: user.username,
          name: user.fullName || user.username,
          avatar: resolveImageUrl(user.avatar, DEFAULT_AUTHOR_AVATAR),
          score,
          monthlyViews,
          monthlyLikes,
          monthlyComments,
          monthlyPosts,
          followerCount: user.followerCount,
        };
      }),
    );

    // Skora göre sırala ve en iyi 4'ü al
    const topMuseums = museumsWithScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((museum, index) => {
        // Gradient renkleri (sıraya göre)
        const colors = [
          'from-[#f97316]/80 to-[#fbbf24]/60',
          'from-[#fb923c]/80 to-[#fed7aa]/60',
          'from-[#fcd34d]/80 to-[#fde68a]/60',
          'from-[#f59e0b]/80 to-[#fcd34d]/60',
        ];

        return {
          id: museum.id,
          username: museum.username,
          name: museum.name,
          image: museum.avatar,
          color: colors[index] || colors[0],
        };
      });

    return topMuseums;
  }

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

    // Ayın Müzeleri - Otomatik hesaplanan kurumsal hesaplar
    const museums = await this.getFeaturedMuseums();

    // ✅ Aktif Yazarlar - En çok görüntülenen yazıların yazarları (top 4)
    const topLikedAuthors = await this.articlesService.getTopLikedAuthors(4);
    
    // Sidebar formatına dönüştür
    const authors = topLikedAuthors.map((writer) => ({
      id: writer.id,
      slug: writer.username,
      name: writer.name,
      avatar: resolveImageUrl(writer.avatar, DEFAULT_AUTHOR_AVATAR),
      preview: '', // Grid yapısında preview gerekmez
      bio: '',
      lastPost: {
        title: '',
        preview: '',
        link: `/profile/${writer.username}`,
      },
    }));

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

  // 🔥 Explore sidebar için güncel yazılar (takip edilmeyen kullanıcıların yayınlanmış yazıları)
  async getExplorePosts(userId: string, limit: number = 5) {
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

    // Kullanıcının takip ettiği kişileri al
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId); // Kendi hesabını da hariç tut

    // Önce: Takip edilmeyen kullanıcıların içeriklerini getir (hem Post hem Article)
    // 1. Articles (yayınlanmış)
    const articles = await this.prisma.article.findMany({
      where: {
        isPublished: true,
        author: {
          id: { notIn: followingIds },
          isPrivate: false,
          isDeleted: { not: true }, // 🔒 Hide only truly deleted users
          accountStatus: { not: 'SUSPENDED' }, // 🔒 Hide only suspended users
        },
      },
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit * 2, // Daha fazla çek, sonra birleştirip sıralayacağız
    });

    // 2. Posts (tüm postlar yayınlanmış sayılır - caption'ı olan veya olmayan tüm postlar)
    const posts = await this.prisma.post.findMany({
      where: {
        user: {
          id: { notIn: followingIds },
          isPrivate: false,
          isDeleted: { not: true }, // 🔒 Hide only truly deleted users
          accountStatus: { not: 'SUSPENDED' }, // 🔒 Hide only suspended users
        },
        // Caption kontrolünü kaldırdık - tüm postlar dahil (caption boş olsa bile)
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit * 2,
    });

    // 3. Birleştir ve tarihe göre sırala
    const combinedContent = [
      ...articles.map((article) => ({
        type: 'article' as const,
        id: article.id,
        title: article.title,
        preview: article.excerpt || article.content?.substring(0, 60) + '...' || 'Yazıyı oku...',
        link: `/articles/${article.id}`,
        createdAt: article.createdAt,
        author: article.author,
      })),
      ...posts
        .filter((post) => post.caption && post.caption.trim().length > 0) // Sadece caption'ı olan postları filtrele
        .map((post) => ({
          type: 'post' as const,
          id: post.id,
          title: post.caption?.substring(0, 50) + (post.caption && post.caption.length > 50 ? '...' : '') || 'Gönderi',
          preview: post.caption || 'Gönderiyi gör...',
          link: `/feed?post=${post.id}`, // PostModal için feed route kullan
          createdAt: post.createdAt,
          author: post.user,
        })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    // Fallback: Eğer takip edilmeyen kullanıcıların içerikleri yoksa, en güncel içerikleri getir
    if (combinedContent.length === 0) {
      const fallbackArticles = await this.prisma.article.findMany({
        where: {
          isPublished: true,
          author: {
            isPrivate: false,
          },
        },
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
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      const fallbackPosts = await this.prisma.post.findMany({
        where: {
          user: {
            isPrivate: false,
          },
          // Caption kontrolünü kaldırdık
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
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      const fallbackCombined = [
        ...fallbackArticles.map((article) => ({
          type: 'article' as const,
          id: article.id,
          title: article.title,
          preview: article.excerpt || article.content?.substring(0, 60) + '...' || 'Yazıyı oku...',
          link: `/articles/${article.id}`,
          createdAt: article.createdAt,
          author: article.author,
        })),
        ...fallbackPosts
          .filter((post) => post.caption && post.caption.trim().length > 0) // Sadece caption'ı olan postları filtrele
          .map((post) => ({
            type: 'post' as const,
            id: post.id,
            title: post.caption?.substring(0, 50) + (post.caption && post.caption.length > 50 ? '...' : '') || 'Gönderi',
            preview: post.caption || 'Gönderiyi gör...',
            link: `/feed?post=${post.id}`, // PostModal için feed route kullan
            createdAt: post.createdAt,
            author: post.user,
          })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);

      // Fallback içeriği sidebar formatına dönüştür
      return fallbackCombined.map((item) => ({
        id: item.id,
        slug: item.author.username,
        name: item.author.fullName || item.author.username,
        avatar: resolveImageUrl(item.author.avatar, DEFAULT_AUTHOR_AVATAR),
        preview: item.preview.length > 60 
          ? item.preview.substring(0, 60) + '...' 
          : item.preview,
        bio: item.preview || 'Yeni içerikler paylaşıyor.',
        lastPost: {
          title: item.title,
          preview: item.preview,
          link: item.link,
        },
      }));
    }

    // Yazıları sidebar formatına dönüştür
    return combinedContent.map((item) => ({
      id: item.id,
      slug: item.author.username,
      name: item.author.fullName || item.author.username,
      avatar: resolveImageUrl(item.author.avatar, DEFAULT_AUTHOR_AVATAR),
      preview: item.preview.length > 60 
        ? item.preview.substring(0, 60) + '...' 
        : item.preview,
      bio: item.preview || 'Yeni içerikler paylaşıyor.',
      lastPost: {
        title: item.title,
        preview: item.preview,
        link: item.link,
      },
    }));
  }

  /**
   * Ayın Öne Çıkanları - 4 kategori için dinamik veri
   * 1. Ayın Müzesi (Kurumsal hesap)
   * 2. Ayın Eseri (En çok etkileşim alan eser)
   * 3. Ayın Yorumu (En çok beğeni alan yorum)
   * 4. Ayın Koleksiyoncusu (Koleksiyoner hesap)
   */
  async getFeaturedHighlights() {
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

    const DEFAULT_AVATAR =
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80';

    // 1️⃣ Ayın Müzesi - En çok etkileşim alan kurumsal hesap
    const corporateUsers = await this.prisma.user.findMany({
      where: {
        roles: {
          has: 'corporate',
        },
        isPrivate: false,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
      },
    });

    let featuredMuseum = null;
    if (corporateUsers.length > 0) {
      // Her kurumsal hesabın toplam etkileşimini hesapla
      const museumScores = await Promise.all(
        corporateUsers.map(async (user) => {
          // Post etkileşimleri
          const posts = await this.prisma.post.findMany({
            where: { userId: user.id },
            include: {
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          });

          const postInteractions = posts.reduce(
            (sum, post) => sum + post._count.likes + post._count.comments,
            0,
          );

          // Article etkileşimleri
          const articles = await this.prisma.article.findMany({
            where: {
              authorId: user.id,
              isPublished: true,
            },
            include: {
              _count: {
                select: {
                  comments: true,
                },
              },
            },
          });

          const articleInteractions = articles.reduce(
            (sum, article) => sum + (article.views || 0) + article._count.comments,
            0,
          );

          return {
            user,
            score: postInteractions + articleInteractions,
          };
        }),
      );

      const topMuseum = museumScores.sort((a, b) => b.score - a.score)[0];
      if (topMuseum && topMuseum.score > 0) {
        featuredMuseum = {
          name: topMuseum.user.fullName || topMuseum.user.username,
          username: topMuseum.user.username,
          imageUrl: resolveImageUrl(topMuseum.user.avatar, DEFAULT_AVATAR),
        };
      }
    }

    // 2️⃣ Ayın Eseri - En çok etkileşim alan eser (artwork type post)
    const artworks = await this.prisma.post.findMany({
      where: {
        type: 'artwork',
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        media: {
          take: 1,
          select: { url: true },
        },
        savedBy: true,
      },
    });

    let featuredArtwork = null;
    if (artworks.length > 0) {
      const artworkScores = artworks.map((artwork) => ({
        artwork,
        score:
          artwork._count.likes +
          artwork._count.comments +
          artwork.savedBy.length,
      }));

      const topArtwork = artworkScores.sort((a, b) => b.score - a.score)[0];
      if (topArtwork && topArtwork.score > 0) {
        featuredArtwork = {
          title: topArtwork.artwork.title || topArtwork.artwork.caption || 'Eser',
          postId: topArtwork.artwork.id,
          imageUrl: topArtwork.artwork.media[0]?.url
            ? resolveImageUrl(topArtwork.artwork.media[0].url, DEFAULT_AVATAR)
            : DEFAULT_AVATAR,
        };
      }
    }

    // 3️⃣ Ayın Yorumu - En çok beğeni alan yorum
    const comments = await this.prisma.comment.findMany({
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Son 100 yorumdan en çok beğenilen
    });

    let featuredComment = null;
    if (comments.length > 0) {
      const topComment = comments
        .sort((a, b) => b._count.likes - a._count.likes)
        .find((c) => c._count.likes > 0);

      if (topComment) {
        featuredComment = {
          text: topComment.content,
          commentId: topComment.id,
          postId: topComment.postId,
          username: topComment.user.username,
          fullName: topComment.user.fullName || topComment.user.username,
        };
      }
    }

    // 4️⃣ Ayın Koleksiyoncusu - En çok etkileşim alan koleksiyoner
    const collectors = await this.prisma.user.findMany({
      where: {
        roles: {
          has: 'collector',
        },
        isPrivate: false,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
      },
    });

    let featuredCollector = null;
    if (collectors.length > 0) {
      const collectorScores = await Promise.all(
        collectors.map(async (collector) => {
          // Post etkileşimleri
          const posts = await this.prisma.post.findMany({
            where: { userId: collector.id },
            include: {
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          });

          const postInteractions = posts.reduce(
            (sum, post) => sum + post._count.likes + post._count.comments,
            0,
          );

          // Collection sayısı (ownerId kontrolü)
          const collections = await this.prisma.collection.count({
            where: { ownerId: collector.id },
          });

          return {
            collector,
            score: postInteractions + collections * 10, // Collection bonus
          };
        }),
      );

      const topCollector = collectorScores.sort((a, b) => b.score - a.score)[0];
      if (topCollector && topCollector.score > 0) {
        featuredCollector = {
          name: topCollector.collector.fullName || topCollector.collector.username,
          username: topCollector.collector.username,
          imageUrl: resolveImageUrl(topCollector.collector.avatar, DEFAULT_AVATAR),
        };
      }
    }

    return {
      museum: featuredMuseum,
      artwork: featuredArtwork,
      comment: featuredComment,
      collector: featuredCollector,
    };
  }
}

