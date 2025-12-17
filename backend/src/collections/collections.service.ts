import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeCapabilities } from '../roles/roles.utils';
import { SubscriptionPlanCode } from '../roles/roles.types';
import { LimitsService } from '../limits/limits.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CollectionsService {
  constructor(
    private prisma: PrismaService,
    private limitsService: LimitsService,
    private notificationsService: NotificationsService,
  ) {}

  private async ensurePermission(userId: string, requireManage = false) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        plan: true,
        badges: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = (user.roles as string[]) ?? [];
    const plan = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const badges = Array.isArray(user.badges) ? (user.badges as string[]) : [];
    const capabilities = computeCapabilities(roles, plan, badges);

    const hasAccess = requireManage
      ? capabilities.permissions.canManageCollections
      : capabilities.permissions.canAccessCollections;

    if (!hasAccess) {
      throw new ForbiddenException('Bu işlem için Koleksiyoner yetkisine sahip olmalısınız.');
    }
  }

  async getMyCollections(userId: string) {
    await this.ensurePermission(userId, false);
    return this.prisma.collection.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔥 Tüm koleksiyonları getir (public)
  async getAllCollections() {
    return this.prisma.collection.findMany({
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            roles: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCollection(userId: string, data: { title: string; description?: string; coverImage?: string }) {
    await this.ensurePermission(userId, true);
    await this.limitsService.ensureLimit(userId, 'create_collection');
    return this.prisma.collection.create({
      data: {
        title: data.title,
        description: data.description,
        coverImage: data.coverImage,
        ownerId: userId,
      },
    });
  }

  async updateCollection(userId: string, id: string, data: { title?: string; description?: string; coverImage?: string }) {
    await this.ensurePermission(userId, true);
    // Check if collection exists and belongs to user
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this collection');
    }

    return this.prisma.collection.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        coverImage: data.coverImage,
      },
    });
  }

  async deleteCollection(userId: string, id: string) {
    await this.ensurePermission(userId, true);
    // Check if collection exists and belongs to user
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this collection');
    }

    await this.prisma.collection.delete({
      where: { id },
    });

    return { success: true };
  }

  async getCollectionById(id: string) {
    const collection = await (this.prisma.collection.findUnique as any)({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            roles: true,
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: true,
                user: {
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
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return collection;
  }

  async addItemToCollection(userId: string, collectionId: string, postId: string) {
    await this.ensurePermission(userId, true);

    // Koleksiyon kontrolü
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to add items to this collection');
    }

    // Post kontrolü
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Aynı eser aynı koleksiyona tekrar eklenemez
    const existing = await (this.prisma as any).collectionItem.findUnique({
      where: {
        collectionId_postId: {
          collectionId,
          postId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('This item is already in the collection');
    }

    // Son sıra numarasını al
    const lastItem = await (this.prisma as any).collectionItem.findFirst({
      where: { collectionId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = lastItem ? lastItem.order + 1 : 0;

    // Item ekle
    const item = await (this.prisma as any).collectionItem.create({
      data: {
        collectionId,
        postId,
        addedById: userId,
        order: nextOrder,
      },
      include: {
        post: {
          include: {
            media: true,
            user: {
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

    // Eser sahibine bildirim gönder (koleksiyon sahibi kendi eserini eklemiyorsa)
    if (post.userId !== userId) {
      const addedUserName = post.user.username || post.user.fullName || 'Kullanıcı';
      await this.notificationsService.createNotification({
        userId: post.userId,
        type: 'collection_added',
        message: `"${collection.title}" koleksiyonuna eklendiniz. Eser sahibi: @${addedUserName}`,
        fromUserId: userId,
        targetPath: `/collections/${collectionId}`,
        targetUrl: `/collections/${collectionId}`,
      });
    }

    return item;
  }

  async removeItemFromCollection(userId: string, collectionId: string, itemId: string) {
    await this.ensurePermission(userId, true);

    // Koleksiyon kontrolü
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to remove items from this collection');
    }

    // Item kontrolü
    const item = await (this.prisma as any).collectionItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.collectionId !== collectionId) {
      throw new NotFoundException('Item not found in this collection');
    }

    await (this.prisma as any).collectionItem.delete({
      where: { id: itemId },
    });

    return { success: true };
  }

  async reorderItems(userId: string, collectionId: string, itemIds: string[]) {
    await this.ensurePermission(userId, true);

    // Koleksiyon kontrolü
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to reorder items in this collection');
    }

    // Tüm item'ların bu koleksiyona ait olduğunu kontrol et
    const items = await (this.prisma as any).collectionItem.findMany({
      where: {
        id: { in: itemIds },
        collectionId,
      },
    });

    if (items.length !== itemIds.length) {
      throw new BadRequestException('Some items do not belong to this collection');
    }

    // Sıralamayı güncelle
    await Promise.all(
      itemIds.map((itemId, index) =>
        (this.prisma as any).collectionItem.update({
          where: { id: itemId },
          data: { order: index },
        }),
      ),
    );

    return { success: true };
  }

  async searchAddableItems(
    userId: string,
    collectionId: string,
    query: string,
    ownerId?: string,
    cursor?: string,
    take: number = 20,
  ) {
    // Koleksiyon kontrolü ve yetki kontrolü
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to add items to this collection');
    }

    // Koleksiyonda zaten ekli olan eserlerin ID'lerini al
    const existingItems = await (this.prisma as any).collectionItem.findMany({
      where: { collectionId },
      select: { postId: true },
    });
    const existingPostIds = existingItems.map((item) => item.postId);

    // Arama kriterleri
    const searchQuery = query.trim().toLowerCase();
    const hasSearchQuery = searchQuery.length >= 2;

    // Eserler (artwork type postlar) - Artık filtreleme yapmıyoruz, tüm eserleri gösteriyoruz
    const artworkWhere: any = {
      type: 'artwork',
    };

    if (hasSearchQuery) {
      artworkWhere.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { caption: { contains: searchQuery, mode: 'insensitive' } },
        {
          user: {
            username: { contains: searchQuery, mode: 'insensitive' },
          },
        },
      ];
    }

    if (ownerId) {
      artworkWhere.userId = ownerId;
    }

    const artworks = await this.prisma.post.findMany({
      where: artworkWhere,
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        media: {
          take: 1,
          orderBy: { order: 'asc' },
        },
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Kullanıcılar (sadece artwork sahibi olanlar)
    let users: any[] = [];
    if (hasSearchQuery && !ownerId) {
      const userWhere: any = {
        username: { contains: searchQuery, mode: 'insensitive' },
        posts: {
          some: {
            type: 'artwork',
          },
        },
      };

      users = await this.prisma.user.findMany({
        where: userWhere,
        take: 10,
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
        },
        orderBy: { username: 'asc' },
      });
    }

    // Next cursor
    const nextCursor = artworks.length === take && artworks.length > 0 ? artworks[artworks.length - 1].id : undefined;

    return {
      artworks: artworks.map((artwork) => {
        // Güvenli başlık çıkarma - önce title, sonra caption, boşsa null (frontend'de fallback yapılacak)
        const titleValue = artwork.title?.trim() || artwork.caption?.trim() || null
        
        return {
          id: artwork.id,
          title: titleValue, // Backend'de fallback yapmıyoruz, frontend'de yapılacak
          caption: artwork.caption,
          coverUrl: artwork.media?.[0]?.url || null,
          isAlreadyInCollection: existingPostIds.includes(artwork.id),
          owner: {
            id: artwork.user.id,
            username: artwork.user.username,
            fullName: artwork.user.fullName,
            avatar: artwork.user.avatar,
          },
        }
      }),
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar,
      })),
      nextCursor,
    };
  }
}

