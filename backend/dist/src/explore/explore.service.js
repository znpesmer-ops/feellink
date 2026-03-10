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
exports.ExploreService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
let ExploreService = class ExploreService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    transformMediaUrl(url) {
        if (!url)
            return url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const baseUrl = this.configService.get('BASE_URL');
            if (baseUrl && (url.includes('localhost') || url.includes('127.0.0.1'))) {
                try {
                    const urlObj = new URL(url);
                    return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
                }
                catch {
                    return url;
                }
            }
            return url;
        }
        const baseUrl = this.configService.get('BASE_URL');
        if (!baseUrl) {
            const backendPort = this.configService.get('PORT') || '3002';
            const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
            const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1'
                ? '192.168.1.38'
                : endpoint;
            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
        }
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        return `${baseUrl}${cleanPath}`;
    }
    transformAvatarUrl(avatar) {
        if (!avatar)
            return null;
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            const baseUrl = this.configService.get('BASE_URL');
            if (baseUrl && (avatar.includes('localhost') || avatar.includes('127.0.0.1'))) {
                try {
                    const urlObj = new URL(avatar);
                    return `${baseUrl}${urlObj.pathname}${urlObj.search}`;
                }
                catch {
                    return avatar;
                }
            }
            return avatar;
        }
        const baseUrl = this.configService.get('BASE_URL');
        if (!baseUrl) {
            const backendPort = this.configService.get('PORT') || '3002';
            const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
            const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1'
                ? '192.168.1.38'
                : endpoint;
            const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
            return `http://${resolvedEndpoint}:${backendPort}${cleanPath}`;
        }
        const cleanPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
        return `${baseUrl}${cleanPath}`;
    }
    async getExplorePosts(userId, limit = 20, cursor) {
        console.log('🔍 [EXPLORE] getExplorePosts called:', { userId, limit, cursor });
        const where = {
            isDeleted: false,
        };
        if (cursor) {
            where.id = { lt: cursor };
        }
        if (userId) {
            where.userId = { not: userId };
        }
        console.log('🔍 [EXPLORE] BASİT Query where:', JSON.stringify(where, null, 2));
        const posts = await this.prisma.post.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
                media: {
                    orderBy: { order: 'asc' },
                    take: 1,
                },
                comments: {
                    where: {
                        parentId: null,
                    },
                    take: 6,
                    include: {
                        user: {
                            select: {
                                username: true,
                                fullName: true,
                            },
                        },
                    },
                    orderBy: [
                        { isPinned: 'desc' },
                        { createdAt: 'desc' },
                    ],
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit + 1,
        });
        console.log('✅ [EXPLORE] Query result:', {
            foundPosts: posts.length,
            limit,
            hasMore: posts.length > limit,
            firstPost: posts[0] ? { id: posts[0].id, userId: posts[0].userId, caption: posts[0].caption?.substring(0, 50) } : null,
        });
        const hasMore = posts.length > limit;
        const filteredPosts = hasMore ? posts.slice(0, limit) : posts;
        const nextCursor = hasMore && filteredPosts.length > 0
            ? filteredPosts[filteredPosts.length - 1].id
            : undefined;
        const postIds = filteredPosts.map(p => p.id);
        const likes = userId
            ? await this.prisma.like.findMany({
                where: {
                    postId: { in: postIds },
                    userId,
                },
            })
            : [];
        const likedPostIds = new Set(likes.map(l => l.postId));
        return {
            posts: filteredPosts.map((post) => ({
                ...post,
                isLiked: likedPostIds.has(post.id),
                media: post.media?.map((m) => ({
                    ...m,
                    url: this.transformMediaUrl(m.url),
                })) || [],
                user: {
                    ...post.user,
                    avatar: this.transformAvatarUrl(post.user.avatar),
                },
                pinnedComment: post.comments && post.comments.length > 0 && post.comments[0].isPinned ? {
                    user: post.comments[0].user.username || post.comments[0].user.fullName || 'Kullanıcı',
                    text: post.comments[0].content,
                } : null,
                recentComments: post.comments
                    ? post.comments
                        .filter((c) => !c.isPinned)
                        .slice(0, 5)
                        .map((c) => ({
                        id: c.id,
                        content: c.content,
                        isPinned: c.isPinned,
                        createdAt: c.createdAt,
                        user: {
                            username: c.user.username || c.user.fullName || 'Kullanıcı',
                        },
                    }))
                    : [],
            })),
            nextCursor,
            hasMore,
        };
    }
    async searchHashtags(query, limit = 20) {
        const hashtags = await this.prisma.hashtag.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            orderBy: {
                postCount: 'desc',
            },
            take: limit,
        });
        return hashtags;
    }
    async getHashtagPosts(hashtagName, userId, limit = 20, cursor) {
        const hashtag = await this.prisma.hashtag.findUnique({
            where: { name: hashtagName.toLowerCase() },
        });
        if (!hashtag) {
            return {
                posts: [],
                nextCursor: undefined,
                hasMore: false,
            };
        }
        const where = cursor
            ? {
                hashtags: {
                    some: {
                        hashtagId: hashtag.id,
                    },
                },
                id: { lt: cursor },
            }
            : {
                hashtags: {
                    some: {
                        hashtagId: hashtag.id,
                    },
                },
            };
        const posts = await this.prisma.post.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
                media: {
                    orderBy: { order: 'asc' },
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
        });
        const hasMore = posts.length > limit;
        const filteredPosts = hasMore ? posts.slice(0, limit) : posts;
        const nextCursor = hasMore && filteredPosts.length > 0
            ? filteredPosts[filteredPosts.length - 1].id
            : undefined;
        const postIds = filteredPosts.map(p => p.id);
        const likes = userId
            ? await this.prisma.like.findMany({
                where: {
                    postId: { in: postIds },
                    userId,
                },
            })
            : [];
        const likedPostIds = new Set(likes.map(l => l.postId));
        return {
            posts: filteredPosts.map(post => ({
                ...post,
                isLiked: likedPostIds.has(post.id),
                media: post.media?.map((m) => ({
                    ...m,
                    url: this.transformMediaUrl(m.url),
                })) || [],
                user: {
                    ...post.user,
                    avatar: this.transformAvatarUrl(post.user.avatar),
                },
            })),
            nextCursor,
            hasMore,
        };
    }
};
exports.ExploreService = ExploreService;
exports.ExploreService = ExploreService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], ExploreService);
//# sourceMappingURL=explore.service.js.map