import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get visit statistics for a corporate user
   * Based on interactions (likes, comments, event participations) on their content
   * @param dateRange - 'today' | '7d' | '30d' (default: '30d')
   */
  async getVisitStats(userId: string, dateRange: 'today' | '7d' | '30d' = '30d') {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Get all posts by this corporate user
    const userPosts = await this.prisma.post.findMany({
      where: { userId },
      select: { id: true, createdAt: true },
    });

    const postIds = userPosts.map((p) => p.id);

    // Get interactions grouped by date
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    });

    const comments = await this.prisma.comment.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    });

    // Get event participations
    const userEvents = await this.prisma.event.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const eventIds = userEvents.map((e) => e.id);

    const eventParticipations = await this.prisma.eventParticipant.findMany({
      where: {
        eventId: { in: eventIds },
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    });

    // Combine all interactions
    const allInteractions = [
      ...likes.map((l) => l.createdAt),
      ...comments.map((c) => c.createdAt),
      ...eventParticipations.map((ep) => ep.createdAt),
    ];

    // Group by date
    const dateMap = new Map<string, number>();
    allInteractions.forEach((date) => {
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
    });

    // Generate date range based on selection
    const result = [];
    let daysToGenerate = 30;
    
    if (dateRange === 'today') {
      // Today only - hourly breakdown
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let h = 0; h < 24; h++) {
        const hourDate = new Date(today);
        hourDate.setHours(h);
        const hourStr = `${hourDate.toISOString().split('T')[0]}T${String(h).padStart(2, '0')}:00:00`;
        result.push({
          date: hourStr,
          count: Array.from(dateMap.entries())
            .filter(([d]) => {
              const dDate = new Date(d);
              return dDate.getHours() === h && dDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
            })
            .reduce((sum, [, count]) => sum + count, 0),
        });
      }
      return result;
    } else if (dateRange === '7d') {
      daysToGenerate = 7;
    }

    // Generate days
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  /**
   * Get top words from comments on corporate user's posts and events
   */
  async getTopWords(userId: string) {
    // Get comments on user's posts
    const userPosts = await this.prisma.post.findMany({
      where: { userId },
      select: { id: true },
    });

    const postIds = userPosts.map((p) => p.id);

    const postComments = await this.prisma.comment.findMany({
      where: { postId: { in: postIds } },
      select: { content: true },
    });

    // Get comments on user's events
    const userEvents = await this.prisma.event.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const eventIds = userEvents.map((e) => e.id);

    const eventComments = await this.prisma.eventComment.findMany({
      where: { eventId: { in: eventIds } },
      select: { text: true },
    });

    // Combine all comments
    const allComments = [
      ...postComments.map((c) => c.content),
      ...eventComments.map((c) => c.text),
    ];

    // Count words (Turkish stop words excluded)
    const stopWords = new Set([
      'bir',
      'bu',
      'şu',
      'o',
      've',
      'ile',
      'için',
      'gibi',
      'kadar',
      'daha',
      'çok',
      'en',
      'da',
      'de',
      'ki',
      'mi',
      'mı',
      'mu',
      'mü',
      'ama',
      'fakat',
      'ancak',
      'lakin',
      'veya',
      'ya',
      'ya da',
      'hem',
      'ne',
      'mi',
      'mü',
      'için',
      'ile',
      'gibi',
      'kadar',
    ]);

    const wordMap = new Map<string, number>();

    allComments.forEach((comment) => {
      if (!comment) return;

      // Extract words (Turkish characters included)
      const words = comment
        .toLowerCase()
        .replace(/[^\wğüşıöçĞÜŞİÖÇ\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      words.forEach((word) => {
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      });
    });

    // Return top 20 words
    return Array.from(wordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Get top visitors (users who interact most with corporate user's content)
   */
  async getTopVisitors(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get user's posts and events
    const userPosts = await this.prisma.post.findMany({
      where: { userId },
      select: { id: true },
    });

    const postIds = userPosts.map((p) => p.id);

    const userEvents = await this.prisma.event.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const eventIds = userEvents.map((e) => e.id);

    // Get all interactions
    const likes = await this.prisma.like.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
    });

    const comments = await this.prisma.comment.findMany({
      where: {
        postId: { in: postIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
    });

    const eventComments = await this.prisma.eventComment.findMany({
      where: {
        eventId: { in: eventIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { authorId: true },
    });

    const eventParticipations = await this.prisma.eventParticipant.findMany({
      where: {
        eventId: { in: eventIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
    });

    // Count interactions per user (excluding the corporate user themselves)
    const userActivityMap = new Map<string, number>();

    [...likes, ...comments].forEach((item) => {
      const uid = item.userId;
      // 🚫 Kendini listeye dahil etme
      if (uid !== userId) {
        userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
      }
    });

    eventComments.forEach((item) => {
      const uid = item.authorId;
      // 🚫 Kendini listeye dahil etme
      if (uid !== userId) {
        userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
      }
    });

    eventParticipations.forEach((item) => {
      const uid = item.userId;
      // 🚫 Kendini listeye dahil etme
      if (uid !== userId) {
        userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
      }
    });

    // Get user details for top 10
    const sortedUsers = Array.from(userActivityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const users = await Promise.all(
      sortedUsers.map(async ([uid, count]) => {
        const user = await this.prisma.user.findUnique({
          where: { id: uid },
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        });

        if (!user) return null;

        return {
          username: user.username,
          avatar: user.avatar,
          fullName: user.fullName,
          activityCount: count,
        };
      }),
    );

    return users.filter((u) => u !== null);
  }

  /**
   * 🎟️ Etkinlik istatistikleri (bilet satışları ve yorumlar)
   * Kurumsal kullanıcının etkinliklerine ait bilet ve yorum verilerini döndürür
   */
  async getEventStats(userId: string) {
    const events = await this.prisma.event.findMany({
      where: { ownerId: userId },
      include: {
        tickets: {
          include: {
            purchases: {
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
              take: 5, // Son 5 bilet
            },
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return events.map((event) => {
      // Tüm biletlerden toplam satış sayısı
      const totalTicketSales = event.tickets.reduce((sum, ticket) => sum + ticket.sold, 0);

      // Son 5 bilet (tüm biletlerden son 5 satın alma)
      const allPurchases = event.tickets.flatMap((ticket) =>
        ticket.purchases.map((purchase) => ({
          username: purchase.user.username,
          fullName: purchase.user.fullName,
          avatar: purchase.user.avatar,
          createdAt: purchase.createdAt,
        }))
      );

      // Tarihe göre sırala ve son 5'i al
      const recentTickets = allPurchases
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      return {
        id: event.id,
        title: event.title,
        ticketCount: totalTicketSales,
        totalCapacity: event.tickets.reduce((sum, ticket) => sum + ticket.capacity, 0),
        commentCount: event.comments.length,
        recentTickets,
      };
    });
  }

  /**
   * 🎨 Kullanıcının tüm post'larından renk paleti verilerini çeker
   * Analiz sayfasında renk analizi kartı için kullanılır
   */
  async getColorPalette(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        colorPalette: {
          isEmpty: false,
        },
      },
      select: {
        colorPalette: true,
      },
    });

    // Tüm renkleri topla
    const allColors: Array<{ hex: string; rgb?: number[]; population?: number }> = [];
    
    posts.forEach((post) => {
      if (post.colorPalette && Array.isArray(post.colorPalette)) {
        const palette = post.colorPalette as any[];
        palette.forEach((color) => {
          if (color.hex || typeof color === 'string') {
            allColors.push({
              hex: color.hex || color,
              rgb: color.rgb,
              population: color.population,
            });
          }
        });
      }
    });

    // En çok kullanılan renkleri döndür (population'a göre sırala veya sıklığa göre)
    const colorFrequency = new Map<string, number>();
    allColors.forEach((color) => {
      colorFrequency.set(color.hex, (colorFrequency.get(color.hex) || 0) + (color.population || 1));
    });

    // En yüksek frequency'e sahip renkleri döndür
    return Array.from(colorFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([hex, frequency]) => ({
        hex,
        frequency,
      }));
  }

  /**
   * 🎨 Kullanıcıya en yakın 5 renk eşleşmesini bulur
   * ✅ SADECE ESER (artwork) renkleri kullanılır - Gönderiler (post) dahil edilmez
   * Diğer kullanıcıların eser renk paletleriyle karşılaştırır ve benzerlik skoru hesaplar
   * Sadece eser yükleyen kullanıcılar eşleştirmeye dahil edilir
   */
  async getTopColorMatches(userId: string) {
    try {
      // ✅ SADECE ESER (artwork) POST'LARINDAN RENK PALETİNİ TOPLA
      // Gönderiler (type: "post") dahil edilmeyecek
      const userArtworks = await this.prisma.post.findMany({
        where: {
          userId,
          type: 'artwork', // Sadece eserler
        },
        select: {
          colorPalette: true,
        },
      });

      const userColors: string[] = [];
      userArtworks.forEach((artwork) => {
        if (artwork.colorPalette && Array.isArray(artwork.colorPalette) && artwork.colorPalette.length > 0) {
          artwork.colorPalette.forEach((color: any) => {
            // Color string olabilir
            const colorStr = typeof color === 'string' ? color.trim().toUpperCase() : null;
            if (colorStr && colorStr.startsWith('#')) {
              if (!userColors.includes(colorStr)) {
                userColors.push(colorStr);
              }
            }
          });
        }
      });

      // Kullanıcının hiç eser rengi yoksa boş döndür
      if (userColors.length === 0) {
        return [];
      }

      // ✅ SADECE ESER (artwork) POST'LARINDAN RENK PALETLERİNİ ÇEK
      // Gönderiler (type: "post") tamamen dışarıda kalacak
      const artworksWithColors = await this.prisma.post.findMany({
        where: {
          userId: { not: userId }, // Kendini dahil etme
          type: 'artwork', // Sadece eserler
        },
        select: {
          userId: true,
          colorPalette: true,
        },
      });

      // Kullanıcılara göre ESER renk paletlerini grupla
      const userColorMap = new Map<string, string[]>();
      
      artworksWithColors.forEach((artwork) => {
        // Array kontrolü: boş array veya null kontrolü
        if (!artwork.colorPalette || !Array.isArray(artwork.colorPalette) || artwork.colorPalette.length === 0) {
          return;
        }

        if (!userColorMap.has(artwork.userId)) {
          userColorMap.set(artwork.userId, []);
        }

        const userColorsList = userColorMap.get(artwork.userId)!;
        artwork.colorPalette.forEach((color: any) => {
          const colorStr = typeof color === 'string' ? color.trim().toUpperCase() : null;
          if (colorStr && colorStr.startsWith('#') && !userColorsList.includes(colorStr)) {
            userColorsList.push(colorStr);
          }
        });
      });

      // ✅ SADECE ESER RENKLERİ OLAN KULLANICILARI ÇEK
      // Gönderisi olan ama eseri olmayan kullanıcılar bu listede olmayacak
      const userIdsWithArtworkColors = Array.from(userColorMap.keys()).filter(
        (id) => (userColorMap.get(id)?.length || 0) > 0,
      );

      if (userIdsWithArtworkColors.length === 0) {
        return [];
      }

      // ✅ SADECE ESER YÜKLEYEN KULLANICILARI GETİR
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIdsWithArtworkColors },
        },
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      });

      // Her kullanıcı için benzerlik hesapla
      const matches = users
        .map((user) => {
          const otherColors = userColorMap.get(user.id) || [];
          if (otherColors.length === 0) {
            return null;
          }

          try {
            // Renk benzerliği hesapla
            const similarity = this.calculateColorSimilarity(userColors, otherColors);

            if (!similarity || similarity.similarity === 0 || !similarity.commonColors) {
              return null;
            }

            return {
              userId: user.id,
              username: user.username || 'Unknown',
              avatar: user.avatar || null,
              similarity: Math.max(0, Math.min(100, Math.round(similarity.similarity))),
              commonColors: similarity.commonColors.slice(0, 3), // Max 3 renk
            };
          } catch (err) {
            console.error(`Error calculating similarity for user ${user.id}:`, err);
            return null;
          }
        })
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);

      return matches;
    } catch (error) {
      console.error('Error in getTopColorMatches:', error);
      // Hata durumunda boş array döndür (kullanıcı deneyimini bozmamak için)
      return [];
    }
  }

  /**
   * İki renk paleti arasındaki benzerliği hesaplar
   * RGB Euclidean distance kullanarak en yakın renk eşleşmelerini bulur
   */
  private calculateColorSimilarity(
    userColors: string[],
    otherColors: string[],
  ): { similarity: number; commonColors: string[] } {
    try {
      if (!userColors || !Array.isArray(userColors) || userColors.length === 0) {
        return { similarity: 0, commonColors: [] };
      }

      if (!otherColors || !Array.isArray(otherColors) || otherColors.length === 0) {
        return { similarity: 0, commonColors: [] };
      }

      // HEX'i RGB'ye çevir
      const hexToRgb = (hex: string): [number, number, number] | null => {
        try {
          if (!hex || typeof hex !== 'string') return null;
          const cleanHex = hex.trim().replace(/^#/, '');
          if (cleanHex.length !== 6) return null;
          const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
          return result
            ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
              ]
            : null;
        } catch {
          return null;
        }
      };

      // RGB Euclidean distance hesapla
      const rgbDistance = (
        rgb1: [number, number, number],
        rgb2: [number, number, number],
      ): number => {
        try {
          return Math.sqrt(
            Math.pow(rgb1[0] - rgb2[0], 2) +
              Math.pow(rgb1[1] - rgb2[1], 2) +
              Math.pow(rgb1[2] - rgb2[2], 2),
          );
        } catch {
          return Infinity;
        }
      };

      // Her kullanıcı rengi için en yakın diğer kullanıcı rengini bul
      const distances: Array<{ userColor: string; otherColor: string; distance: number }> = [];

      userColors.forEach((userColor) => {
        if (!userColor || typeof userColor !== 'string') return;
        
        const userRgb = hexToRgb(userColor);
        if (!userRgb) return;

        let minDistance = Infinity;
        let closestColor = '';

        otherColors.forEach((otherColor) => {
          if (!otherColor || typeof otherColor !== 'string') return;
          
          const otherRgb = hexToRgb(otherColor);
          if (!otherRgb) return;

          const distance = rgbDistance(userRgb, otherRgb);
          if (!isNaN(distance) && isFinite(distance) && distance < minDistance) {
            minDistance = distance;
            closestColor = otherColor;
          }
        });

        if (closestColor && isFinite(minDistance) && !isNaN(minDistance)) {
          distances.push({
            userColor,
            otherColor: closestColor,
            distance: minDistance,
          });
        }
      });

      if (distances.length === 0) {
        return { similarity: 0, commonColors: [] };
      }

      // Ortalama uzaklığı hesapla (0-441 arası, 441 = max RGB distance)
      const validDistances = distances.filter((d) => isFinite(d.distance) && !isNaN(d.distance));
      if (validDistances.length === 0) {
        return { similarity: 0, commonColors: [] };
      }

      const avgDistance =
        validDistances.reduce((sum, d) => sum + d.distance, 0) / validDistances.length;
      const maxDistance = 441; // sqrt(255^2 + 255^2 + 255^2) ≈ 441

      // Benzerlik yüzdesi (0-100)
      const similarity = Math.max(0, Math.min(100, 100 - (avgDistance / maxDistance) * 100));

      // Ortak renkleri bul (distance < 50 olanlar)
      const commonColors = validDistances
        .filter((d) => d.distance < 50)
        .map((d) => d.otherColor)
        .slice(0, 3); // En fazla 3 ortak renk

      return {
        similarity: Math.round(similarity),
        commonColors: Array.from(new Set(commonColors)), // Duplicate'leri kaldır
      };
    } catch (error) {
      console.error('Error in calculateColorSimilarity:', error);
      return { similarity: 0, commonColors: [] };
    }
  }

  /**
   * Get top performing content (posts and articles)
   * Returns most viewed, most commented, and most saved content
   */
  async getTopPerformingContent(userId: string, dateRange: 'today' | '7d' | '30d' = '30d') {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Get user's posts
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            savedBy: true,
          },
        },
        media: {
          take: 1,
          select: { url: true },
        },
      },
    });

    // Get savedByArtworks count for each post separately
    const postIds = posts.map((p) => p.id);
    const savedArtworksMap = new Map<string, number>();
    
    // Count saved artworks for each post
    for (const postId of postIds) {
      const count = await this.prisma.savedArtwork.count({
        where: { postId },
      });
      savedArtworksMap.set(postId, count);
    }

    // Get user's articles
    const articles = await this.prisma.article.findMany({
      where: {
        authorId: userId,
        isPublished: true,
        createdAt: { gte: startDate },
      },
      include: {
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Combine and rank
    const allContent = [
      ...posts.map((post) => ({
        id: post.id,
        type: 'post' as const,
        title: post.caption || post.title || 'Gönderi',
        thumbnail: post.media[0]?.url || null,
        likes: post._count.likes,
        comments: post._count.comments,
        saves: post._count.savedBy + (savedArtworksMap.get(post.id) || 0),
        createdAt: post.createdAt,
      })),
      ...articles.map((article) => ({
        id: article.id,
        type: 'article' as const,
        title: article.title,
        thumbnail: article.coverImage || null,
        likes: 0, // Articles don't have likes in current schema
        comments: article._count.comments,
        saves: 0, // Articles don't have saves in current schema
        createdAt: article.createdAt,
      })),
    ];

    // Find top performers
    const mostViewed = allContent
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 1)[0] || null;

    const mostCommented = allContent
      .sort((a, b) => b.comments - a.comments)
      .slice(0, 1)[0] || null;

    const mostSaved = allContent
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 1)[0] || null;

    return {
      mostViewed,
      mostCommented,
      mostSaved,
    };
  }

  /**
   * Get save analytics (total saves, save rate, most saved content)
   */
  async getSaveAnalytics(userId: string, dateRange: 'today' | '7d' | '30d' = '30d') {
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Get user's posts created in date range
    const posts = await this.prisma.post.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      include: {
        _count: {
          select: {
            savedBy: true,
            likes: true,
          },
        },
        media: {
          take: 1,
          select: { url: true },
        },
      },
    });

    // Get savedByArtworks count separately
    const postIds = posts.map((p) => p.id);
    const savedArtworksMap = new Map<string, number>();
    
    // Count saved artworks for each post
    for (const postId of postIds) {
      const count = await this.prisma.savedArtwork.count({
        where: { postId },
      });
      savedArtworksMap.set(postId, count);
    }

    // Calculate totals
    const totalSaves = posts.reduce(
      (sum, post) => sum + post._count.savedBy + (savedArtworksMap.get(post.id) || 0),
      0,
    );
    const totalLikes = posts.reduce((sum, post) => sum + post._count.likes, 0);
    const saveRate = totalLikes > 0 ? (totalSaves / totalLikes) * 100 : 0;

    // Most saved content
    const mostSaved = posts
      .map((post) => ({
        id: post.id,
        type: 'post' as const,
        title: post.caption || post.title || 'Gönderi',
        thumbnail: post.media[0]?.url || null,
        saves: post._count.savedBy + (savedArtworksMap.get(post.id) || 0),
      }))
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 1)[0] || null;

    return {
      totalSaves,
      saveRate: Math.round(saveRate * 10) / 10, // Round to 1 decimal
      mostSaved,
    };
  }

  /**
   * Get source distribution (where users found the content)
   * Note: This is a simplified version - in a real system you'd track referrer URLs
   * For now, we'll use a placeholder that can be enhanced later
   */
  async getSourceDistribution(userId: string, dateRange: 'today' | '7d' | '30d' = '30d') {
    // Placeholder implementation - can be enhanced with actual tracking
    // For now, return a balanced distribution as example
    return {
      explore: 42,
      profile: 33,
      home: 25,
    };
  }

  /**
   * Get comparison with previous period
   * Returns percentage change for key metrics
   */
  async getPeriodComparison(userId: string, dateRange: 'today' | '7d' | '30d' = '30d') {
    const now = new Date();
    let currentStart = new Date();
    let previousStart = new Date();
    let previousEnd = new Date();
    
    switch (dateRange) {
      case 'today':
        currentStart.setHours(0, 0, 0, 0);
        previousStart.setDate(previousStart.getDate() - 1);
        previousStart.setHours(0, 0, 0, 0);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousEnd.setHours(23, 59, 59, 999);
        break;
      case '7d':
        currentStart.setDate(currentStart.getDate() - 7);
        previousStart.setDate(previousStart.getDate() - 14);
        previousEnd.setDate(previousEnd.getDate() - 7);
        break;
      case '30d':
      default:
        currentStart.setDate(currentStart.getDate() - 30);
        previousStart.setDate(previousStart.getDate() - 60);
        previousEnd.setDate(previousEnd.getDate() - 30);
        break;
    }

    // Get current period stats
    const currentPosts = await this.prisma.post.findMany({
      where: {
        userId,
        createdAt: { gte: currentStart },
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            savedBy: true,
          },
        },
      },
    });

    // Get savedByArtworks count for current period
    const currentPostIds = currentPosts.map((p) => p.id);
    const currentSavedArtworksMap = new Map<string, number>();
    
    // Count saved artworks for each post in current period
    for (const postId of currentPostIds) {
      const count = await this.prisma.savedArtwork.count({
        where: { postId },
      });
      currentSavedArtworksMap.set(postId, count);
    }

    const currentLikes = currentPosts.reduce((sum, p) => sum + p._count.likes, 0);
    const currentComments = currentPosts.reduce((sum, p) => sum + p._count.comments, 0);
    const currentSaves = currentPosts.reduce(
      (sum, p) => sum + p._count.savedBy + (currentSavedArtworksMap.get(p.id) || 0),
      0,
    );

    // Get previous period stats
    const previousPosts = await this.prisma.post.findMany({
      where: {
        userId,
        createdAt: {
          gte: previousStart,
          lte: previousEnd,
        },
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            savedBy: true,
          },
        },
      },
    });

    // Get savedByArtworks count for previous period
    const previousPostIds = previousPosts.map((p) => p.id);
    const previousSavedArtworksMap = new Map<string, number>();
    
    // Count saved artworks for each post in previous period
    for (const postId of previousPostIds) {
      const count = await this.prisma.savedArtwork.count({
        where: { postId },
      });
      previousSavedArtworksMap.set(postId, count);
    }

    const previousLikes = previousPosts.reduce((sum, p) => sum + p._count.likes, 0);
    const previousComments = previousPosts.reduce((sum, p) => sum + p._count.comments, 0);
    const previousSaves = previousPosts.reduce(
      (sum, p) => sum + p._count.savedBy + (previousSavedArtworksMap.get(p.id) || 0),
      0,
    );

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      likes: {
        current: currentLikes,
        previous: previousLikes,
        change: calculateChange(currentLikes, previousLikes),
      },
      comments: {
        current: currentComments,
        previous: previousComments,
        change: calculateChange(currentComments, previousComments),
      },
      saves: {
        current: currentSaves,
        previous: previousSaves,
        change: calculateChange(currentSaves, previousSaves),
      },
    };
  }

  /**
   * Get passive warning for content with low engagement
   * Returns content that hasn't received interactions in the last 14 days
   */
  async getLowEngagementWarning(userId: string) {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get posts older than 14 days
    const oldPosts = await this.prisma.post.findMany({
      where: {
        userId,
        createdAt: { lt: fourteenDaysAgo },
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        likes: {
          where: {
            createdAt: { gte: fourteenDaysAgo },
          },
          take: 1,
        },
        comments: {
          where: {
            createdAt: { gte: fourteenDaysAgo },
          },
          take: 1,
        },
      },
    });

    // Filter posts with no recent engagement
    const lowEngagement = oldPosts.filter(
      (post) => post.likes.length === 0 && post.comments.length === 0,
    );

    return {
      count: lowEngagement.length,
      hasWarning: lowEngagement.length > 0,
    };
  }
}

