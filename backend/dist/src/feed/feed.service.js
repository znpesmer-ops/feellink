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
exports.FeedService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let FeedService = class FeedService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        try {
            this.redis = new ioredis_1.default({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                retryStrategy: () => null,
                maxRetriesPerRequest: 0,
            });
            this.redis.on('error', (err) => {
                console.warn('[FeedService] ⚠️ Redis connection error (using fallback):', err.message);
            });
            this.redis.on('connect', () => {
                console.log('[FeedService] ✅ Redis connected');
            });
        }
        catch (error) {
            console.warn('[FeedService] ⚠️ Redis initialization failed (using fallback):', error);
            this.redis = null;
        }
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
    async getFeed(userId, limit = 20, cursor) {
        console.log('[FeedService] 📊 Ana Sayfa - HERKESİN postlarını getir (Redis bypass)');
        const feedPosts = await this.rebuildFeed(userId, limit);
        return {
            posts: feedPosts,
            nextCursor: feedPosts.length > 0 ? feedPosts[feedPosts.length - 1].id : undefined,
            hasMore: false,
        };
    }
    async addToFollowersFeeds(userId, postId) {
        const followers = await this.prisma.follow.findMany({
            where: { followingId: userId },
            select: { followerId: true },
        });
        const pipeline = this.redis.pipeline();
        for (const follow of followers) {
            const cacheKey = `feed:${follow.followerId}`;
            pipeline.lpush(cacheKey, postId);
            pipeline.ltrim(cacheKey, 0, 1000);
            pipeline.expire(cacheKey, 7 * 24 * 60 * 60);
        }
        await pipeline.exec();
    }
    async removeFromFeeds(postId) {
        const keys = await this.redis.keys('feed:*');
        const pipeline = this.redis.pipeline();
        for (const key of keys) {
            pipeline.lrem(key, 0, postId);
        }
        await pipeline.exec();
    }
    async rebuildFeed(userId, limit = 20) {
        console.log('🔍 [FEED] rebuildFeed - HERKESİN postlarını getir (Keşfet mantığı)');
        const posts = await this.prisma.post.findMany({
            where: {
                isDeleted: false,
                userId: { not: userId },
            },
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
                media: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        const postsWithCounts = await Promise.all(posts.map(async (post) => {
            const [likeCount, commentCount] = await Promise.all([
                this.prisma.like.count({ where: { postId: post.id } }),
                this.prisma.comment.count({ where: { postId: post.id, parentId: null } }),
            ]);
            return {
                ...post,
                _count: {
                    likes: likeCount,
                    comments: commentCount,
                },
            };
        }));
        const isRedisAvailable = this.redis && (this.redis.status === 'ready' || this.redis.status === 'connect');
        if (postsWithCounts.length > 0 && isRedisAvailable) {
            try {
                const cacheKey = `feed:${userId}`;
                const postIds = postsWithCounts.map(p => p.id);
                await this.redis.lpush(cacheKey, ...postIds);
                await this.redis.ltrim(cacheKey, 0, 1000);
                await this.redis.expire(cacheKey, 7 * 24 * 60 * 60);
            }
            catch (error) {
                console.warn('[FeedService] ⚠️ Failed to cache feed (non-critical):', error);
            }
        }
        const postIds = postsWithCounts.map(p => p.id);
        const likes = await this.prisma.like.findMany({
            where: {
                postId: { in: postIds },
                userId,
            },
        });
        const likedPostIds = new Set(likes.map(l => l.postId));
        return postsWithCounts.map(post => ({
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
        }));
    }
};
exports.FeedService = FeedService;
exports.FeedService = FeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], FeedService);
//# sourceMappingURL=feed.service.js.map