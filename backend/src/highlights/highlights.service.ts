import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHighlightDto } from './dto/create-highlight.dto';

@Injectable()
export class HighlightsService {
  constructor(private prisma: PrismaService) {}

  async getByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Plan kontrolü kaldırıldı - artık herkes highlights görebilir

    const highlights = await this.prisma.highlight.findMany({
      where: { userId: user.id },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Media URL'lerini düzelt
    return highlights.map((highlight) => ({
      ...highlight,
      coverPost: highlight.coverPost
        ? {
            ...highlight.coverPost,
            imageUrl: highlight.coverPost.media[0]?.url || null,
          }
        : null,
      items: highlight.items.map((item) => ({
        ...item,
        post: {
          ...item.post,
          imageUrl: item.post.media[0]?.url || null,
        },
      })),
    }));
  }

  async create(dto: CreateHighlightDto, userId: string) {
    // Plan kontrolü kaldırıldı - artık herkes highlight oluşturabilir
    // Kullanıcının var olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException('Kullanıcı bulunamadı.');
    }

    // ÖNE ÇIKAN TEMALAR: Sadece kullanıcının KENDİ post'larını eklemesine izin ver
    // ❌ Başkalarının eserleri YOK
    // ❌ Genel arama YOK
    // ❌ Koleksiyon mantığı YOK
    // ✅ Sadece kullanıcının kendi yüklediği post'lar
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: dto.postIds },
        userId, // Sadece kullanıcının kendi post'ları
      },
      select: { id: true },
    });

    if (posts.length !== dto.postIds.length) {
      throw new BadRequestException('Tüm gönderiler size ait olmalıdır.');
    }

    if (posts.length === 0) {
      throw new BadRequestException('En az bir gönderi seçmelisiniz.');
    }

    // Cover post kontrolü
    const coverPostId = dto.coverPostId || dto.postIds[0];
    if (!dto.postIds.includes(coverPostId)) {
      throw new BadRequestException('Kapak görseli seçilen eserler arasında olmalıdır.');
    }

    return this.prisma.highlight.create({
      data: {
        title: dto.title,
        userId,
        coverPostId,
        items: {
          create: dto.postIds.map((postId, index) => ({
            postId,
            sortOrder: index,
          })),
        },
      },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async updateTitle(highlightId: string, title: string, userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temayı düzenleme yetkiniz yok.');
    }

    return this.prisma.highlight.update({
      where: { id: highlightId },
      data: { title },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async addPosts(highlightId: string, postIds: string[], userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temaya eser ekleme yetkiniz yok.');
    }

    // ÖNE ÇIKAN TEMALAR: Sadece kullanıcının KENDİ post'larını eklemesine izin ver
    // ❌ Başkalarının eserleri YOK
    // ❌ Genel arama YOK
    // ❌ Koleksiyon mantığı YOK
    // ✅ Sadece kullanıcının kendi yüklediği post'lar
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        userId, // Sadece kullanıcının kendi post'ları
      },
      select: { id: true },
    });

    if (posts.length !== postIds.length) {
      throw new BadRequestException('Tüm gönderiler size ait olmalıdır.');
    }

    if (posts.length === 0) {
      throw new BadRequestException('En az bir gönderi seçmelisiniz.');
    }

    // Mevcut item'ları kontrol et (duplicate önleme)
    const existingItems = await this.prisma.highlightItem.findMany({
      where: {
        highlightId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });

    const existingPostIds = existingItems.map((item) => item.postId);
    const newPostIds = postIds.filter((id) => !existingPostIds.includes(id));

    if (newPostIds.length === 0) {
      throw new BadRequestException('Seçilen eserler zaten temada mevcut.');
    }

    // Mevcut item sayısını al (sortOrder için)
    const currentItemCount = await this.prisma.highlightItem.count({
      where: { highlightId },
    });

    // Yeni item'ları ekle
    await this.prisma.highlightItem.createMany({
      data: newPostIds.map((postId, index) => ({
        highlightId,
        postId,
        sortOrder: currentItemCount + index,
      })),
    });

    return this.prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async removePosts(highlightId: string, postIds: string[], userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temadan eser kaldırma yetkiniz yok.');
    }

    if (postIds.length === 0) {
      throw new BadRequestException('En az bir eser seçmelisiniz.');
    }

    // Mevcut item'ları kontrol et
    const existingItems = await this.prisma.highlightItem.findMany({
      where: {
        highlightId,
        postId: { in: postIds },
      },
      select: { id: true, postId: true },
    });

    if (existingItems.length === 0) {
      throw new BadRequestException('Seçilen eserler temada bulunamadı.');
    }

    // Item'ları sil
    const itemIdsToDelete = existingItems.map((item) => item.id);
    await this.prisma.highlightItem.deleteMany({
      where: {
        id: { in: itemIdsToDelete },
      },
    });

    // Eğer silinen eserlerden biri coverPost ise, coverPost'u güncelle
    const deletedPostIds = existingItems.map((item) => item.postId);
    const highlightWithCover = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { coverPostId: true },
    });

    if (highlightWithCover?.coverPostId && deletedPostIds.includes(highlightWithCover.coverPostId)) {
      // Cover post silindi, yeni bir cover seç
      const remainingItems = await this.prisma.highlightItem.findFirst({
        where: { highlightId },
        orderBy: { sortOrder: 'asc' },
        select: { postId: true },
      });

      await this.prisma.highlight.update({
        where: { id: highlightId },
        data: {
          coverPostId: remainingItems?.postId || null,
        },
      });
    }

    return this.prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async delete(highlightId: string, userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temayı silme yetkiniz yok.');
    }

    // Prisma cascade delete ile HighlightItem'lar otomatik silinir
    // Post'lar silinmez (sadece bağlantı kopar)
    await this.prisma.highlight.delete({
      where: { id: highlightId },
    });

    return { success: true };
  }
}

