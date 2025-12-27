import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HighlightsService {
  constructor(private prisma: PrismaService) {}

  /**
   * ✅ Ayın Öne Çıkanları - Tek kaynak endpoint
   * 
   * Bu ay için admin kontrollü veya otomatik seçilmiş öne çıkanları döner.
   * Eğer bu ay için kayıt yoksa, otomatik olarak en popüler içerikleri seçer.
   */
  async getMonthlyHighlights() {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12

      console.log(`[HighlightsService] Getting monthly highlights for ${year}-${month}`);

      // Bu ay için kayıt var mı kontrol et
      let monthlyHighlight = await this.prisma.monthlyHighlight.findFirst({
          where: {
            year,
            month,
          },
          include: {
            museum: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                bio: true,
              },
            },
            artwork: {
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
                  take: 1,
                  orderBy: { order: 'asc' },
                },
              },
            },
            comment: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatar: true,
                  },
                },
                post: {
                  select: {
                    id: true,
                    caption: true,
                  },
                },
              },
            },
            collection: {
              include: {
                owner: {
                  select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        });

      // Eğer bu ay için kayıt yoksa, otomatik seçim yap
      if (!monthlyHighlight) {
        console.log('[HighlightsService] No monthly highlight found, selecting automatic highlights');
        monthlyHighlight = await this.selectAutomaticHighlights(year, month);
      }

    // Response formatı
    const response: any = {
      museum: null,
      artwork: null,
      comment: null,
      collection: null,
    };

    // Museum
    if (monthlyHighlight.museumId && monthlyHighlight.museum) {
      response.museum = {
        id: monthlyHighlight.museum.id,
        name: monthlyHighlight.museum.fullName || monthlyHighlight.museum.username,
        username: monthlyHighlight.museum.username,
        imageUrl: monthlyHighlight.museum.avatar || null,
        bio: monthlyHighlight.museum.bio || null,
      };
    }

    // Artwork
    if (monthlyHighlight.artworkId && monthlyHighlight.artwork) {
      response.artwork = {
        id: monthlyHighlight.artwork.id,
        title: monthlyHighlight.artwork.title || monthlyHighlight.artwork.caption || 'İsimsiz',
        postId: monthlyHighlight.artwork.id,
        imageUrl: monthlyHighlight.artwork.media?.[0]?.url || null,
        artist: {
          id: monthlyHighlight.artwork.user.id,
          username: monthlyHighlight.artwork.user.username,
          fullName: monthlyHighlight.artwork.user.fullName,
          avatar: monthlyHighlight.artwork.user.avatar,
        },
      };
    }

    // Comment
    if (monthlyHighlight.commentId && monthlyHighlight.comment) {
      response.comment = {
        id: monthlyHighlight.comment.id,
        commentId: monthlyHighlight.comment.id,
        postId: monthlyHighlight.comment.postId,
        text: monthlyHighlight.comment.content,
        username: monthlyHighlight.comment.user.username,
        fullName: monthlyHighlight.comment.user.fullName || monthlyHighlight.comment.user.username,
        avatar: monthlyHighlight.comment.user.avatar,
      };
    }

    // Collection
    if (monthlyHighlight.collectionId && monthlyHighlight.collection) {
      response.collection = {
        id: monthlyHighlight.collection.id,
        title: monthlyHighlight.collection.title,
        coverImage: monthlyHighlight.collection.coverImage || null,
        owner: {
          id: monthlyHighlight.collection.owner.id,
          username: monthlyHighlight.collection.owner.username,
          fullName: monthlyHighlight.collection.owner.fullName,
          avatar: monthlyHighlight.collection.owner.avatar,
        },
      };
    }

      return response;
    } catch (error: any) {
      console.error('[HighlightsService] Error getting monthly highlights:', error);
      // Hata durumunda boş response dön (frontend boş placeholder gösterecek)
      return {
        museum: null,
        artwork: null,
        comment: null,
        collection: null,
      };
    }
  }

  /**
   * Otomatik seçim: Son 30 günün en popüler içerikleri
   * Prisma model henüz generate edilmemişse, direkt response döner (create etmeden)
   */
  private async selectAutomaticHighlights(year: number, month: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Ayın Müzesi: En çok takipçisi olan museum role'lü kullanıcı
    const topMuseum = await this.prisma.user.findFirst({
      where: {
        roles: { has: 'corporate' }, // Museum role'ü corporate olabilir veya ayrı bir role
        createdAt: { lte: thirtyDaysAgo },
      },
      orderBy: {
        followerCount: 'desc',
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        bio: true,
      },
    });

    // 2. Ayın Eseri: Son 30 günde en çok beğenilen artwork
    // MongoDB'de _count ile orderBy çalışmadığı için tüm artwork'leri çekip JavaScript'te sıralıyoruz
    const artworks = await this.prisma.post.findMany({
      where: {
        type: 'artwork',
        createdAt: { gte: thirtyDaysAgo },
        },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
      },
      take: 100, // Performans için limit
    });
    
    // JavaScript'te like count'a göre sırala
    const topArtwork = artworks.length > 0 
      ? artworks.sort((a, b) => (b._count?.likes || 0) - (a._count?.likes || 0))[0]
      : null;
    
    // Eğer topArtwork varsa, detaylarını çek
    let artworkDetails = null;
    if (topArtwork) {
      artworkDetails = await this.prisma.post.findUnique({
        where: { id: topArtwork.id },
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
            take: 1,
                  orderBy: { order: 'asc' },
          },
        },
      });
    }

    // 3. Ayın Yorumu: Son 30 günde en çok beğenilen yorum
    // MongoDB'de _count ile orderBy çalışmadığı için tüm yorumları çekip JavaScript'te sıralıyoruz
    const comments = await this.prisma.comment.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
      },
      take: 100, // Performans için limit
    });
    
    // JavaScript'te like count'a göre sırala
    const topComment = comments.length > 0
      ? comments.sort((a, b) => (b._count?.likes || 0) - (a._count?.likes || 0))[0]
      : null;
    
    // Eğer topComment varsa, detaylarını çek
    let commentDetails = null;
    if (topComment) {
      commentDetails = await this.prisma.comment.findUnique({
        where: { id: topComment.id },
      include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
            },
          },
            post: {
            select: {
              id: true,
              caption: true,
            },
        },
      },
    });
  }

    // 4. Ayın Koleksiyonu: Son 30 günde en çok item eklenen koleksiyon
    // MongoDB'de _count ile orderBy çalışmadığı için tüm koleksiyonları çekip JavaScript'te sıralıyoruz
    const collections = await this.prisma.collection.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      take: 100, // Performans için limit
    });
    
    // JavaScript'te item count'a göre sırala
    const topCollection = collections.length > 0
      ? collections.sort((a, b) => (b._count?.items || 0) - (a._count?.items || 0))[0]
      : null;
    
    // Eğer topCollection varsa, detaylarını çek
    let collectionDetails = null;
    if (topCollection) {
      collectionDetails = await this.prisma.collection.findUnique({
        where: { id: topCollection.id },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      });
    }

    // MonthlyHighlight kaydı oluştur (otomatik seçim)
    const created = await this.prisma.monthlyHighlight.create({
        data: {
          year,
          month,
          museumId: topMuseum?.id || null,
          artworkId: topArtwork?.id || null,
          commentId: topComment?.id || null,
          collectionId: topCollection?.id || null,
          isAuto: true,
        },
        include: {
          museum: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              bio: true,
            },
          },
          artwork: {
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
                take: 1,
                orderBy: { order: 'asc' },
              },
            },
          },
          comment: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatar: true,
                },
              },
              post: {
                select: {
                  id: true,
                  caption: true,
                },
              },
            },
          },
          collection: {
            include: {
              owner: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

    return created;
  }
}
