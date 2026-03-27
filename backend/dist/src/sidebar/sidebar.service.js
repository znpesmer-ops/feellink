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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const sidebar_gateway_1 = require("./sidebar.gateway");
const articles_service_1 = require("../articles/articles.service");
const week_range_util_1 = require("../common/utils/week-range.util");
const public_vitrine_user_1 = require("../common/utils/public-vitrine-user");
const MUSEUM_IMAGE_MAP = {
    1: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    2: 'https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=800&q=80',
    3: 'https://images.unsplash.com/photo-1522780209446-8a0e1a942334?auto=format&fit=crop&w=800&q=80',
    4: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
};
const DEFAULT_AUTHOR_AVATAR = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80';
const DEFAULT_ARTICLE_IMAGE = 'https://images.unsplash.com/photo-1526481280695-3c469b8c66b4?auto=format&fit=crop&w=960&q=80';
let SidebarService = class SidebarService {
    constructor(prisma, gateway, articlesService) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.articlesService = articlesService;
    }
    async getFeaturedMuseums() {
        const resolveImageUrl = (image, fallback) => {
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
        const { start: weekStart, end: weekEnd } = (0, week_range_util_1.getCurrentWeekRange)();
        const corporateUsers = await this.prisma.user.findMany({
            where: {
                roles: {
                    has: 'corporate',
                },
                isPrivate: false,
                ...public_vitrine_user_1.publicVitrineUserWhere,
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
        const museumsWithScores = await Promise.all(corporateUsers.map(async (user) => {
            const recentPosts = await this.prisma.post.findMany({
                where: {
                    userId: user.id,
                    createdAt: { gte: weekStart, lte: weekEnd },
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
            const recentArticles = await this.prisma.article.findMany({
                where: {
                    authorId: user.id,
                    isPublished: true,
                    createdAt: { gte: weekStart, lte: weekEnd },
                },
                include: {
                    _count: {
                        select: {
                            comments: true,
                        },
                    },
                },
            });
            const weeklyViews = recentArticles.reduce((sum, article) => sum + (article.views || 0), 0);
            const weeklyLikes = recentPosts.reduce((sum, post) => sum + post._count.likes, 0);
            const weeklyComments = recentPosts.reduce((sum, post) => sum + post._count.comments, 0) +
                recentArticles.reduce((sum, article) => sum + article._count.comments, 0);
            const weeklyPosts = recentPosts.length + recentArticles.length;
            const followerCount = user.followerCount || 0;
            const score = weeklyViews * 0.4 +
                (weeklyLikes + weeklyComments) * 0.3 +
                weeklyPosts * 0.2 +
                followerCount * 0.1;
            return {
                id: user.id,
                username: user.username,
                name: user.fullName || user.username,
                avatar: resolveImageUrl(user.avatar, DEFAULT_AUTHOR_AVATAR),
                score,
                weeklyViews,
                weeklyLikes,
                weeklyComments,
                weeklyPosts,
                followerCount: user.followerCount,
            };
        }));
        const topMuseums = museumsWithScores
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((museum, index) => {
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
        const resolveImageUrl = (image, fallback) => {
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
        const { start: weekStart, end: weekEnd } = (0, week_range_util_1.getCurrentWeekRange)();
        const topViewedArticles = await this.prisma.article.findMany({
            where: {
                isPublished: true,
                createdAt: { gte: weekStart, lte: weekEnd },
                author: public_vitrine_user_1.publicVitrineUserWhere,
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
        const postsByUser = await this.prisma.post.groupBy({
            by: ['userId'],
            where: {
                createdAt: {
                    gte: weekStart,
                    lte: weekEnd,
                },
                type: 'post',
                user: public_vitrine_user_1.publicVitrineUserWhere,
            },
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 2,
        });
        const topWriterIds = postsByUser.map((p) => p.userId);
        const topWritersMap = new Map();
        if (topWriterIds.length > 0) {
            const writers = await this.prisma.user.findMany({
                where: {
                    id: { in: topWriterIds },
                    isPrivate: false,
                    ...public_vitrine_user_1.publicVitrineUserWhere,
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    avatar: true,
                    bio: true,
                },
            });
            writers.forEach((writer) => {
                topWritersMap.set(writer.id, writer);
            });
        }
        const sortedWriters = topWriterIds
            .map((userId) => topWritersMap.get(userId))
            .filter((w) => w !== undefined);
        const museums = await this.getFeaturedMuseums();
        const topLikedAuthors = await this.articlesService.getTopLikedAuthors(4, {
            start: weekStart,
            end: weekEnd,
        });
        const authors = topLikedAuthors.map((writer) => ({
            id: writer.id,
            slug: writer.username,
            name: writer.name,
            avatar: resolveImageUrl(writer.avatar, DEFAULT_AUTHOR_AVATAR),
            preview: '',
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
                totalLikes: article.views,
                author: {
                    id: article.author.id,
                    username: article.author.username,
                    fullName: article.author.fullName,
                    avatar: resolveImageUrl(article.author.avatar, DEFAULT_AUTHOR_AVATAR),
                },
            })),
        };
    }
    async updateSidebarData() {
        const newData = await this.getGlobalData();
        this.gateway.broadcastSidebarUpdate(newData);
        return newData;
    }
    async getExplorePosts(userId, limit = 5) {
        const resolveImageUrl = (image, fallback) => {
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
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followingIds = following.map((f) => f.followingId);
        followingIds.push(userId);
        const articles = await this.prisma.article.findMany({
            where: {
                isPublished: true,
                author: {
                    id: { notIn: followingIds },
                    isPrivate: false,
                    ...public_vitrine_user_1.publicVitrineUserWhere,
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
            take: limit * 2,
        });
        const posts = await this.prisma.post.findMany({
            where: {
                user: {
                    id: { notIn: followingIds },
                    isPrivate: false,
                    ...public_vitrine_user_1.publicVitrineUserWhere,
                },
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
        const combinedContent = [
            ...articles.map((article) => ({
                type: 'article',
                id: article.id,
                title: article.title,
                preview: article.excerpt || article.content?.substring(0, 60) + '...' || 'Yazıyı oku...',
                link: `/articles/${article.id}`,
                createdAt: article.createdAt,
                author: article.author,
            })),
            ...posts
                .filter((post) => post.caption && post.caption.trim().length > 0)
                .map((post) => ({
                type: 'post',
                id: post.id,
                title: post.caption?.substring(0, 50) + (post.caption && post.caption.length > 50 ? '...' : '') || 'Gönderi',
                preview: post.caption || 'Gönderiyi gör...',
                link: `/feed?post=${post.id}`,
                createdAt: post.createdAt,
                author: post.user,
            })),
        ]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
        if (combinedContent.length === 0) {
            const fallbackArticles = await this.prisma.article.findMany({
                where: {
                    isPublished: true,
                    author: {
                        isPrivate: false,
                        ...public_vitrine_user_1.publicVitrineUserWhere,
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
                        ...public_vitrine_user_1.publicVitrineUserWhere,
                    },
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
                    type: 'article',
                    id: article.id,
                    title: article.title,
                    preview: article.excerpt || article.content?.substring(0, 60) + '...' || 'Yazıyı oku...',
                    link: `/articles/${article.id}`,
                    createdAt: article.createdAt,
                    author: article.author,
                })),
                ...fallbackPosts
                    .filter((post) => post.caption && post.caption.trim().length > 0)
                    .map((post) => ({
                    type: 'post',
                    id: post.id,
                    title: post.caption?.substring(0, 50) + (post.caption && post.caption.length > 50 ? '...' : '') || 'Gönderi',
                    preview: post.caption || 'Gönderiyi gör...',
                    link: `/feed?post=${post.id}`,
                    createdAt: post.createdAt,
                    author: post.user,
                })),
            ]
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, limit);
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
    async getFeaturedHighlights() {
        const resolveImageUrl = (image, fallback) => {
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
        const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80';
        const { start: weekStart, end: weekEnd } = (0, week_range_util_1.getCurrentWeekRange)();
        const corporateUsers = await this.prisma.user.findMany({
            where: {
                roles: {
                    has: 'corporate',
                },
                isPrivate: false,
                ...public_vitrine_user_1.publicVitrineUserWhere,
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
            const museumScores = await Promise.all(corporateUsers.map(async (user) => {
                const posts = await this.prisma.post.findMany({
                    where: {
                        userId: user.id,
                        createdAt: { gte: weekStart, lte: weekEnd },
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
                const postInteractions = posts.reduce((sum, post) => sum + post._count.likes + post._count.comments, 0);
                const articles = await this.prisma.article.findMany({
                    where: {
                        authorId: user.id,
                        isPublished: true,
                        createdAt: { gte: weekStart, lte: weekEnd },
                    },
                    include: {
                        _count: {
                            select: {
                                comments: true,
                            },
                        },
                    },
                });
                const articleInteractions = articles.reduce((sum, article) => sum + (article.views || 0) + article._count.comments, 0);
                return {
                    user,
                    score: postInteractions + articleInteractions,
                };
            }));
            const topMuseum = museumScores.sort((a, b) => b.score - a.score)[0];
            if (topMuseum && topMuseum.score > 0) {
                featuredMuseum = {
                    name: topMuseum.user.fullName || topMuseum.user.username,
                    username: topMuseum.user.username,
                    imageUrl: resolveImageUrl(topMuseum.user.avatar, DEFAULT_AVATAR),
                };
            }
        }
        const artworks = await this.prisma.post.findMany({
            where: {
                type: 'artwork',
                createdAt: { gte: weekStart, lte: weekEnd },
                isDeleted: false,
                user: public_vitrine_user_1.publicVitrineUserWhere,
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
                score: artwork._count.likes +
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
        const comments = await this.prisma.comment.findMany({
            where: {
                createdAt: { gte: weekStart, lte: weekEnd },
                user: public_vitrine_user_1.publicVitrineUserWhere,
                post: { isDeleted: false },
            },
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
            take: 400,
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
        const collectors = await this.prisma.user.findMany({
            where: {
                roles: {
                    has: 'collector',
                },
                isPrivate: false,
                ...public_vitrine_user_1.publicVitrineUserWhere,
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
            const collectorScores = await Promise.all(collectors.map(async (collector) => {
                const posts = await this.prisma.post.findMany({
                    where: {
                        userId: collector.id,
                        createdAt: { gte: weekStart, lte: weekEnd },
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
                const postInteractions = posts.reduce((sum, post) => sum + post._count.likes + post._count.comments, 0);
                const collections = await this.prisma.collection.count({
                    where: {
                        ownerId: collector.id,
                        createdAt: { gte: weekStart, lte: weekEnd },
                    },
                });
                return {
                    collector,
                    score: postInteractions + collections * 10,
                };
            }));
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
};
exports.SidebarService = SidebarService;
exports.SidebarService = SidebarService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => articles_service_1.ArticlesService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sidebar_gateway_1.SidebarGateway,
        articles_service_1.ArticlesService])
], SidebarService);
//# sourceMappingURL=sidebar.service.js.map