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
var ArticlesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const posts_gateway_1 = require("../posts/posts.gateway");
const articles_gateway_1 = require("./articles.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
let ArticlesService = ArticlesService_1 = class ArticlesService {
    constructor(prisma, postsGateway, articlesGateway, notificationsService) {
        this.prisma = prisma;
        this.postsGateway = postsGateway;
        this.articlesGateway = articlesGateway;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ArticlesService_1.name);
    }
    async create(userId, title, content, coverImage, excerpt, publish = false, scheduledAt) {
        try {
            const article = await this.prisma.article.create({
                data: {
                    title,
                    content,
                    coverImage,
                    excerpt: excerpt || content.slice(0, 200) + (content.length > 200 ? '...' : ''),
                    isPublished: publish && !scheduledAt,
                    scheduledAt: scheduledAt || null,
                    authorId: userId,
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            fullName: true,
                        },
                    },
                },
            });
            if (publish && !scheduledAt && this.postsGateway) {
                this.postsGateway.server.emit('articleCreated', article);
            }
            return article;
        }
        catch (error) {
            console.error('ARTICLE_SERVICE_CREATE_ERROR:', error?.message, error);
            throw error;
        }
    }
    async findDrafts(userId) {
        return this.prisma.article.findMany({
            where: {
                authorId: userId,
                isPublished: false,
                scheduledAt: null,
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
    }
    async findScheduled(userId) {
        return this.prisma.article.findMany({
            where: {
                authorId: userId,
                isPublished: false,
                scheduledAt: { not: null },
            },
            orderBy: { scheduledAt: 'asc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
    }
    async findPublished(userId) {
        return this.prisma.article.findMany({
            where: { authorId: userId, isPublished: true },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
    }
    async publish(id, userId) {
        const article = await this.prisma.article.findUnique({
            where: { id },
        });
        if (!article) {
            throw new common_1.NotFoundException('Article not found');
        }
        if (article.authorId !== userId) {
            throw new common_1.ForbiddenException('Bu yazıyı yayınlama yetkiniz yok');
        }
        const updated = await this.prisma.article.update({
            where: { id },
            data: { isPublished: true },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        if (this.postsGateway) {
            this.postsGateway.server.emit('articleCreated', updated);
        }
        return updated;
    }
    async findAllPublic() {
        return this.prisma.article.findMany({
            where: { isPublished: true },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
    }
    async findByUserId(userId) {
        const articles = await this.prisma.article.findMany({
            where: { authorId: userId, isPublished: true },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        return articles.map((article) => ({
            ...article,
            views: article.views || 0,
            _count: {
                likes: 0,
                comments: 0,
            },
        }));
    }
    async findMyArticles(userId) {
        return this.prisma.article.findMany({
            where: { authorId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const article = await this.prisma.article.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
                comments: {
                    where: {
                        parentId: null,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                                fullName: true,
                            },
                        },
                        replies: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        avatar: true,
                                        fullName: true,
                                    },
                                },
                            },
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: {
                        comments: true,
                    },
                },
            },
        });
        if (!article) {
            throw new common_1.NotFoundException('Article not found');
        }
        const CDN_BASE = process.env.CDN_BASE_URL ||
            `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET_NAME}`;
        const formattedComments = article.comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            author: {
                id: comment.user.id,
                username: comment.user.username,
                avatar: comment.user.avatar
                    ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`)
                    : null,
                fullName: comment.user.fullName,
            },
            replies: comment.replies ? comment.replies.map((reply) => ({
                id: reply.id,
                content: reply.content,
                createdAt: reply.createdAt,
                updatedAt: reply.updatedAt,
                author: {
                    id: reply.user.id,
                    username: reply.user.username,
                    avatar: reply.user.avatar
                        ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`)
                        : null,
                    fullName: reply.user.fullName,
                },
            })) : [],
        }));
        return {
            ...article,
            views: article.views || 0,
            _count: {
                likes: 0,
                comments: article._count.comments,
            },
            comments: formattedComments,
        };
    }
    async update(id, userId, data) {
        const article = await this.prisma.article.findUnique({
            where: { id },
        });
        if (!article) {
            throw new common_1.NotFoundException('Article not found');
        }
        if (article.authorId !== userId) {
            throw new common_1.ForbiddenException('Bu yazıyı düzenleme yetkiniz yok');
        }
        const { isPublished, ...restData } = data;
        const updateData = {
            ...restData,
            updatedAt: new Date(),
        };
        if (isPublished !== undefined) {
            if (data.scheduledAt && !article.isPublished) {
                updateData.isPublished = false;
            }
            else {
                updateData.isPublished = isPublished;
            }
        }
        if (data.scheduledAt && !article.isPublished) {
            updateData.scheduledAt = data.scheduledAt;
            if (isPublished === undefined) {
                updateData.isPublished = false;
            }
        }
        else if (data.scheduledAt === undefined) {
            delete updateData.scheduledAt;
        }
        else if (data.scheduledAt === null && !article.isPublished) {
            updateData.scheduledAt = null;
        }
        const updated = await this.prisma.article.update({
            where: { id },
            data: updateData,
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        if (updated.isPublished && this.postsGateway) {
            this.postsGateway.server.emit('articleUpdated', updated);
        }
        return updated;
    }
    async delete(id, userId) {
        const article = await this.prisma.article.findUnique({
            where: { id },
            select: { id: true, authorId: true },
        });
        if (!article) {
            throw new common_1.NotFoundException('Yazı bulunamadı.');
        }
        if (article.authorId !== userId) {
            throw new common_1.ForbiddenException('Bu yazıyı silme yetkiniz yok.');
        }
        try {
            await this.prisma.$transaction(async (tx) => {
                const commentIds = await tx.articleComment.findMany({
                    where: { articleId: id },
                    select: { id: true },
                }).then((rows) => rows.map((r) => r.id));
                if (commentIds.length > 0) {
                    await tx.articleCommentLike.deleteMany({
                        where: { commentId: { in: commentIds } },
                    });
                    await tx.articleComment.deleteMany({
                        where: { articleId: id, parentId: { not: null } },
                    });
                    await tx.articleComment.deleteMany({
                        where: { articleId: id },
                    });
                }
                await tx.article.delete({
                    where: { id },
                });
            });
            if (this.postsGateway) {
                this.postsGateway.server.emit('articleDeleted', { id });
            }
            return { success: true, message: 'Yazı silindi.' };
        }
        catch (error) {
            this.logger.error('ARTICLE_DELETE_ERROR', error?.stack ?? error?.message, { articleId: id, userId });
            if (error instanceof common_1.NotFoundException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Yazı silinirken hata oluştu.');
        }
    }
    async incrementView(id) {
        await this.prisma.article.update({
            where: { id },
            data: { views: { increment: 1 } },
        });
    }
    async createComment(articleId, userId, content) {
        const article = await this.prisma.article.findUnique({
            where: { id: articleId },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });
        if (!article) {
            throw new common_1.NotFoundException('Article not found');
        }
        const CDN_BASE = process.env.CDN_BASE_URL ||
            `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET_NAME}`;
        const comment = await this.prisma.articleComment.create({
            data: {
                articleId,
                userId,
                content,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        const formattedComment = {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            author: {
                id: comment.user.id,
                username: comment.user.username,
                avatar: comment.user.avatar
                    ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`)
                    : null,
                fullName: comment.user.fullName,
            },
        };
        if (article.authorId !== userId && this.notificationsService) {
            await this.notificationsService.createNotificationSync({
                userId: article.authorId,
                type: 'comment',
                message: `${comment.user.username} yazına yorum yaptı: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                fromUserId: userId,
                articleId: articleId,
                commentId: comment.id,
                targetUrl: `/articles/${articleId}#cmt-${comment.id}`,
            });
            console.log(`🔔 Notification created for article author: ${article.authorId}`);
        }
        if (this.articlesGateway) {
            const room = `article_${articleId}`;
            this.articlesGateway.server.to(room).emit('commentAdded', formattedComment);
            const commentsCount = await this.prisma.articleComment.count({
                where: { articleId },
            });
            this.articlesGateway.server.emit('articleUpdated', {
                id: articleId,
                _count: {
                    likes: 0,
                    comments: commentsCount,
                },
            });
            console.log(`💬 Comment added to article ${articleId}: ${comment.id}`);
        }
        return formattedComment;
    }
    async deleteComment(commentId, userId) {
        const comment = await this.prisma.articleComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot delete this comment');
        }
        await this.prisma.articleComment.delete({
            where: { id: commentId },
        });
        if (this.articlesGateway) {
            const room = `article_${comment.articleId}`;
            this.articlesGateway.server.to(room).emit('commentDeleted', { id: commentId });
            const commentsCount = await this.prisma.articleComment.count({
                where: { articleId: comment.articleId },
            });
            this.articlesGateway.server.emit('articleUpdated', {
                id: comment.articleId,
                _count: {
                    likes: 0,
                    comments: commentsCount,
                },
            });
            console.log(`🗑️ Comment deleted: ${commentId}`);
        }
        return { success: true };
    }
    async createReply(commentId, userId, content) {
        const parentComment = await this.prisma.articleComment.findUnique({
            where: { id: commentId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });
        if (!parentComment) {
            throw new common_1.NotFoundException('Parent comment not found');
        }
        const CDN_BASE = process.env.CDN_BASE_URL ||
            `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET_NAME}`;
        const reply = await this.prisma.articleComment.create({
            data: {
                articleId: parentComment.articleId,
                userId,
                content,
                parentId: commentId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        const formattedReply = {
            id: reply.id,
            content: reply.content,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt,
            parentId: reply.parentId,
            author: {
                id: reply.user.id,
                username: reply.user.username,
                avatar: reply.user.avatar
                    ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`)
                    : null,
                fullName: reply.user.fullName,
            },
        };
        if (parentComment.userId !== userId && this.notificationsService) {
            await this.notificationsService.createNotificationSync({
                userId: parentComment.userId,
                type: 'reply',
                message: `${reply.user.username} yorumuna yanıt verdi: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                fromUserId: userId,
                articleId: parentComment.articleId,
                commentId: reply.id,
                targetUrl: `/articles/${parentComment.articleId}#cmt-${reply.id}`,
            });
            console.log(`🔔 Reply notification created for comment author: ${parentComment.userId}`);
        }
        if (this.articlesGateway) {
            const room = `article_${parentComment.articleId}`;
            this.articlesGateway.server.to(room).emit('replyAdded', {
                ...formattedReply,
                parentId: commentId,
            });
            console.log(`💬 Reply added to comment ${commentId}: ${reply.id}`);
        }
        return formattedReply;
    }
    async toggleCommentLike(commentId, userId) {
        const comment = await this.prisma.articleComment.findUnique({
            where: { id: commentId },
            include: {
                user: {
                    select: { id: true, username: true },
                },
                article: {
                    select: { id: true },
                },
            },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        const existingLike = await this.prisma.articleCommentLike.findUnique({
            where: {
                commentId_userId: {
                    commentId,
                    userId,
                },
            },
        });
        if (existingLike) {
            await this.prisma.articleCommentLike.delete({
                where: { id: existingLike.id },
            });
        }
        else {
            await this.prisma.articleCommentLike.create({
                data: {
                    commentId,
                    userId,
                },
            });
            if (comment.userId !== userId && this.notificationsService) {
                await this.notificationsService.createNotificationSync({
                    userId: comment.userId,
                    type: 'comment_like',
                    message: `${comment.user.username} yorumunu beğendi.`,
                    fromUserId: userId,
                    articleId: comment.articleId,
                    commentId: commentId,
                    targetUrl: `/articles/${comment.articleId}#cmt-${commentId}`,
                });
                console.log(`🔔 Article comment like notification created for comment author: ${comment.userId}`);
            }
        }
        const likesCount = await this.prisma.articleCommentLike.count({
            where: { commentId },
        });
        return {
            liked: !existingLike,
            likesCount,
        };
    }
    async getTopLikedAuthors(limit = 4, range) {
        const articles = await this.prisma.article.findMany({
            where: {
                isPublished: true,
                ...(range
                    ? {
                        createdAt: {
                            gte: range.start,
                            lte: range.end,
                        },
                    }
                    : {}),
            },
            select: {
                id: true,
                views: true,
                authorId: true,
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
                views: 'desc',
            },
            take: 100,
        });
        const uniqueAuthors = new Map();
        for (const article of articles) {
            if (article.authorId && !uniqueAuthors.has(article.authorId)) {
                uniqueAuthors.set(article.authorId, {
                    id: article.author.id,
                    username: article.author.username,
                    fullName: article.author.fullName,
                    avatar: article.author.avatar,
                    totalViews: article.views,
                });
            }
            else if (article.authorId && uniqueAuthors.has(article.authorId)) {
                const existing = uniqueAuthors.get(article.authorId);
                existing.totalViews += article.views;
            }
            if (uniqueAuthors.size === limit)
                break;
        }
        const sortedAuthors = Array.from(uniqueAuthors.values())
            .sort((a, b) => b.totalViews - a.totalViews)
            .slice(0, limit);
        return sortedAuthors.map((author) => ({
            id: author.id,
            username: author.username,
            name: author.fullName || author.username,
            avatar: author.avatar,
        }));
    }
};
exports.ArticlesService = ArticlesService;
exports.ArticlesService = ArticlesService = ArticlesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => posts_gateway_1.PostsGateway))),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => articles_gateway_1.ArticlesGateway))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        posts_gateway_1.PostsGateway,
        articles_gateway_1.ArticlesGateway,
        notifications_service_1.NotificationsService])
], ArticlesService);
//# sourceMappingURL=articles.service.js.map