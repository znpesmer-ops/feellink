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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getVisitStats(userId, dateRange = '30d') {
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
        const userPosts = await this.prisma.post.findMany({
            where: { userId },
            select: { id: true, createdAt: true },
        });
        const postIds = userPosts.map((p) => p.id);
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
        const allInteractions = [
            ...likes.map((l) => l.createdAt),
            ...comments.map((c) => c.createdAt),
            ...eventParticipations.map((ep) => ep.createdAt),
        ];
        const dateMap = new Map();
        allInteractions.forEach((date) => {
            const dateStr = date.toISOString().split('T')[0];
            dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
        });
        const result = [];
        let daysToGenerate = 30;
        if (dateRange === 'today') {
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
        }
        else if (dateRange === '7d') {
            daysToGenerate = 7;
        }
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
    async getTopWords(userId) {
        const userPosts = await this.prisma.post.findMany({
            where: { userId },
            select: { id: true },
        });
        const postIds = userPosts.map((p) => p.id);
        const postComments = await this.prisma.comment.findMany({
            where: { postId: { in: postIds } },
            select: { content: true },
        });
        const userEvents = await this.prisma.event.findMany({
            where: { ownerId: userId },
            select: { id: true },
        });
        const eventIds = userEvents.map((e) => e.id);
        const eventComments = await this.prisma.eventComment.findMany({
            where: { eventId: { in: eventIds } },
            select: { text: true },
        });
        const allComments = [
            ...postComments.map((c) => c.content),
            ...eventComments.map((c) => c.text),
        ];
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
        const wordMap = new Map();
        allComments.forEach((comment) => {
            if (!comment)
                return;
            const words = comment
                .toLowerCase()
                .replace(/[^\wğüşıöçĞÜŞİÖÇ\s]/g, ' ')
                .split(/\s+/)
                .filter((w) => w.length > 2 && !stopWords.has(w));
            words.forEach((word) => {
                wordMap.set(word, (wordMap.get(word) || 0) + 1);
            });
        });
        return Array.from(wordMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));
    }
    async getTopVisitors(userId) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
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
        const userActivityMap = new Map();
        [...likes, ...comments].forEach((item) => {
            const uid = item.userId;
            if (uid !== userId) {
                userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
            }
        });
        eventComments.forEach((item) => {
            const uid = item.authorId;
            if (uid !== userId) {
                userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
            }
        });
        eventParticipations.forEach((item) => {
            const uid = item.userId;
            if (uid !== userId) {
                userActivityMap.set(uid, (userActivityMap.get(uid) || 0) + 1);
            }
        });
        const sortedUsers = Array.from(userActivityMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        const users = await Promise.all(sortedUsers.map(async ([uid, count]) => {
            const user = await this.prisma.user.findUnique({
                where: { id: uid },
                select: {
                    id: true,
                    username: true,
                    avatar: true,
                    fullName: true,
                },
            });
            if (!user)
                return null;
            return {
                username: user.username,
                avatar: user.avatar,
                fullName: user.fullName,
                activityCount: count,
            };
        }));
        return users.filter((u) => u !== null);
    }
    async getEventStats(userId) {
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
                            take: 5,
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
            const totalTicketSales = event.tickets.reduce((sum, ticket) => sum + ticket.sold, 0);
            const allPurchases = event.tickets.flatMap((ticket) => ticket.purchases.map((purchase) => ({
                username: purchase.user.username,
                fullName: purchase.user.fullName,
                avatar: purchase.user.avatar,
                createdAt: purchase.createdAt,
            })));
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
    async getColorPalette(userId) {
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
        const allColors = [];
        posts.forEach((post) => {
            if (post.colorPalette && Array.isArray(post.colorPalette)) {
                const palette = post.colorPalette;
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
        const colorFrequency = new Map();
        allColors.forEach((color) => {
            colorFrequency.set(color.hex, (colorFrequency.get(color.hex) || 0) + (color.population || 1));
        });
        return Array.from(colorFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([hex, frequency]) => ({
            hex,
            frequency,
        }));
    }
    async getTopColorMatches(userId) {
        try {
            const userArtworks = await this.prisma.post.findMany({
                where: {
                    userId,
                    type: 'artwork',
                },
                select: {
                    colorPalette: true,
                },
            });
            const userColors = [];
            userArtworks.forEach((artwork) => {
                if (artwork.colorPalette && Array.isArray(artwork.colorPalette) && artwork.colorPalette.length > 0) {
                    artwork.colorPalette.forEach((color) => {
                        const colorStr = typeof color === 'string' ? color.trim().toUpperCase() : null;
                        if (colorStr && colorStr.startsWith('#')) {
                            if (!userColors.includes(colorStr)) {
                                userColors.push(colorStr);
                            }
                        }
                    });
                }
            });
            if (userColors.length === 0) {
                return [];
            }
            const artworksWithColors = await this.prisma.post.findMany({
                where: {
                    userId: { not: userId },
                    type: 'artwork',
                },
                select: {
                    userId: true,
                    colorPalette: true,
                },
            });
            const userColorMap = new Map();
            artworksWithColors.forEach((artwork) => {
                if (!artwork.colorPalette || !Array.isArray(artwork.colorPalette) || artwork.colorPalette.length === 0) {
                    return;
                }
                if (!userColorMap.has(artwork.userId)) {
                    userColorMap.set(artwork.userId, []);
                }
                const userColorsList = userColorMap.get(artwork.userId);
                artwork.colorPalette.forEach((color) => {
                    const colorStr = typeof color === 'string' ? color.trim().toUpperCase() : null;
                    if (colorStr && colorStr.startsWith('#') && !userColorsList.includes(colorStr)) {
                        userColorsList.push(colorStr);
                    }
                });
            });
            const userIdsWithArtworkColors = Array.from(userColorMap.keys()).filter((id) => (userColorMap.get(id)?.length || 0) > 0);
            if (userIdsWithArtworkColors.length === 0) {
                return [];
            }
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
            const matches = users
                .map((user) => {
                const otherColors = userColorMap.get(user.id) || [];
                if (otherColors.length === 0) {
                    return null;
                }
                try {
                    const similarity = this.calculateColorSimilarity(userColors, otherColors);
                    if (!similarity || similarity.similarity === 0 || !similarity.commonColors) {
                        return null;
                    }
                    return {
                        userId: user.id,
                        username: user.username || 'Unknown',
                        avatar: user.avatar || null,
                        similarity: Math.max(0, Math.min(100, Math.round(similarity.similarity))),
                        commonColors: similarity.commonColors.slice(0, 3),
                    };
                }
                catch (err) {
                    console.error(`Error calculating similarity for user ${user.id}:`, err);
                    return null;
                }
            })
                .filter((m) => m !== null)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 5);
            return matches;
        }
        catch (error) {
            console.error('Error in getTopColorMatches:', error);
            return [];
        }
    }
    calculateColorSimilarity(userColors, otherColors) {
        try {
            if (!userColors || !Array.isArray(userColors) || userColors.length === 0) {
                return { similarity: 0, commonColors: [] };
            }
            if (!otherColors || !Array.isArray(otherColors) || otherColors.length === 0) {
                return { similarity: 0, commonColors: [] };
            }
            const hexToRgb = (hex) => {
                try {
                    if (!hex || typeof hex !== 'string')
                        return null;
                    const cleanHex = hex.trim().replace(/^#/, '');
                    if (cleanHex.length !== 6)
                        return null;
                    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
                    return result
                        ? [
                            parseInt(result[1], 16),
                            parseInt(result[2], 16),
                            parseInt(result[3], 16),
                        ]
                        : null;
                }
                catch {
                    return null;
                }
            };
            const rgbDistance = (rgb1, rgb2) => {
                try {
                    return Math.sqrt(Math.pow(rgb1[0] - rgb2[0], 2) +
                        Math.pow(rgb1[1] - rgb2[1], 2) +
                        Math.pow(rgb1[2] - rgb2[2], 2));
                }
                catch {
                    return Infinity;
                }
            };
            const distances = [];
            userColors.forEach((userColor) => {
                if (!userColor || typeof userColor !== 'string')
                    return;
                const userRgb = hexToRgb(userColor);
                if (!userRgb)
                    return;
                let minDistance = Infinity;
                let closestColor = '';
                otherColors.forEach((otherColor) => {
                    if (!otherColor || typeof otherColor !== 'string')
                        return;
                    const otherRgb = hexToRgb(otherColor);
                    if (!otherRgb)
                        return;
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
            const validDistances = distances.filter((d) => isFinite(d.distance) && !isNaN(d.distance));
            if (validDistances.length === 0) {
                return { similarity: 0, commonColors: [] };
            }
            const avgDistance = validDistances.reduce((sum, d) => sum + d.distance, 0) / validDistances.length;
            const maxDistance = 441;
            const similarity = Math.max(0, Math.min(100, 100 - (avgDistance / maxDistance) * 100));
            const commonColors = validDistances
                .filter((d) => d.distance < 50)
                .map((d) => d.otherColor)
                .slice(0, 3);
            return {
                similarity: Math.round(similarity),
                commonColors: Array.from(new Set(commonColors)),
            };
        }
        catch (error) {
            console.error('Error in calculateColorSimilarity:', error);
            return { similarity: 0, commonColors: [] };
        }
    }
    async getTopPerformingContent(userId, dateRange = '30d') {
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
        const postIds = posts.map((p) => p.id);
        const savedArtworksMap = new Map();
        for (const postId of postIds) {
            const count = await this.prisma.savedArtwork.count({
                where: { postId },
            });
            savedArtworksMap.set(postId, count);
        }
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
        const allContent = [
            ...posts.map((post) => ({
                id: post.id,
                type: 'post',
                title: post.caption || post.title || 'Gönderi',
                thumbnail: post.media[0]?.url || null,
                likes: post._count.likes,
                comments: post._count.comments,
                saves: post._count.savedBy + (savedArtworksMap.get(post.id) || 0),
                createdAt: post.createdAt,
            })),
            ...articles.map((article) => ({
                id: article.id,
                type: 'article',
                title: article.title,
                thumbnail: article.coverImage || null,
                likes: 0,
                comments: article._count.comments,
                saves: 0,
                createdAt: article.createdAt,
            })),
        ];
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
    async getSaveAnalytics(userId, dateRange = '30d') {
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
        const postIds = posts.map((p) => p.id);
        const savedArtworksMap = new Map();
        for (const postId of postIds) {
            const count = await this.prisma.savedArtwork.count({
                where: { postId },
            });
            savedArtworksMap.set(postId, count);
        }
        const totalSaves = posts.reduce((sum, post) => sum + post._count.savedBy + (savedArtworksMap.get(post.id) || 0), 0);
        const totalLikes = posts.reduce((sum, post) => sum + post._count.likes, 0);
        const saveRate = totalLikes > 0 ? (totalSaves / totalLikes) * 100 : 0;
        const mostSaved = posts
            .map((post) => ({
            id: post.id,
            type: 'post',
            title: post.caption || post.title || 'Gönderi',
            thumbnail: post.media[0]?.url || null,
            saves: post._count.savedBy + (savedArtworksMap.get(post.id) || 0),
        }))
            .sort((a, b) => b.saves - a.saves)
            .slice(0, 1)[0] || null;
        return {
            totalSaves,
            saveRate: Math.round(saveRate * 10) / 10,
            mostSaved,
        };
    }
    async getSourceDistribution(userId, dateRange = '30d') {
        return {
            explore: 42,
            profile: 33,
            home: 25,
        };
    }
    async getPeriodComparison(userId, dateRange = '30d') {
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
        const currentPostIds = currentPosts.map((p) => p.id);
        const currentSavedArtworksMap = new Map();
        for (const postId of currentPostIds) {
            const count = await this.prisma.savedArtwork.count({
                where: { postId },
            });
            currentSavedArtworksMap.set(postId, count);
        }
        const currentLikes = currentPosts.reduce((sum, p) => sum + p._count.likes, 0);
        const currentComments = currentPosts.reduce((sum, p) => sum + p._count.comments, 0);
        const currentSaves = currentPosts.reduce((sum, p) => sum + p._count.savedBy + (currentSavedArtworksMap.get(p.id) || 0), 0);
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
        const previousPostIds = previousPosts.map((p) => p.id);
        const previousSavedArtworksMap = new Map();
        for (const postId of previousPostIds) {
            const count = await this.prisma.savedArtwork.count({
                where: { postId },
            });
            previousSavedArtworksMap.set(postId, count);
        }
        const previousLikes = previousPosts.reduce((sum, p) => sum + p._count.likes, 0);
        const previousComments = previousPosts.reduce((sum, p) => sum + p._count.comments, 0);
        const previousSaves = previousPosts.reduce((sum, p) => sum + p._count.savedBy + (previousSavedArtworksMap.get(p.id) || 0), 0);
        const calculateChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? 100 : 0;
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
    async getLowEngagementWarning(userId) {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
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
        const lowEngagement = oldPosts.filter((post) => post.likes.length === 0 && post.comments.length === 0);
        return {
            count: lowEngagement.length,
            hasWarning: lowEngagement.length > 0,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map