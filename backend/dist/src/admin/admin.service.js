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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const color_analysis_service_1 = require("../posts/color-analysis.service");
const mail_service_1 = require("../mail/mail.service");
let AdminService = class AdminService {
    constructor(prisma, colorAnalysisService, mailService) {
        this.prisma = prisma;
        this.colorAnalysisService = colorAnalysisService;
        this.mailService = mailService;
    }
    async getSummary() {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const [totalUsers, newUsers24h, postsToday, commentsToday, ticketsToday, revenuePurchases, totalPosts, totalComments, totalEvents, totalTickets,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({
                where: { createdAt: { gte: yesterdayStart } },
            }),
            this.prisma.post.count({
                where: { createdAt: { gte: todayStart } },
            }),
            this.prisma.comment.count({
                where: { createdAt: { gte: todayStart } },
            }),
            this.prisma.ticketPurchase.count({
                where: { createdAt: { gte: todayStart } },
            }),
            this.prisma.ticketPurchase.findMany({
                where: { createdAt: { gte: todayStart } },
                include: {
                    ticket: {
                        select: {
                            price: true,
                        },
                    },
                },
            }),
            this.prisma.post.count(),
            this.prisma.comment.count(),
            this.prisma.event.count(),
            this.prisma.ticketPurchase.count(),
        ]);
        const onlineUsers = await this.prisma.user.count({
            where: { isOnline: true },
        });
        const revenue = revenuePurchases.reduce((sum, purchase) => sum + (purchase.ticket.price || 0), 0);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentUsers = await this.prisma.user.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
            select: {
                createdAt: true,
            },
        });
        const dailyStatsMap = new Map();
        recentUsers.forEach((user) => {
            const dateKey = new Date(user.createdAt).toISOString().split('T')[0];
            dailyStatsMap.set(dateKey, (dailyStatsMap.get(dateKey) || 0) + 1);
        });
        const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, count]) => ({
            date: new Date(date),
            count,
        }));
        return {
            totalUsers,
            newUsers24h,
            onlineUsers,
            postsToday,
            commentsToday,
            ticketsToday,
            revenue,
            totalPosts,
            totalComments,
            totalEvents,
            totalTickets,
            traffic30d: dailyStats.map((stat) => ({
                date: stat.date,
                count: stat.count,
            })),
        };
    }
    async getUsers(page = 1, limit = 20, search, role, city, gender, ageMin, ageMax) {
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (role) {
            where.roles = { has: role };
        }
        if (city) {
            where.city = { contains: city, mode: 'insensitive' };
        }
        if (gender) {
            where.gender = gender;
        }
        if (ageMin !== undefined || ageMax !== undefined) {
            const today = new Date();
            where.dateOfBirth = {};
            if (ageMax !== undefined) {
                const minBirthDate = new Date(today.getFullYear() - ageMax - 1, today.getMonth(), today.getDate());
                where.dateOfBirth.lte = minBirthDate;
            }
            if (ageMin !== undefined) {
                const maxBirthDate = new Date(today.getFullYear() - ageMin, today.getMonth(), today.getDate());
                where.dateOfBirth.gte = maxBirthDate;
            }
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    fullName: true,
                    avatar: true,
                    roles: true,
                    plan: true,
                    badges: true,
                    isVerified: true,
                    isAdmin: true,
                    isPrivate: true,
                    followerCount: true,
                    followingCount: true,
                    isOnline: true,
                    createdAt: true,
                    dateOfBirth: true,
                    country: true,
                    city: true,
                    gender: true,
                    profileCompleted: true,
                    isDeleted: true,
                    deletedAt: true,
                    accountStatus: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { users, total, page, limit };
    }
    async updateUser(userId, data, actorId) {
        const oldUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                username: true,
                roles: true,
            },
        });
        if (!oldUser) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        }
        const { roles: incomingRoles, ...rest } = data;
        const normalizedRoles = incomingRoles
            ? Array.from(new Set(incomingRoles
                .map((role) => role?.trim())
                .filter((role) => !!role && Object.values(client_1.UserRole).includes(role))))
            : undefined;
        const updatePayload = {
            ...rest,
        };
        if (normalizedRoles && normalizedRoles.length > 0) {
            const oldRolesSorted = [...(oldUser.roles || [])].sort().join(',');
            const newRolesSorted = [...normalizedRoles].sort().join(',');
            if (oldRolesSorted !== newRolesSorted) {
                const lastChange = await this.prisma.roleChangeLog.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                });
                if (lastChange) {
                    const diffInDays = (Date.now() - lastChange.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                    if (diffInDays < 30) {
                        const remainingDays = Math.ceil(30 - diffInDays);
                        throw new common_1.BadRequestException(`Bu kullanıcının rolü ${remainingDays} gün sonra tekrar değiştirilebilir.`);
                    }
                }
            }
        }
        if (normalizedRoles) {
            updatePayload.roles = { set: normalizedRoles };
        }
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: updatePayload,
            select: {
                id: true,
                email: true,
                fullName: true,
                username: true,
                roles: true,
            },
        });
        if (normalizedRoles && normalizedRoles.length > 0) {
            const oldRolesSorted = [...(oldUser.roles || [])].sort().join(',');
            const newRolesSorted = [...normalizedRoles].sort().join(',');
            if (oldRolesSorted !== newRolesSorted) {
                await this.prisma.roleChangeLog.create({
                    data: {
                        userId,
                        changedBy: actorId,
                        oldRoles: (oldUser.roles || []),
                        newRoles: normalizedRoles,
                    },
                });
                const nextChangeDate = new Date();
                nextChangeDate.setDate(nextChangeDate.getDate() + 30);
                this.mailService.sendRoleChangedMail({
                    to: user.email,
                    name: user.fullName || user.username,
                    oldRoles: oldUser.roles || [],
                    newRoles: normalizedRoles,
                    nextChangeDate: nextChangeDate,
                }).catch((error) => {
                    console.error('Failed to send role changed email:', error);
                });
                try {
                    await this.prisma.refreshToken.deleteMany({
                        where: { userId: userId },
                    });
                }
                catch (error) {
                    console.error('Failed to invalidate refresh tokens:', error);
                }
            }
        }
        await this.prisma.auditLog.create({
            data: {
                actorId,
                action: 'user.update',
                target: `user:${userId}`,
                meta: {
                    changes: data,
                },
            },
        });
        return user;
    }
    async getRoleHistory(userId) {
        const logs = await this.prisma.roleChangeLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                user: {
                    select: {
                        username: true,
                        fullName: true,
                    },
                },
            },
        });
        const changedByIds = [...new Set(logs.map(log => log.changedBy))];
        const changers = await this.prisma.user.findMany({
            where: { id: { in: changedByIds } },
            select: {
                id: true,
                username: true,
                fullName: true,
            },
        });
        const changersMap = new Map(changers.map(c => [c.id, c.fullName || c.username]));
        return logs.map(log => ({
            id: log.id,
            oldRoles: log.oldRoles,
            newRoles: log.newRoles,
            changedBy: changersMap.get(log.changedBy) || 'Bilinmeyen',
            createdAt: log.createdAt,
        }));
    }
    async getRoleChangeRemainingDays(userId) {
        const lastChange = await this.prisma.roleChangeLog.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        if (!lastChange) {
            return null;
        }
        const diffInDays = (Date.now() - lastChange.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diffInDays >= 30) {
            return 0;
        }
        return Math.ceil(30 - diffInDays);
    }
    async deleteUser(userId, actorId) {
        if (!actorId) {
            throw new common_1.BadRequestException('Admin kullanıcı bilgisi eksik');
        }
        if (!userId || userId === 'undefined' || userId === 'null') {
            throw new common_1.BadRequestException('Geçerli bir kullanıcı ID\'si gerekli');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, email: true, superAdmin: true, isDeleted: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        }
        if (user.isDeleted) {
            throw new common_1.BadRequestException('Kullanıcı zaten silinmiş');
        }
        if (user.superAdmin) {
            throw new common_1.ForbiddenException('SuperAdmin kullanıcılar silinemez');
        }
        if (user.id === actorId) {
            throw new common_1.ForbiddenException('Kendi hesabınızı silemezsiniz');
        }
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: actorId,
                    accountStatus: 'SUSPENDED',
                },
            });
            await this.prisma.auditLog.create({
                data: {
                    actorId,
                    action: 'user.soft_delete',
                    target: `user:${userId}`,
                    meta: {
                        deletedUser: {
                            username: user.username,
                            email: user.email,
                        },
                    },
                },
            });
            return {
                success: true,
                message: 'Kullanıcı başarıyla silindi',
                deletedUserId: userId
            };
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException('Kullanıcı bulunamadı veya zaten silinmiş');
            }
            console.error('[Admin Service] deleteUser error:', error);
            throw new common_1.InternalServerErrorException('Kullanıcı silinirken bir hata oluştu');
        }
    }
    async getPosts(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                skip,
                take: limit,
                where: {
                    type: 'post',
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                    media: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            type: true,
                            url: true,
                            thumbnailUrl: true,
                            order: true,
                        },
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                        },
                    },
                },
            }),
            this.prisma.post.count({
                where: {
                    type: 'post',
                },
            }),
        ]);
        return { posts, total, page, limit };
    }
    async getArtworks(page = 1, limit = 20, search, userId) {
        const skip = (page - 1) * limit;
        const where = {
            type: 'artwork',
        };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { caption: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (userId) {
            where.userId = userId;
        }
        const [artworks, total] = await Promise.all([
            this.prisma.post.findMany({
                skip,
                take: limit,
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            fullName: true,
                        },
                    },
                    media: {
                        orderBy: { order: 'asc' },
                        select: {
                            id: true,
                            type: true,
                            url: true,
                            thumbnailUrl: true,
                            order: true,
                        },
                    },
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                        },
                    },
                },
            }),
            this.prisma.post.count({ where }),
        ]);
        return { artworks, total, page, limit };
    }
    async deleteArtwork(artworkId, actorId) {
        const artwork = await this.prisma.post.findUnique({
            where: { id: artworkId },
            select: { id: true, type: true, title: true },
        });
        if (!artwork) {
            throw new common_1.NotFoundException('Eser bulunamadı');
        }
        if (artwork.type !== 'artwork') {
            throw new common_1.BadRequestException('Bu bir eser değil');
        }
        await this.prisma.post.delete({
            where: { id: artworkId },
        });
        await this.createAuditLog({
            actorId,
            action: 'artwork.delete',
            target: `artwork:${artworkId}`,
            meta: {
                artworkTitle: artwork.title,
            },
        });
        return { message: 'Eser başarıyla silindi', deletedArtworkId: artworkId };
    }
    async deletePost(postId, actorId) {
        if (!actorId) {
            throw new common_1.BadRequestException('Admin kullanıcı bilgisi eksik');
        }
        if (!postId || postId === 'undefined' || postId === 'null') {
            throw new common_1.BadRequestException('Geçerli bir gönderi ID\'si gerekli');
        }
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, userId: true },
        });
        if (!post) {
            throw new common_1.NotFoundException('Gönderi bulunamadı');
        }
        try {
            await this.prisma.post.delete({
                where: { id: postId },
            });
            await this.createAuditLog({
                actorId,
                action: 'post.delete',
                target: `post:${postId}`,
            });
            return { success: true, message: 'Gönderi başarıyla silindi' };
        }
        catch (error) {
            if (error.code === 'P2003' || error.code === 'P2014') {
                throw new common_1.BadRequestException('Bu gönderi başka kayıtlarla ilişkili olduğu için silinemez');
            }
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException('Gönderi bulunamadı veya zaten silinmiş');
            }
            console.error('[Admin Service] deletePost error:', error);
            throw new common_1.InternalServerErrorException('Gönderi silinirken bir hata oluştu');
        }
    }
    async getComments(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [comments, total] = await Promise.all([
            this.prisma.comment.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
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
            }),
            this.prisma.comment.count(),
        ]);
        return { comments, total, page, limit };
    }
    async deleteComment(commentId, actorId) {
        await this.prisma.comment.delete({
            where: { id: commentId },
        });
        await this.createAuditLog({
            actorId,
            action: 'comment.delete',
            target: `comment:${commentId}`,
        });
        return { success: true };
    }
    async getArticles(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [articles, total] = await Promise.all([
            this.prisma.article.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            }),
            this.prisma.article.count(),
        ]);
        return { articles, total, page, limit };
    }
    async deleteArticle(articleId, actorId) {
        await this.prisma.article.delete({
            where: { id: articleId },
        });
        await this.createAuditLog({
            actorId,
            action: 'article.delete',
            target: `article:${articleId}`,
        });
        return { success: true };
    }
    async getEvents(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [events, total] = await Promise.all([
            this.prisma.event.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                    _count: {
                        select: {
                            participants: true,
                            tickets: true,
                        },
                    },
                },
            }),
            this.prisma.event.count(),
        ]);
        return { events, total, page, limit };
    }
    async getTickets(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [tickets, total] = await Promise.all([
            this.prisma.ticketPurchase.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                    ticket: {
                        include: {
                            event: {
                                select: {
                                    id: true,
                                    title: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.ticketPurchase.count(),
        ]);
        return { tickets, total, page, limit };
    }
    async getFeatureFlags() {
        return this.prisma.featureFlag.findMany({
            orderBy: { key: 'asc' },
        });
    }
    async updateFeatureFlag(key, enabled, updatedBy) {
        const flag = await this.prisma.featureFlag.upsert({
            where: { key },
            update: { enabled, updatedBy },
            create: { key, enabled, updatedBy },
        });
        await this.createAuditLog({
            actorId: updatedBy,
            action: 'feature_flag.update',
            target: `flag:${key}`,
            meta: { enabled },
        });
        return flag;
    }
    async getAuditLogs(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    actor: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            }),
            this.prisma.auditLog.count(),
        ]);
        return { logs, total, page, limit };
    }
    async createAuditLog(data) {
        return this.prisma.auditLog.create({
            data,
        });
    }
    async getModerationItems() {
        return {
            items: [],
            total: 0,
        };
    }
    async getAnalytics() {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const thirtyDaysAgo = new Date(todayStart);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [totalUsers, activeUsers24h, newUsers24h, postsToday, commentsToday, ticketsToday, revenuePurchases, totalPosts, totalComments, totalEvents, totalTickets, allRevenuePurchases,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({
                where: {
                    OR: [
                        { isOnline: true },
                        { lastSeen: { gte: yesterdayStart } },
                    ],
                },
            }),
            this.prisma.user.count({
                where: { createdAt: { gte: yesterdayStart } },
            }),
            this.prisma.post.count({
                where: { createdAt: { gte: todayStart } },
            }),
            this.prisma.comment.count({
                where: { createdAt: { gte: todayStart } },
            }),
            this.prisma.ticketPurchase.count({
                where: { createdAt: { gte: todayStart } },
            }),
            this.prisma.ticketPurchase.findMany({
                where: { createdAt: { gte: todayStart } },
                include: {
                    ticket: {
                        select: {
                            price: true,
                        },
                    },
                },
            }),
            this.prisma.post.count(),
            this.prisma.comment.count(),
            this.prisma.event.count(),
            this.prisma.ticketPurchase.count(),
            this.prisma.ticketPurchase.findMany({
                include: {
                    ticket: {
                        select: {
                            price: true,
                        },
                    },
                },
            }),
        ]);
        const revenue = revenuePurchases.reduce((sum, purchase) => sum + (purchase.ticket.price || 0), 0);
        const totalRevenue = allRevenuePurchases.reduce((sum, purchase) => sum + (purchase.ticket.price || 0), 0);
        const engagementTrend = [];
        const growthTrend = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(todayStart);
            date.setDate(date.getDate() - i);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const [posts, comments, users] = await Promise.all([
                this.prisma.post.count({
                    where: {
                        createdAt: {
                            gte: date,
                            lt: nextDate,
                        },
                    },
                }),
                this.prisma.comment.count({
                    where: {
                        createdAt: {
                            gte: date,
                            lt: nextDate,
                        },
                    },
                }),
                this.prisma.user.count({
                    where: {
                        createdAt: {
                            gte: date,
                            lt: nextDate,
                        },
                    },
                }),
            ]);
            engagementTrend.push({
                date: date.toISOString().split('T')[0],
                posts,
                comments,
            });
            growthTrend.push({
                date: date.toISOString().split('T')[0],
                users,
            });
        }
        const topCountries = [
            { country: 'Türkiye', count: Math.floor(totalUsers * 0.75) },
            { country: 'Almanya', count: Math.floor(totalUsers * 0.1) },
            { country: 'Fransa', count: Math.floor(totalUsers * 0.05) },
            { country: 'İngiltere', count: Math.floor(totalUsers * 0.04) },
            { country: 'Diğer', count: totalUsers - Math.floor(totalUsers * 0.94) },
        ].filter((item) => item.count > 0);
        return {
            totalUsers,
            activeUsers: activeUsers24h,
            totalPosts,
            totalComments,
            totalTickets,
            totalRevenue,
            topCountries,
            engagementTrend,
            growthTrend,
        };
    }
    async recalculateColors() {
        try {
            const posts = await this.prisma.post.findMany({
                where: {
                    media: {
                        some: {
                            type: 'image',
                        },
                    },
                },
                include: {
                    media: {
                        where: {
                            type: 'image',
                        },
                        orderBy: {
                            order: 'asc',
                        },
                        take: 1,
                    },
                },
            });
            let processed = 0;
            let failed = 0;
            const results = [];
            for (const post of posts) {
                if (post.media.length === 0) {
                    continue;
                }
                const firstImage = post.media[0];
                if (!firstImage || !firstImage.url) {
                    continue;
                }
                try {
                    const colors = await this.colorAnalysisService.extractColors(firstImage.url);
                    if (colors.length > 0) {
                        await this.prisma.post.update({
                            where: { id: post.id },
                            data: {
                                colorPalette: colors,
                            },
                        });
                        processed++;
                        results.push({
                            postId: post.id,
                            status: 'success',
                            colors: colors.length,
                        });
                    }
                    else {
                        failed++;
                        results.push({
                            postId: post.id,
                            status: 'no_colors',
                        });
                    }
                }
                catch (error) {
                    failed++;
                    results.push({
                        postId: post.id,
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
            return {
                message: '✅ Renk analizi yeniden hesaplama tamamlandı.',
                totalPosts: posts.length,
                processed,
                failed,
                results: results.slice(0, 10),
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            throw new Error(`Renk analizi yeniden hesaplama hatası: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async updateSetting(key, value, updatedBy) {
        try {
            if (!value || !value.trim()) {
                throw new common_1.BadRequestException(`${key} boş olamaz`);
            }
            const updated = await this.prisma.setting.upsert({
                where: { key },
                update: {
                    value: value.trim(),
                    updatedBy: updatedBy || null,
                },
                create: {
                    key,
                    value: value.trim(),
                    updatedBy: updatedBy || null,
                },
            });
            return {
                success: true,
                key: updated.key,
                value: updated.value,
                updatedAt: updated.updatedAt,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new Error(`Ayar güncellenemedi: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getSettings() {
        try {
            const settings = await this.prisma.setting.findMany({
                where: {
                    key: {
                        in: ['siteName', 'siteDescription', 'adminEmail'],
                    },
                },
            });
            const settingsMap = settings.reduce((acc, setting) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});
            return {
                siteName: settingsMap.siteName || 'Feellink',
                siteDescription: settingsMap.siteDescription || 'Modern sosyal medya platformu',
                adminEmail: settingsMap.adminEmail || 'admin@feellink.com',
            };
        }
        catch (error) {
            throw new Error(`Ayarlar alınamadı: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async suspendUser(userId, actorId, data) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                suspendedUntil: data.until,
                suspensionReason: data.reason,
                suspensionNote: data.note,
                suspendedByAdminId: actorId,
            },
        });
        return { success: true, message: 'User suspended' };
    }
    async unsuspendUser(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                suspendedUntil: null,
                suspensionReason: null,
                suspensionNote: null,
                suspendedByAdminId: null,
            },
        });
        return { success: true, message: 'User unsuspended' };
    }
    async getRoleChangeRequests(status, page = 1, limit = 20) {
        const where = {};
        if (status) {
            where.status = status;
        }
        const [requests, total] = await Promise.all([
            this.prisma.roleChangeRequest.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            fullName: true,
                        },
                    },
                },
            }),
            this.prisma.roleChangeRequest.count({ where }),
        ]);
        return {
            requests,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async approveRoleChangeRequest(requestId, adminId, reviewNote) {
        const request = await this.prisma.roleChangeRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
        });
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        if (request.status !== 'PENDING')
            throw new common_1.BadRequestException('Request is not pending');
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: request.userId },
                data: { roles: [request.requestedRole] },
            }),
            this.prisma.roleChangeRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    reviewedBy: adminId,
                    reviewedAt: new Date(),
                    reviewNote,
                },
            }),
        ]);
        return { success: true, message: 'Request approved' };
    }
    async rejectRoleChangeRequest(requestId, adminId, reviewNote) {
        const request = await this.prisma.roleChangeRequest.findUnique({
            where: { id: requestId },
        });
        if (!request)
            throw new common_1.NotFoundException('Request not found');
        if (request.status !== 'PENDING')
            throw new common_1.BadRequestException('Request is not pending');
        await this.prisma.roleChangeRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                reviewedBy: adminId,
                reviewedAt: new Date(),
                reviewNote,
            },
        });
        return { success: true, message: 'Request rejected' };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => color_analysis_service_1.ColorAnalysisService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        color_analysis_service_1.ColorAnalysisService,
        mail_service_1.MailService])
], AdminService);
//# sourceMappingURL=admin.service.js.map