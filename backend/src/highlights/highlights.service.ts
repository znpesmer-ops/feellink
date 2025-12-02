import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHighlightDto } from './dto/create-highlight.dto';

@Injectable()
export class HighlightsService {
  constructor(private prisma: PrismaService) {}

  async getByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, plan: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Sadece PRO planındaki kullanıcılar için highlights göster
    // Artist Pro kontrolü için plan === 'PRO' kontrolü yapıyoruz
    if (user.plan !== 'PRO') {
      return [];
    }

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
    // Kullanıcının PRO planında olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user || user.plan !== 'PRO') {
      throw new ForbiddenException('Bu özellik sadece Pro plan kullanıcıları için geçerlidir.');
    }

    // Post'ların kullanıcıya ait olduğunu kontrol et (tip kontrolü yok - tüm gönderiler eklenebilir)
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: dto.postIds },
        userId,
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

    // Post'ların kullanıcıya ait olduğunu kontrol et
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        userId,
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

