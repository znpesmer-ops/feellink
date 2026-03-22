"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let CollectionsService = class CollectionsService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async ensurePermission(userId, requireManage = false) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                roles: true,
                plan: true,
                badges: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return true;
    }
    async getMyCollections(userId) {
        await this.ensurePermission(userId, false);
        return this.prisma.collection.findMany({
            where: { ownerId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }
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
    async createCollection(userId, data) {
        await this.ensurePermission(userId, true);
        return this.prisma.collection.create({
            data: {
                title: data.title,
                description: data.description,
                coverImage: data.coverImage,
                ownerId: userId,
            },
        });
    }
    async updateCollection(userId, id, data) {
        await this.ensurePermission(userId, true);
        const collection = await this.prisma.collection.findUnique({
            where: { id },
        });
        if (!collection) {
            throw new common_1.NotFoundException('Collection not found');
        }
        if (collection.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to update this collection');
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
    async deleteCollection(userId, id) {
        await this.ensurePermission(userId, true);
        const collection = await this.prisma.collection.findUnique({
            where: { id },
        });
        if (!collection) {
            throw new common_1.NotFoundException('Collection not found');
        }
        if (collection.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this collection');
        }
        await this.prisma.$transaction([
            this.prisma.collectionItem.deleteMany({ where: { collectionId: id } }),
            this.prisma.collection.delete({ where: { id } }),
        ]);
        return { success: true };
    }
    async getCollectionById(id) {
        const collection = await this.prisma.collection.findUnique({
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
            throw new common_1.NotFoundException('Collection not found');
        }
        return collection;
    }
    async addItemToCollection(userId, collectionId, postId) {
        await this.ensurePermission(userId, true);
        const collection = await this.prisma.collection.findUnique({
            where: { id: collectionId },
        });
        if (!collection) {
            throw new common_1.NotFoundException('Collection not found');
        }
        if (collection.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to add items to this collection');
        }
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
            throw new common_1.NotFoundException('Post not found');
        }
        const existing = await this.prisma.collectionItem.findUnique({
            where: {
                collectionId_postId: {
                    collectionId,
                    postId,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException('This item is already in the collection');
        }
        const lastItem = await this.prisma.collectionItem.findFirst({
            where: { collectionId },
            orderBy: { order: 'desc' },
        });
        const nextOrder = lastItem ? lastItem.order + 1 : 0;
        const item = await this.prisma.collectionItem.create({
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
        if (post.userId !== userId) {
            const collectionOwner = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    username: true,
                    fullName: true,
                },
            });
            const addedUserName = collectionOwner?.fullName || collectionOwner?.username || 'Kullanıcı';
            await this.notificationsService.createNotification({
                userId: post.userId,
                type: 'collection_added',
                message: `${addedUserName}, eserinizi "${collection.title}" koleksiyonuna ekledi`,
                fromUserId: userId,
                targetPath: `/collections/${collectionId}`,
                targetUrl: `/collections/${collectionId}`,
            });
        }
        return item;
    }
    async removeItemFromCollection(userId, collectionId, itemId) {
        await this.ensurePermission(userId, true);
        const collection = await this.prisma.collection.findUnique({
            where: { id: collectionId },
        });
        if (!collection) {
            throw new common_1.NotFoundException('Collection not found');
        }
        if (collection.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to remove items from this collection');
        }
        const item = await this.prisma.collectionItem.findUnique({
            where: { id: itemId },
        });
        if (!item || item.collectionId !== collectionId) {
            throw new common_1.NotFoundException('Item not found in this collection');
        }
        await this.prisma.collectionItem.delete({
            where: { id: itemId },
        });
        return { success: true };
    }
    async reorderItems(userId, collectionId, itemIds) {
        await this.ensurePermission(userId, true);
        const collection = await this.prisma.collection.findUnique({
            where: { id: collectionId },
        });
        if (!collection) {
            throw new common_1.NotFoundException('Collection not found');
        }
        if (collection.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to reorder items in this collection');
        }
        const items = await this.prisma.collectionItem.findMany({
            where: {
                id: { in: itemIds },
                collectionId,
            },
        });
        if (items.length !== itemIds.length) {
            throw new common_1.BadRequestException('Some items do not belong to this collection');
        }
        await Promise.all(itemIds.map((itemId, index) => this.prisma.collectionItem.update({
            where: { id: itemId },
            data: { order: index },
        })));
        return { success: true };
    }
    async searchAddableItems(userId, collectionId, query, ownerId, cursor, take = 20) {
        const collection = await this.prisma.collection.findUnique({
            where: { id: collectionId },
        });
        if (!collection) {
            throw new common_1.NotFoundException('Collection not found');
        }
        if (collection.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to add items to this collection');
        }
        const existingItems = await this.prisma.collectionItem.findMany({
            where: { collectionId },
            select: { postId: true },
        });
        const existingPostIds = existingItems.map((item) => item.postId);
        const searchQuery = query.trim().toLowerCase();
        const hasSearchQuery = searchQuery.length >= 2;
        const artworkWhere = {
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
        let users = [];
        if (hasSearchQuery && !ownerId) {
            const userWhere = {
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
        const nextCursor = artworks.length === take && artworks.length > 0 ? artworks[artworks.length - 1].id : undefined;
        return {
            artworks: artworks.map((artwork) => {
                const titleValue = artwork.title?.trim() || artwork.caption?.trim() || null;
                return {
                    id: artwork.id,
                    title: titleValue,
                    caption: artwork.caption,
                    coverUrl: artwork.media?.[0]?.url || null,
                    isAlreadyInCollection: existingPostIds.includes(artwork.id),
                    owner: {
                        id: artwork.user.id,
                        username: artwork.user.username,
                        fullName: artwork.user.fullName,
                        avatar: artwork.user.avatar,
                    },
                };
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
};
exports.CollectionsService = CollectionsService;
exports.CollectionsService = CollectionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], CollectionsService);
//# sourceMappingURL=collections.service.js.map