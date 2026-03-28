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
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
const analytics_service_1 = require("../analytics/analytics.service");
const feed_service_1 = require("../feed/feed.service");
const search_service_1 = require("../search/search.service");
const posts_gateway_1 = require("./posts.gateway");
const comments_gateway_1 = require("./comments.gateway");
const config_1 = require("@nestjs/config");
const limits_service_1 = require("../limits/limits.service");
const artwork_utils_1 = require("./artwork.utils");
const ticket_utils_1 = require("../tickets/ticket.utils");
const color_analysis_service_1 = require("./color-analysis.service");
const containsBadWord_1 = require("../common/utils/containsBadWord");
const chat_service_1 = require("../chat/chat.service");
const blocks_service_1 = require("../blocks/blocks.service");
const public_vitrine_user_1 = require("../common/utils/public-vitrine-user");
const comment_delete_subtree_1 = require("../common/utils/comment-delete-subtree");
const resolve_feellink_assets_1 = require("../common/resolve-feellink-assets");
const pdfkit_1 = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const pdf_lib_1 = require("pdf-lib");
function hashPostIdForLayout(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
        h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}
function buildArtworkQrUrl(frontendUrl, postId) {
    const base = frontendUrl.replace(/\/$/, '');
    return `${base}/posts/${postId}`;
}
function truncateOneLine(ctx, text, maxWidth) {
    const t = text.replace(/\s+/g, ' ').trim();
    if (!t)
        return '';
    if (ctx.measureText(t).width <= maxWidth)
        return t;
    const ell = '\u2026';
    let lo = 0;
    let hi = t.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        const slice = t.slice(0, mid) + ell;
        if (ctx.measureText(slice).width <= maxWidth)
            lo = mid;
        else
            hi = mid - 1;
    }
    return lo > 0 ? `${t.slice(0, lo)}${ell}` : ell;
}
function wrapCanvasText(ctx, text, maxWidth, maxLines) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned)
        return [];
    const words = cleaned.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const trial = current ? `${current} ${word}` : word;
        if (ctx.measureText(trial).width <= maxWidth) {
            current = trial;
            continue;
        }
        if (current) {
            lines.push(current);
            current = word;
        }
        else {
            let w = word;
            while (w.length > 1 && ctx.measureText(`${w}…`).width > maxWidth) {
                w = w.slice(0, -1);
            }
            lines.push(w.length < word.length ? `${w}…` : w);
            current = '';
        }
        if (lines.length >= maxLines) {
            const last = lines[maxLines - 1];
            lines[maxLines - 1] = truncateOneLine(ctx, last.replace(/\u2026$/, ''), maxWidth) || last;
            return lines.slice(0, maxLines);
        }
    }
    if (current && lines.length < maxLines)
        lines.push(current);
    return lines.slice(0, maxLines);
}
let PostsService = class PostsService {
    constructor(prisma, notificationsService, notificationsGateway, analyticsService, feedService, searchService, postsGateway, commentsGateway, configService, limitsService, colorAnalysisService, chatService, blocksService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.notificationsGateway = notificationsGateway;
        this.analyticsService = analyticsService;
        this.feedService = feedService;
        this.searchService = searchService;
        this.postsGateway = postsGateway;
        this.commentsGateway = commentsGateway;
        this.configService = configService;
        this.limitsService = limitsService;
        this.colorAnalysisService = colorAnalysisService;
        this.chatService = chatService;
        this.blocksService = blocksService;
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
    async assertViewerCanAccessPost(viewerId, post) {
        if (post.isDeleted || post.deletedAt != null) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (String(post.userId) === String(viewerId)) {
            return;
        }
        let isPrivate = post.user?.isPrivate;
        if (isPrivate === undefined) {
            const u = await this.prisma.user.findUnique({
                where: { id: post.userId },
                select: { isPrivate: true },
            });
            isPrivate = u?.isPrivate ?? false;
        }
        if (!isPrivate) {
            return;
        }
        const follow = await this.prisma.follow.findFirst({
            where: {
                followerId: String(viewerId),
                followingId: String(post.userId),
            },
        });
        if (!follow) {
            throw new common_1.ForbiddenException('Bu gönderiyi görüntüleme yetkiniz yok.');
        }
    }
    async sharePostToRecipients(sharerId, postId, recipientIds) {
        const raw = Array.isArray(recipientIds) ? recipientIds : [];
        const unique = [...new Set(raw.map((id) => String(id).trim()).filter(Boolean))].filter((id) => id !== String(sharerId));
        if (unique.length === 0) {
            throw new common_1.BadRequestException('En az bir alıcı seçin.');
        }
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: {
                user: { select: { id: true, username: true, isPrivate: true } },
            },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        await this.assertViewerCanAccessPost(sharerId, post);
        let sent = 0;
        const errors = [];
        for (const recipientId of unique) {
            const recipient = await this.prisma.user.findUnique({ where: { id: recipientId } });
            if (!recipient) {
                errors.push(`Kullanıcı bulunamadı: ${recipientId}`);
                continue;
            }
            if (await this.blocksService.isBlocked(sharerId, recipientId)) {
                errors.push(`@${recipient.username || recipientId} ile paylaşım yapılamıyor.`);
                continue;
            }
            try {
                const conv = await this.chatService.createConversation(sharerId, [recipientId], 'DIRECT');
                if (!conv?.id) {
                    errors.push(`Konuşma oluşturulamadı: ${recipientId}`);
                    continue;
                }
                await this.chatService.sendPostShareMessage(sharerId, conv.id, postId);
                sent += 1;
            }
            catch (e) {
                errors.push(e?.message || `Gönderilemedi: ${recipientId}`);
            }
        }
        if (sent === 0 && errors.length > 0) {
            throw new common_1.BadRequestException(errors[0]);
        }
        return { sent, skipped: unique.length - sent, errors: errors.length ? errors : undefined };
    }
    async getSharedPostPreviewsMap(viewerId, postIds) {
        const uniq = [...new Set(postIds.filter(Boolean))];
        const out = {};
        if (uniq.length === 0) {
            return out;
        }
        const posts = await this.prisma.post.findMany({
            where: { id: { in: uniq } },
            include: {
                user: { select: { id: true, username: true, isPrivate: true } },
                media: { orderBy: { order: 'asc' }, take: 1 },
            },
        });
        for (const id of uniq) {
            const p = posts.find((x) => x.id === id);
            if (!p) {
                out[id] = { postId: id, state: 'deleted' };
                continue;
            }
            if (p.isDeleted || p.deletedAt != null) {
                out[id] = { postId: id, state: 'deleted' };
                continue;
            }
            try {
                await this.assertViewerCanAccessPost(viewerId, p);
            }
            catch {
                out[id] = {
                    postId: id,
                    state: 'inaccessible',
                    username: p.user?.username ?? null,
                };
                continue;
            }
            const m0 = p.media?.[0];
            const thumbnailUrl = m0?.url ? this.transformMediaUrl(m0.url) : null;
            const title = (p.title && p.title.trim()) || null;
            const captionSnippet = p.caption ? p.caption.slice(0, 160) : null;
            out[id] = {
                postId: id,
                state: 'ok',
                thumbnailUrl,
                title: title || (p.caption ? p.caption.slice(0, 80) : null),
                username: p.user?.username ?? null,
                captionSnippet,
            };
        }
        return out;
    }
    parseArtworkCreatedDateForCreate(raw) {
        if (raw == null)
            return undefined;
        const t = String(raw).trim();
        if (!t)
            return undefined;
        const d = new Date(t);
        if (Number.isNaN(d.getTime())) {
            throw new common_1.BadRequestException('Geçersiz eser tarihi.');
        }
        return d;
    }
    resolveArtworkCreatedDateForUpdate(raw) {
        if (raw === undefined)
            return { apply: false };
        if (raw === null)
            return { apply: true, value: null };
        const t = String(raw).trim();
        if (!t)
            return { apply: true, value: null };
        const d = new Date(t);
        if (Number.isNaN(d.getTime())) {
            throw new common_1.BadRequestException('Geçersiz eser tarihi.');
        }
        return { apply: true, value: d };
    }
    async createPost(userId, dto) {
        try {
            if (!dto.media || dto.media.length === 0) {
                throw new common_1.BadRequestException('At least one media file is required');
            }
            if (dto.caption && (0, containsBadWord_1.containsBadWord)(dto.caption)) {
                throw new common_1.BadRequestException('Bu içerik topluluk kurallarına uygun değil.');
            }
            const postType = dto.type || 'post';
            console.log(`[createPost] Creating ${postType} for user ${userId}`);
            if (postType === 'artwork') {
                console.log('[createPost] Checking artwork creation limits...');
                await this.limitsService.ensureCanCreateArtwork(userId);
                console.log('[createPost] Artwork limits OK');
            }
            const hashtags = this.extractHashtags(dto.caption || '');
            let artworkCode;
            if (postType === 'artwork') {
                console.log('[createPost] Generating unique artwork code...');
                artworkCode = await (0, artwork_utils_1.generateUniqueArtworkCode)(this.prisma);
                console.log(`[createPost] Generated artwork code: ${artworkCode}`);
            }
            const artworkCreatedDateParsed = this.parseArtworkCreatedDateForCreate(dto.artworkCreatedDate);
            console.log('[createPost] Creating post in database...');
            const post = await this.prisma.post.create({
                data: {
                    userId,
                    caption: dto.caption,
                    title: dto.title,
                    location: dto.location,
                    type: postType,
                    code: artworkCode,
                    colorPalette: dto.colorPalette ?? [],
                    ...(artworkCreatedDateParsed !== undefined ? { artworkCreatedDate: artworkCreatedDateParsed } : {}),
                    isDeleted: false,
                    media: {
                        create: dto.media.map(m => ({
                            url: m.url,
                            type: m.type,
                            order: m.order,
                        })),
                    },
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
                    _count: {
                        select: {
                            likes: true,
                            comments: true,
                        },
                    },
                },
            });
            for (const tag of hashtags) {
                const hashtag = await this.prisma.hashtag.upsert({
                    where: { name: tag },
                    create: { name: tag },
                    update: { postCount: { increment: 1 } },
                });
                await this.prisma.postHashtag.create({
                    data: {
                        postId: post.id,
                        hashtagId: hashtag.id,
                    },
                });
                await this.searchService.indexHashtag(hashtag);
            }
            await this.feedService.addToFollowersFeeds(userId, post.id);
            const CDN_BASE = this.configService.get('CDN_BASE_URL') ||
                `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;
            const [likeCount, commentCount] = await Promise.all([
                this.prisma.like.count({ where: { postId: post.id } }),
                this.prisma.comment.count({ where: { postId: post.id, parentId: null } }),
            ]);
            const postPayload = {
                id: post.id,
                caption: post.caption,
                imageUrl: post.media && post.media.length > 0 ? post.media[0].url : null,
                likeCount: likeCount,
                commentCount: commentCount,
                createdAt: post.createdAt.toISOString(),
                author: {
                    id: post.user.id,
                    username: post.user.username,
                    fullName: post.user.fullName,
                    avatarUrl: post.user.avatar ? (post.user.avatar.startsWith('http') ? post.user.avatar : `${CDN_BASE}/${post.user.avatar}`) : null,
                    isVerified: post.user.isVerified,
                },
            };
            if (this.postsGateway) {
                this.postsGateway.server.emit('postCreated', postPayload);
                console.log(`📡 Post created event broadcasted: ${post.id}`);
            }
            console.log(`[createPost] ✅ Post created successfully: ${post.id}`);
            return post;
        }
        catch (error) {
            console.error('[createPost] ❌ Error:', {
                message: error?.message,
                stack: error?.stack?.split('\n').slice(0, 3),
                userId,
                postType: dto.type,
            });
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.ForbiddenException ||
                error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException(error?.message || 'Gönderi oluşturulurken bir hata oluştu');
        }
    }
    async getPost(postId, currentUserId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                        isPrivate: true,
                    },
                },
                media: {
                    orderBy: { order: 'asc' },
                },
                hashtags: {
                    include: {
                        hashtag: true,
                    },
                },
            },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (currentUserId) {
            await this.assertViewerCanAccessPost(currentUserId, post);
        }
        const allComments = await this.prisma.comment.findMany({
            where: {
                postId: postId,
            },
            select: {
                id: true,
                postId: true,
                parentId: true,
                content: true,
            },
        });
        console.log(`🔍 [getPost] Post "${postId}" (type: ${typeof postId}) için toplam ${allComments.length} yorum bulundu (parentId kontrolü olmadan):`, allComments.map((c) => ({ id: c.id, postId: c.postId, postIdType: typeof c.postId, parentId: c.parentId })));
        const comments = await this.prisma.comment.findMany({
            where: {
                postId: String(postId),
                parentId: null,
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
                _count: {
                    select: {
                        likes: true,
                    },
                },
                likes: currentUserId ? {
                    where: {
                        userId: currentUserId,
                    },
                    select: {
                        id: true,
                    },
                } : false,
                replies: {
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
                        _count: {
                            select: {
                                likes: true,
                            },
                        },
                        likes: currentUserId ? {
                            where: {
                                userId: currentUserId,
                            },
                            select: {
                                id: true,
                            },
                        } : false,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        let isLiked = false;
        let isSaved = false;
        if (currentUserId) {
            const pid = String(postId);
            const uid = String(currentUserId);
            const [like, savedPost, savedArtwork] = await Promise.all([
                this.prisma.like.findFirst({
                    where: {
                        postId: pid,
                        userId: uid,
                    },
                }),
                this.prisma.savedPost.findFirst({
                    where: {
                        userId: uid,
                        postId: pid,
                    },
                }),
                this.prisma.savedArtwork.findFirst({
                    where: {
                        userId: uid,
                        postId: pid,
                    },
                }),
            ]);
            isLiked = !!like;
            isSaved = !!savedPost || !!savedArtwork;
            if (isSaved) {
                console.log(`✅ [getPost] Post ${postId} isSaved=true (savedPost: ${!!savedPost}, savedArtwork: ${!!savedArtwork})`);
            }
        }
        const pidForCount = String(postId);
        const [likeCount, commentCount] = await Promise.all([
            this.prisma.like.count({ where: { postId: pidForCount } }),
            this.prisma.comment.count({ where: { postId: pidForCount, parentId: null } }),
        ]);
        const CDN_BASE = this.configService.get('CDN_BASE_URL') ||
            `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;
        console.log(`📝 [getPost] Post ${postId} için ${comments.length} yorum bulundu:`, comments.map((c) => ({ id: c.id, content: c.content?.substring(0, 30) })));
        const formattedComments = comments.map((comment) => ({
            id: comment.id,
            postId: comment.postId,
            parentId: comment.parentId,
            content: comment.content,
            createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
            updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt.toISOString() : comment.updatedAt,
            userId: comment.userId,
            isPinned: comment.isPinned || false,
            isLikedByCurrentUser: comment.likes && comment.likes.length > 0,
            likesCount: comment._count?.likes || 0,
            user: {
                id: comment.user.id,
                username: comment.user.username,
                fullName: comment.user.fullName,
                avatar: comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`) : null,
                isVerified: comment.user.isVerified || false,
            },
            replies: (comment.replies || []).map((reply) => ({
                id: reply.id,
                postId: reply.postId,
                parentId: reply.parentId,
                content: reply.content,
                createdAt: reply.createdAt instanceof Date ? reply.createdAt.toISOString() : reply.createdAt,
                updatedAt: reply.updatedAt instanceof Date ? reply.updatedAt.toISOString() : reply.updatedAt,
                userId: reply.userId,
                isLikedByCurrentUser: reply.likes && reply.likes.length > 0,
                likesCount: reply._count?.likes || 0,
                user: {
                    id: reply.user.id,
                    username: reply.user.username,
                    fullName: reply.user.fullName,
                    avatar: reply.user.avatar ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`) : null,
                    isVerified: reply.user.isVerified || false,
                },
            })),
        }));
        const transformedMedia = post.media?.map((m) => ({
            ...m,
            url: this.transformMediaUrl(m.url),
        })) || [];
        const transformedUser = {
            ...post.user,
            avatar: this.transformAvatarUrl(post.user.avatar),
        };
        const artworkCreatedDateIso = post.artworkCreatedDate != null
            ? post.artworkCreatedDate instanceof Date
                ? post.artworkCreatedDate.toISOString()
                : String(post.artworkCreatedDate)
            : null;
        return {
            ...post,
            id: post.id,
            userId: post.userId,
            caption: post.caption,
            title: post.title,
            location: post.location,
            type: post.type,
            artworkCreatedDate: artworkCreatedDateIso,
            createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
            updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
            media: transformedMedia,
            user: transformedUser,
            comments: formattedComments,
            isLiked,
            isSaved,
            _count: {
                likes: likeCount,
                comments: commentCount,
            },
        };
    }
    async updatePost(postId, userId, data) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (post.userId !== userId) {
            throw new common_1.ForbiddenException('Cannot update this post');
        }
        if (data.caption && (0, containsBadWord_1.containsBadWord)(data.caption)) {
            throw new common_1.BadRequestException('Bu içerik topluluk kurallarına uygun değil.');
        }
        const datePatch = this.resolveArtworkCreatedDateForUpdate(data.artworkCreatedDate);
        const updatedPost = await this.prisma.post.update({
            where: { id: postId },
            data: {
                ...(data.caption !== undefined && { caption: data.caption }),
                ...(data.title !== undefined && { title: data.title }),
                ...(datePatch.apply && { artworkCreatedDate: datePatch.value }),
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
        });
        if (this.postsGateway) {
            this.postsGateway.server.emit('post:updated', { postId, post: updatedPost });
            console.log(`✏️ Post updated event broadcasted: ${postId}`);
        }
        return updatedPost;
    }
    async deletePost(postId, userId) {
        if (!postId || postId === 'undefined' || postId === 'null') {
            throw new common_1.BadRequestException('Valid post ID is required');
        }
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (post.isDeleted) {
            return { success: true, message: 'Post already deleted' };
        }
        if (post.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own posts');
        }
        try {
            await this.prisma.post.update({
                where: { id: postId },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                },
            });
            try {
                await this.feedService.removeFromFeeds(postId);
            }
            catch (error) {
                console.warn('[deletePost] Feed removal failed:', error);
            }
            if (this.postsGateway) {
                try {
                    this.postsGateway.server.emit('post:deleted', postId);
                    console.log(`🗑️ Post deleted event broadcasted: ${postId}`);
                }
                catch (error) {
                    console.warn('[deletePost] Socket broadcast failed:', error);
                }
            }
            return { success: true, message: 'Post deleted successfully' };
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException('Post not found or already deleted');
            }
            console.error('[deletePost] error:', error);
            throw new common_1.BadRequestException('Failed to delete post');
        }
    }
    async likePost(postId, userId) {
        const pid = String(postId);
        const uid = String(userId);
        console.log(`❤️ [likePost] ========== START ==========`);
        console.log(`❤️ [likePost] User ${uid} liking post ${pid}`);
        const post = await this.prisma.post.findUnique({
            where: { id: pid },
        });
        if (!post) {
            console.error(`❌ [likePost] Post ${pid} NOT FOUND!`);
            throw new common_1.NotFoundException('Post not found');
        }
        console.log(`✅ [likePost] Post found: ${post.id}`);
        const existingLike = await this.prisma.like.findFirst({
            where: {
                postId: pid,
                userId: uid,
            },
        });
        if (!existingLike) {
            console.log(`💾 [likePost] Creating new like...`);
            await this.prisma.like.create({
                data: {
                    postId: pid,
                    userId: uid,
                },
            });
            console.log(`✅ [likePost] Like created successfully!`);
        }
        else {
            console.log(`⚠️ [likePost] Like already exists - skipping create`);
        }
        const likeCount = await this.prisma.like.count({
            where: { postId: pid },
        });
        console.log(`✅ [likePost] Total likes: ${likeCount}`);
        console.log(`❤️ [likePost] ========== SUCCESS ==========`);
        if (post.userId !== userId) {
            const allowed = await this.notificationsService.isAllowed(post.userId, 'like');
            if (allowed) {
                await this.notificationsService.createNotification({
                    userId: post.userId,
                    type: 'like',
                    fromUserId: userId,
                    postId,
                    targetUrl: `/posts/${postId}`,
                });
            }
            else {
                console.log(`⏭️ Like notification skipped for post owner (preference disabled)`);
            }
        }
        if (this.postsGateway) {
            this.postsGateway.server.emit('postLikeUpdated', {
                postId,
                change: +1,
                likeCount: likeCount,
                isLiked: true,
                userId,
            });
            this.postsGateway.server.emit('post:like', {
                postId,
                likes: likeCount,
            });
            console.log(`❤️ Post liked event broadcasted: ${postId}, likeCount: ${likeCount}`);
        }
        try {
            const postOwner = await this.prisma.user.findUnique({
                where: { id: post.userId },
                select: { roles: true },
            });
            if (postOwner && Array.isArray(postOwner.roles) && postOwner.roles.includes('corporate')) {
                const topVisitors = await this.analyticsService.getTopVisitors(post.userId);
                this.notificationsGateway.emitVisitorUpdate(post.userId, topVisitors);
            }
        }
        catch (error) {
            console.error('Error updating visitor analytics:', error);
        }
        return { success: true, liked: true, likeCount: likeCount };
    }
    async unlikePost(postId, userId) {
        const pid = String(postId);
        const uid = String(userId);
        console.log(`💔 [unlikePost] ========== START ==========`);
        console.log(`💔 [unlikePost] User ${uid} unliking post ${pid}`);
        const post = await this.prisma.post.findUnique({
            where: { id: pid },
        });
        if (!post) {
            console.error(`❌ [unlikePost] Post ${pid} NOT FOUND!`);
            throw new common_1.NotFoundException('Post not found');
        }
        console.log(`✅ [unlikePost] Post found: ${post.id}`);
        const deleteResult = await this.prisma.like.deleteMany({
            where: {
                postId: pid,
                userId: uid,
            },
        });
        console.log(`🗑️ [unlikePost] Deleted ${deleteResult.count} like(s)`);
        const likeCount = await this.prisma.like.count({
            where: { postId: pid },
        });
        console.log(`✅ [unlikePost] Total likes: ${likeCount}`);
        console.log(`💔 [unlikePost] ========== SUCCESS ==========`);
        if (this.postsGateway) {
            this.postsGateway.server.emit('postLikeUpdated', {
                postId,
                change: -1,
                likeCount: likeCount,
                isLiked: false,
                userId,
            });
            this.postsGateway.server.emit('post:like', {
                postId,
                likes: likeCount,
            });
            console.log(`💔 Post unliked event broadcasted: ${postId}, likeCount: ${likeCount}`);
        }
        return { success: true, liked: false, likeCount: likeCount };
    }
    async createComment(postId, userId, content, parentId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        console.log(`💬 [createComment] Yorum oluşturuluyor - postId: "${postId}" (type: ${typeof postId}), userId: ${userId}, content: ${content.substring(0, 50)}`);
        const comment = await this.prisma.comment.create({
            data: {
                postId: String(postId),
                userId: String(userId),
                content: String(content),
                parentId: parentId ? String(parentId) : null,
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
                _count: {
                    select: {
                        replies: true,
                    },
                },
            },
        });
        console.log(`✅ [createComment] Yorum oluşturuldu - id: ${comment.id}, postId: "${comment.postId}" (type: ${typeof comment.postId}, length: ${comment.postId?.length}), userId: ${comment.userId}`);
        const verifyComment = await this.prisma.comment.findUnique({
            where: { id: comment.id },
            select: { id: true, postId: true, content: true },
        });
        console.log(`✅ [createComment] Yorum doğrulandı - id: ${verifyComment?.id}, postId: "${verifyComment?.postId}"`);
        if (post.userId !== userId) {
            const allowed = await this.notificationsService.isAllowed(post.userId, 'comment');
            if (allowed) {
                await this.notificationsService.createNotification({
                    userId: post.userId,
                    type: 'comment',
                    fromUserId: userId,
                    postId,
                    commentId: comment.id,
                    targetUrl: `/posts/${postId}`,
                });
            }
            else {
                console.log(`⏭️ Comment notification skipped for post owner (preference disabled)`);
            }
        }
        if (parentId) {
            const parentComment = await this.prisma.comment.findUnique({
                where: { id: parentId },
                include: { user: true },
            });
            if (parentComment && parentComment.userId !== userId) {
                const allowed = await this.notificationsService.isAllowed(parentComment.userId, 'reply');
                if (allowed) {
                    await this.notificationsService.createNotificationSync({
                        userId: parentComment.userId,
                        type: 'reply',
                        fromUserId: userId,
                        postId,
                        commentId: comment.id,
                        message: `${comment.user.username} yorumuna yanıt verdi: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                        targetUrl: `/posts/${postId}`,
                    });
                }
                else {
                    console.log(`⏭️ Reply notification skipped (preference disabled)`);
                }
            }
        }
        const mentionRegex = /@(\w+)/g;
        const mentions = Array.from(content.matchAll(mentionRegex)).map((match) => match[1]);
        if (mentions.length > 0) {
            const mentionedUsers = await this.prisma.user.findMany({
                where: {
                    username: { in: mentions },
                    id: { not: userId },
                },
                select: {
                    id: true,
                    username: true,
                },
            });
            for (const mentionedUser of mentionedUsers) {
                const allowed = await this.notificationsService.isAllowed(mentionedUser.id, 'mention');
                if (!allowed) {
                    console.log(`⏭️ Mention notification skipped for ${mentionedUser.username} (preference disabled)`);
                    continue;
                }
                await this.notificationsService.createNotificationSync({
                    userId: mentionedUser.id,
                    type: 'mention',
                    fromUserId: userId,
                    postId,
                    commentId: comment.id,
                    message: `${comment.user.username} seni bir yorumda etiketledi`,
                    targetUrl: `/posts/${postId}`,
                });
                console.log(`🔔 Mention notification sent to ${mentionedUser.username} from ${comment.user.username}`);
            }
        }
        const CDN_BASE = this.configService.get('CDN_BASE_URL') ||
            `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;
        const commentPayload = {
            id: comment.id,
            postId: comment.postId,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            parentId: comment.parentId,
            user: {
                id: comment.user.id,
                username: comment.user.username,
                fullName: comment.user.fullName,
                avatarUrl: comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`) : null,
                isVerified: comment.user.isVerified,
            },
            replies: [],
        };
        if (this.commentsGateway) {
            const room = `post_${postId}`;
            this.commentsGateway.server.to(room).emit('newComment', commentPayload);
            this.commentsGateway.server.emit('commentCreated', {
                ...commentPayload,
                change: +1,
            });
            console.log(`💬 Comment created event broadcasted: ${comment.id}`);
        }
        if (this.postsGateway) {
            const updatedPost = await this.prisma.post.findUnique({
                where: { id: postId },
                include: {
                    _count: {
                        select: {
                            comments: true,
                        },
                    },
                },
            });
            if (updatedPost) {
                this.postsGateway.server.emit('post:comment', {
                    postId,
                    comments: updatedPost._count.comments,
                });
            }
        }
        try {
            const postOwner = await this.prisma.user.findUnique({
                where: { id: post.userId },
                select: { roles: true },
            });
            if (postOwner && Array.isArray(postOwner.roles) && postOwner.roles.includes('corporate')) {
                const topVisitors = await this.analyticsService.getTopVisitors(post.userId);
                this.notificationsGateway.emitVisitorUpdate(post.userId, topVisitors);
            }
        }
        catch (error) {
            console.error('Error updating visitor analytics:', error);
        }
        const CDN_BASE_RESPONSE = this.configService.get('CDN_BASE_URL') ||
            `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;
        const avatarUrl = comment.user.avatar
            ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE_RESPONSE}/${comment.user.avatar}`)
            : null;
        return {
            id: comment.id,
            postId: comment.postId,
            userId: comment.userId,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt.toISOString() : comment.updatedAt,
            parentId: comment.parentId ?? undefined,
            isPinned: comment.isPinned ?? false,
            isLikedByCurrentUser: false,
            likesCount: 0,
            user: {
                id: comment.user.id,
                username: comment.user.username,
                fullName: comment.user.fullName,
                avatar: avatarUrl,
                isVerified: comment.user.isVerified ?? false,
            },
            replies: [],
        };
    }
    async getUserComments(userId) {
        const comments = await this.prisma.comment.findMany({
            where: {
                userId: userId,
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
                post: {
                    select: {
                        id: true,
                        caption: true,
                        media: {
                            orderBy: { order: 'asc' },
                            take: 1,
                            select: {
                                url: true,
                                type: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return comments;
    }
    async getComments(postId, parentId) {
        if (parentId) {
            return this.prisma.comment.findMany({
                where: {
                    postId,
                    parentId,
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
                },
                orderBy: { createdAt: 'asc' },
            });
        }
        const comments = await this.prisma.comment.findMany({
            where: {
                postId: postId,
                parentId: null,
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
                replies: {
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
                    },
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: {
                        replies: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const CDN_BASE = this.configService.get('CDN_BASE_URL') ||
            `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}/${this.configService.get('MINIO_BUCKET_NAME')}`;
        return comments.map((comment) => ({
            id: comment.id,
            postId: comment.postId,
            parentId: comment.parentId,
            content: comment.content,
            createdAt: comment.createdAt,
            user: {
                id: comment.user.id,
                username: comment.user.username,
                fullName: comment.user.fullName,
                avatar: comment.user.avatar ? (comment.user.avatar.startsWith('http') ? comment.user.avatar : `${CDN_BASE}/${comment.user.avatar}`) : null,
                isVerified: comment.user.isVerified,
            },
            replies: comment.replies.map((reply) => ({
                id: reply.id,
                postId: reply.postId,
                parentId: reply.parentId,
                content: reply.content,
                createdAt: reply.createdAt,
                user: {
                    id: reply.user.id,
                    username: reply.user.username,
                    fullName: reply.user.fullName,
                    avatar: reply.user.avatar ? (reply.user.avatar.startsWith('http') ? reply.user.avatar : `${CDN_BASE}/${reply.user.avatar}`) : null,
                    isVerified: reply.user.isVerified,
                },
            })),
            _count: comment._count,
        }));
    }
    async updateComment(commentId, userId, content) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                post: {
                    select: { userId: true },
                },
            },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to edit this comment');
        }
        const updatedComment = await this.prisma.comment.update({
            where: { id: commentId },
            data: { content },
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
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
            },
        });
        if (this.commentsGateway) {
            const room = `post_${comment.postId}`;
            this.commentsGateway.server.to(room).emit('commentUpdated', {
                id: updatedComment.id,
                postId: comment.postId,
                content: updatedComment.content,
                updatedAt: updatedComment.updatedAt,
            });
        }
        return {
            id: updatedComment.id,
            content: updatedComment.content,
            updatedAt: updatedComment.updatedAt,
            createdAt: updatedComment.createdAt,
            user: updatedComment.user,
            likesCount: updatedComment._count.likes,
            repliesCount: updatedComment._count.replies,
        };
    }
    async deleteComment(commentId, userId) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                post: {
                    select: { userId: true },
                },
            },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.userId !== userId && comment.post.userId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this comment');
        }
        const postId = comment.postId;
        const deletedCount = await this.prisma.$transaction(async (tx) => (0, comment_delete_subtree_1.deleteCommentSubtreeTx)(tx, commentId));
        if (this.commentsGateway) {
            const room = `post_${postId}`;
            this.commentsGateway.server.to(room).emit('commentDeleted', {
                id: commentId,
                postId,
                deletedCount,
            });
            this.commentsGateway.server.emit('commentDeleted', {
                id: commentId,
                postId,
                change: -deletedCount,
                deletedCount,
            });
            console.log(`🗑️ Comment deleted event broadcasted: ${commentId} (${deletedCount} row(s))`);
        }
        if (this.postsGateway) {
            const updatedPost = await this.prisma.post.findUnique({
                where: { id: postId },
                include: {
                    _count: {
                        select: {
                            comments: true,
                        },
                    },
                },
            });
            if (updatedPost) {
                this.postsGateway.server.emit('post:comment', {
                    postId,
                    comments: updatedPost._count.comments,
                });
            }
        }
        return {
            success: true,
            message: 'Comment deleted successfully',
            deletedCount,
        };
    }
    async toggleCommentReaction(userId, commentId, emoji) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        const existing = await this.prisma.commentReaction.findUnique({
            where: {
                commentId_userId_emoji: {
                    commentId,
                    userId,
                    emoji,
                },
            },
        });
        if (existing) {
            await this.prisma.commentReaction.delete({
                where: { id: existing.id },
            });
            if (this.commentsGateway) {
                this.commentsGateway.server.emit('commentReactionUpdated', {
                    commentId,
                    emoji,
                    change: -1,
                    userId,
                });
                console.log(`💔 Comment reaction removed: ${commentId} ${emoji}`);
            }
            return { reacted: false };
        }
        await this.prisma.commentReaction.create({
            data: {
                commentId,
                userId,
                emoji,
            },
        });
        if (this.commentsGateway) {
            this.commentsGateway.server.emit('commentReactionUpdated', {
                commentId,
                emoji,
                change: +1,
                userId,
            });
            console.log(`❤️ Comment reaction added: ${commentId} ${emoji}`);
        }
        return { reacted: true };
    }
    async getCommentReactions(commentId) {
        const reactions = await this.prisma.commentReaction.groupBy({
            by: ['emoji'],
            where: { commentId },
            _count: {
                emoji: true,
            },
        });
        return reactions.map((r) => ({
            emoji: r.emoji,
            count: r._count.emoji,
        }));
    }
    async getUserCommentReactions(commentId, userId) {
        const reactions = await this.prisma.commentReaction.findMany({
            where: {
                commentId,
                userId,
            },
            select: {
                emoji: true,
            },
        });
        return reactions.map((r) => r.emoji);
    }
    async getUserPosts(userId, currentUserId, type) {
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.warn(`⚠️ [PostsService] getUserPosts called with invalid userId: ${userId}`);
            return [];
        }
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
        let actualUserId = userId;
        if (!isObjectId) {
            console.log(`🔍 [PostsService] userId looks like username, searching for user: ${userId}`);
            const allUsers = await this.prisma.user.findMany({
                select: { id: true, username: true },
            });
            const normalizedSearch = userId.toLowerCase().trim();
            const foundUser = allUsers.find((u) => u.username?.toLowerCase().trim() === normalizedSearch);
            if (!foundUser) {
                console.warn(`⚠️ [PostsService] User not found by username: ${userId}`);
                return [];
            }
            actualUserId = foundUser.id;
            console.log(`✅ [PostsService] Found user by username: ${userId} -> ${actualUserId}`);
        }
        if (currentUserId && currentUserId !== actualUserId) {
            const targetUser = await this.prisma.user.findUnique({
                where: { id: actualUserId },
            });
            if (!targetUser) {
                console.warn(`⚠️ [PostsService] User not found: ${actualUserId}`);
                return [];
            }
            if (targetUser.isPrivate) {
                const isFollowing = await this.prisma.follow.findFirst({
                    where: {
                        followerId: currentUserId,
                        followingId: actualUserId,
                    },
                });
                if (!isFollowing) {
                    throw new common_1.ForbiddenException('Cannot view posts from private account');
                }
            }
        }
        const whereClause = {
            userId: actualUserId,
            isDeleted: false,
        };
        if (type) {
            whereClause.type = type;
        }
        const posts = await this.prisma.post.findMany({
            where: whereClause,
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
        if (currentUserId) {
            const postIds = postsWithCounts.map(p => p.id);
            const likes = await this.prisma.like.findMany({
                where: {
                    postId: { in: postIds },
                    userId: currentUserId,
                },
            });
            const likedPostIds = new Set(likes.map(l => l.postId));
            return postsWithCounts.map(post => {
                const transformedMedia = post.media?.map((m) => ({
                    ...m,
                    url: this.transformMediaUrl(m.url),
                })) || [];
                return {
                    ...post,
                    id: post.id,
                    title: post.title || null,
                    caption: post.caption || null,
                    type: post.type || 'post',
                    media: transformedMedia,
                    isLiked: likedPostIds.has(post.id),
                };
            });
        }
        return postsWithCounts.map(post => {
            const transformedMedia = post.media?.map((m) => ({
                ...m,
                url: this.transformMediaUrl(m.url),
            })) || [];
            return {
                ...post,
                id: post.id,
                title: post.title || null,
                caption: post.caption || null,
                type: post.type || 'post',
                media: transformedMedia,
                isLiked: false,
            };
        });
    }
    extractHashtags(text) {
        const hashtagRegex = /#(\w+)/g;
        const matches = text.match(hashtagRegex);
        return matches ? matches.map(m => m.substring(1).toLowerCase()) : [];
    }
    async savePost(postId, userId) {
        console.log(`💾 [savePost] ========== START ==========`);
        console.log(`💾 [savePost] User ${userId} saving post ${postId}`);
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });
        if (!post) {
            console.error(`❌ [savePost] Post ${postId} not found`);
            throw new common_1.NotFoundException('Post not found');
        }
        console.log(`✅ [savePost] Post found: ${post.id}, type: ${post.type}`);
        if (post.type === 'artwork') {
            console.warn(`⚠️ [savePost] Post is artwork! Frontend /save-artwork endpoint kullanmalı!`);
        }
        const existing = await this.prisma.savedPost.findFirst({
            where: {
                userId,
                postId,
            },
        });
        if (existing) {
            console.log(`⚠️ [savePost] Post already saved`);
            return { success: true, message: 'Post already saved' };
        }
        console.log(`💾 [savePost] Creating new savedPost entry...`);
        try {
            const savedPost = await this.prisma.savedPost.create({
                data: {
                    userId,
                    postId,
                },
            });
            console.log(`✅ [savePost] SavedPost created successfully: ${savedPost.id}`);
            console.log(`✅ [savePost] ========== SUCCESS ==========`);
            return { success: true, message: 'Post saved successfully', savedPost };
        }
        catch (error) {
            console.error(`❌ [savePost] Failed to create savedPost:`, {
                message: error?.message,
                code: error?.code,
                userId,
                postId,
            });
            throw error;
        }
    }
    async unsavePost(postId, userId) {
        console.log(`🗑️ [unsavePost] User ${userId} unsaving post ${postId}`);
        try {
            const savedPost = await this.prisma.savedPost.findFirst({
                where: {
                    userId,
                    postId,
                },
            });
            if (savedPost) {
                await this.prisma.savedPost.delete({
                    where: {
                        id: savedPost.id,
                    },
                });
                console.log(`✅ [unsavePost] SavedPost deleted: ${savedPost.id}`);
            }
            else {
                console.log(`⚠️ [unsavePost] SavedPost not found (already unsaved)`);
            }
        }
        catch (error) {
            console.error(`❌ [unsavePost] Error:`, error?.message);
        }
        return { success: true, message: 'Post unsaved successfully' };
    }
    async getSavedPosts(userId) {
        try {
            console.log(`🔖 [getSavedPosts] ========== START ==========`);
            console.log(`🔖 [getSavedPosts] QUERY - userId: ${userId}`);
            console.log(`🔖 [getSavedPosts] Querying SavedPost and SavedArtwork tables...`);
            const [savedPosts, savedArtworks] = await Promise.all([
                this.prisma.savedPost.findMany({
                    where: { userId },
                    include: {
                        post: {
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
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.savedArtwork.findMany({
                    where: { userId },
                    include: {
                        post: {
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
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
            console.log(`✅ [getSavedPosts] RAW QUERY RESULT: ${savedPosts.length} posts + ${savedArtworks.length} artworks`);
            if (savedPosts.length > 0) {
                console.log(`✅ [getSavedPosts] First SavedPost:`, {
                    id: savedPosts[0]?.id,
                    postId: savedPosts[0]?.postId,
                    userId: savedPosts[0]?.userId,
                    hasPost: !!savedPosts[0]?.post,
                    postDeleted: savedPosts[0]?.post?.isDeleted,
                    hasMedia: !!savedPosts[0]?.post?.media,
                    mediaCount: savedPosts[0]?.post?.media?.length,
                });
            }
            else {
                console.warn(`⚠️ [getSavedPosts] NO SAVED POSTS FOUND FOR userId: ${userId}`);
                console.warn(`⚠️ [getSavedPosts] Bu kullanıcı hiç post kaydetmemiş olabilir!`);
            }
            const allSaved = [...savedPosts, ...savedArtworks];
            const validSavedPosts = allSaved.filter((sp) => {
                if (!sp.post) {
                    console.log(`⚠️ [getSavedPosts] SKIP: null post - savedItem: ${sp.id}`);
                    return false;
                }
                if (sp.post.isDeleted === true) {
                    console.log(`⚠️ [getSavedPosts] SKIP: deleted - postId: ${sp.postId}`);
                    return false;
                }
                if (!sp.post.media || sp.post.media.length === 0) {
                    console.warn(`⚠️ [getSavedPosts] WARNING: No media - postId: ${sp.postId} (keeping anyway)`);
                }
                if (sp.post.media && sp.post.media.length > 0) {
                    const firstMedia = sp.post.media[0];
                    if (!firstMedia || !firstMedia.url) {
                        console.warn(`⚠️ [getSavedPosts] WARNING: Null media URL - postId: ${sp.postId} (keeping anyway)`);
                    }
                }
                console.log(`✅ [getSavedPosts] VALID: postId: ${sp.postId}, hasMedia: ${!!sp.post.media?.length}`);
                return true;
            });
            validSavedPosts.sort((a, b) => {
                const aDate = new Date(a.createdAt).getTime();
                const bDate = new Date(b.createdAt).getTime();
                return bDate - aDate;
            });
            console.log(`✅ [getSavedPosts] Valid items: ${validSavedPosts.length} (sorted by date)`);
            if (validSavedPosts.length === 0) {
                return [];
            }
            const postIds = validSavedPosts.map(sp => sp.postId);
            const likes = await this.prisma.like.findMany({
                where: {
                    postId: { in: postIds },
                    userId,
                },
            });
            const likedPostIds = new Set(likes.map(l => l.postId));
            const likeCounts = await Promise.all(postIds.map(async (postId) => ({
                postId,
                count: await this.prisma.like.count({ where: { postId } }),
            })));
            const commentCounts = await Promise.all(postIds.map(async (postId) => ({
                postId,
                count: await this.prisma.comment.count({ where: { postId, parentId: null } }),
            })));
            const likeCountMap = new Map(likeCounts.map(lc => [lc.postId, lc.count]));
            const commentCountMap = new Map(commentCounts.map(cc => [cc.postId, cc.count]));
            const result = validSavedPosts.map(savedPost => ({
                ...savedPost.post,
                isLiked: likedPostIds.has(savedPost.postId),
                savedAt: savedPost.createdAt,
                _count: {
                    likes: likeCountMap.get(savedPost.postId) || 0,
                    comments: commentCountMap.get(savedPost.postId) || 0,
                },
            }));
            console.log(`✅ [getSavedPosts] Returning ${result.length} posts`);
            return result;
        }
        catch (error) {
            console.error('❌ [getSavedPosts] ERROR:', error?.message, error?.stack);
            return [];
        }
    }
    async saveArtwork(postId, userId) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new common_1.NotFoundException('Artwork not found');
        }
        if (post.type !== 'artwork') {
            throw new common_1.BadRequestException('This post is not an artwork');
        }
        const existing = await this.prisma.savedArtwork.findFirst({
            where: {
                userId,
                postId,
            },
        });
        if (existing) {
            return { success: true, message: 'Artwork already saved' };
        }
        const saved = await this.prisma.savedArtwork.create({
            data: {
                userId,
                postId,
            },
        });
        console.log('✅ Artwork saved to database:', { id: saved.userId, postId: saved.postId });
        return { success: true, message: 'Artwork saved successfully', saved: true };
    }
    async unsaveArtwork(postId, userId) {
        try {
            const savedArtwork = await this.prisma.savedArtwork.findFirst({
                where: {
                    userId,
                    postId,
                },
            });
            if (savedArtwork) {
                await this.prisma.savedArtwork.delete({
                    where: {
                        id: savedArtwork.id,
                    },
                });
                console.log('✅ Artwork unsaved from database:', { userId: savedArtwork.userId, postId: savedArtwork.postId });
            }
            else {
                console.log('⚠️ Artwork not found (already unsaved)');
            }
        }
        catch (error) {
            console.warn('⚠️ Artwork unsave error:', error?.message);
        }
        return { success: true, message: 'Artwork unsaved successfully', saved: false };
    }
    async getSavedArtworks(userId) {
        const savedArtworks = await this.prisma.savedArtwork.findMany({
            where: {
                userId,
                post: {
                    type: 'artwork',
                },
            },
            include: {
                post: {
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
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const validArtworks = savedArtworks.filter((sa) => sa.post !== null);
        const postIds = validArtworks.map(sa => sa.postId);
        const likes = await this.prisma.like.findMany({
            where: {
                postId: { in: postIds },
                userId,
            },
        });
        const likedPostIds = new Set(likes.map(l => l.postId));
        return validArtworks.map(savedArtwork => ({
            ...savedArtwork.post,
            isLiked: likedPostIds.has(savedArtwork.postId),
            savedAt: savedArtwork.createdAt,
        }));
    }
    async getSaved(userId) {
        return this.getSavedPosts(userId);
    }
    async toggleCommentLike(commentId, userId) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                user: {
                    select: { id: true, username: true },
                },
            },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        const existingLike = await this.prisma.commentLike.findUnique({
            where: {
                commentId_userId: {
                    commentId,
                    userId,
                },
            },
        });
        if (existingLike) {
            await this.prisma.commentLike.delete({
                where: { id: existingLike.id },
            });
        }
        else {
            await this.prisma.commentLike.create({
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
                    postId: comment.postId,
                    commentId: commentId,
                    targetUrl: `/posts/${comment.postId}#cmt-${commentId}`,
                });
                console.log(`🔔 Comment like notification created for comment author: ${comment.userId}`);
            }
        }
        const likesCount = await this.prisma.commentLike.count({
            where: { commentId },
        });
        if (this.commentsGateway) {
            const room = `post_${comment.postId}`;
            this.commentsGateway.server.to(room).emit('commentLikeUpdated', {
                commentId,
                postId: comment.postId,
                liked: !existingLike,
                likesCount,
                userId,
            });
            this.commentsGateway.server.emit('commentLikeUpdated', {
                commentId,
                postId: comment.postId,
                liked: !existingLike,
                likesCount,
                userId,
            });
            console.log(`💬 Comment like updated event broadcasted: ${commentId} (liked: ${!existingLike}, count: ${likesCount})`);
        }
        return {
            liked: !existingLike,
            likesCount,
        };
    }
    async toggleCommentPin(commentId, userId, pinned) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                post: {
                    select: { userId: true },
                },
            },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.post.userId !== userId) {
            throw new common_1.ForbiddenException('Only the post owner can pin/unpin comments');
        }
        if (pinned) {
            await this.prisma.comment.updateMany({
                where: {
                    postId: comment.postId,
                    isPinned: true,
                    id: { not: commentId },
                },
                data: {
                    isPinned: false,
                },
            });
        }
        const updatedComment = await this.prisma.comment.update({
            where: { id: commentId },
            data: {
                isPinned: pinned,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        roles: true,
                        plan: true,
                    },
                },
                post: {
                    select: {
                        id: true,
                    },
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                    },
                },
            },
        });
        if (pinned && updatedComment.userId !== userId) {
            const allowed = await this.notificationsService.isAllowed(updatedComment.userId, 'comment_pinned');
            if (allowed) {
                await this.notificationsService.createNotificationSync({
                    userId: updatedComment.userId,
                    type: 'comment_pinned',
                    fromUserId: userId,
                    postId: updatedComment.postId,
                    commentId: updatedComment.id,
                    targetUrl: `/posts/${updatedComment.postId}`,
                });
            }
        }
        if (this.commentsGateway) {
            const room = `post:${updatedComment.postId}`;
            this.commentsGateway.server.to(room).emit('commentPinned', {
                id: updatedComment.id,
                postId: updatedComment.postId,
                isPinned: updatedComment.isPinned,
            });
            this.commentsGateway.server.emit('commentPinned', {
                id: updatedComment.id,
                postId: updatedComment.postId,
                isPinned: updatedComment.isPinned,
            });
        }
        return {
            id: updatedComment.id,
            content: updatedComment.content,
            isPinned: updatedComment.isPinned,
            createdAt: updatedComment.createdAt,
            user: updatedComment.user,
            likesCount: updatedComment._count.likes,
            repliesCount: updatedComment._count.replies,
        };
    }
    async getPublicSharePost(postId) {
        const id = typeof postId === 'string' ? postId.trim() : '';
        if (!id) {
            throw new common_1.NotFoundException('Post not found');
        }
        let post;
        try {
            post = await this.prisma.post.findUnique({
                where: { id },
                select: {
                    isDeleted: true,
                    deletedAt: true,
                    type: true,
                    code: true,
                    user: {
                        select: {
                            isPrivate: true,
                            isDeleted: true,
                            deletedAt: true,
                            accountStatus: true,
                        },
                    },
                },
            });
        }
        catch {
            throw new common_1.NotFoundException('Post not found');
        }
        if (!post || post.isDeleted || post.deletedAt != null) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (!post.user || !(0, public_vitrine_user_1.isUserEligibleForPublicVitrine)(post.user)) {
            throw new common_1.NotFoundException('Post not found');
        }
        const t = (post.type ?? 'post').trim();
        const specialTypes = ['artwork', 'article', 'event'];
        const isSpecialType = specialTypes.includes(t);
        const hasShareCode = typeof post.code === 'string' && post.code.trim().length > 0;
        const authorIsPublic = post.user.isPrivate !== true;
        if (!(authorIsPublic || isSpecialType || hasShareCode)) {
            throw new common_1.NotFoundException('Post not found');
        }
        return this.getPost(id, undefined);
    }
    async getPublicArtworkTicketByCode(rawCode) {
        const code = rawCode?.trim();
        if (!code) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        const post = await this.prisma.post.findFirst({
            where: {
                code,
                type: 'artwork',
                isDeleted: false,
                deletedAt: null,
                user: public_vitrine_user_1.publicVitrineUserWhere,
            },
            select: {
                code: true,
                title: true,
                caption: true,
                user: {
                    select: {
                        fullName: true,
                        username: true,
                        isDeleted: true,
                        deletedAt: true,
                        accountStatus: true,
                    },
                },
                media: {
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: { url: true },
                },
            },
        });
        if (!post?.code) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (!(0, public_vitrine_user_1.isUserEligibleForPublicVitrine)(post.user)) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        const ticketCode = post.code;
        const artworkTitle = (post.title && post.title.trim()) ||
            (post.caption && post.caption.trim()) ||
            ticketCode;
        const artistName = (post.user?.fullName && post.user.fullName.trim()) ||
            post.user?.username ||
            'Sanatçı';
        return {
            ticketCode,
            artworkTitle,
            artistName,
            artistUsername: post.user?.username ?? '',
            imageUrl: post.media[0]?.url ?? null,
            isValid: true,
        };
    }
    async resolveArtworkQrByCode(rawCode) {
        const code = rawCode?.trim();
        if (!code) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        const post = await this.prisma.post.findFirst({
            where: {
                code,
                type: 'artwork',
                isDeleted: false,
                deletedAt: null,
                user: public_vitrine_user_1.publicVitrineUserWhere,
            },
            select: {
                id: true,
                code: true,
                user: {
                    select: {
                        isDeleted: true,
                        deletedAt: true,
                        accountStatus: true,
                    },
                },
            },
        });
        if (!post?.code) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        if (!(0, public_vitrine_user_1.isUserEligibleForPublicVitrine)(post.user)) {
            throw new common_1.NotFoundException('Ticket not found');
        }
        return { postId: post.id };
    }
    async generateArtworkQrPdf(postId, res) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                caption: true,
                type: true,
                code: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                    },
                },
                media: {
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: {
                        url: true,
                        type: true,
                    },
                },
            },
        });
        if (!post) {
            throw new common_1.NotFoundException('Eser bulunamadı');
        }
        if (post.type !== 'artwork') {
            throw new common_1.BadRequestException('Bu gönderi bir eser değil');
        }
        let artworkCode = post.code;
        if (!artworkCode) {
            artworkCode = await (0, artwork_utils_1.generateUniqueArtworkCode)(this.prisma);
            await this.prisma.post.update({
                where: { id: postId },
                data: { code: artworkCode },
            });
        }
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const qrDataUrl = await (0, ticket_utils_1.generateQrDataUrl)(buildArtworkQrUrl(frontendUrl, postId));
        const doc = new pdfkit_1.default({
            size: [210, 120],
            margin: 10,
            layout: 'landscape',
            bufferPages: false,
            info: {
                Title: `Feellink Eser Etiketi - ${post.caption || artworkCode}`,
                Author: 'Feellink',
                Subject: 'Eser QR Etiketi',
            },
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Feellink_Eser_Etiketi_${artworkCode}.pdf"`);
        doc.pipe(res);
        const orange = '#ff7b00';
        const dark = '#111827';
        const gray = '#374151';
        const bgColor = '#f4f0e8';
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(bgColor);
        const leftMargin = 15;
        let currentY = 20;
        doc
            .font('Helvetica-Bold')
            .fontSize(18)
            .fillColor(dark)
            .text(post.caption || artworkCode, leftMargin, currentY, {
            width: 180,
            ellipsis: true,
        });
        currentY += 25;
        doc
            .font('Helvetica')
            .fontSize(14)
            .fillColor(dark)
            .text(post.user.fullName || post.user.username, leftMargin, currentY);
        currentY += 20;
        doc
            .font('Helvetica')
            .fontSize(11)
            .fillColor(gray)
            .text(artworkCode, leftMargin, currentY);
        doc
            .rect(doc.page.width - 20, 0, 20, doc.page.height)
            .fill(orange);
        const qrSize = 80;
        const qrX = leftMargin;
        const qrY = currentY + 15;
        doc
            .roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6, 5)
            .lineWidth(2)
            .stroke(orange)
            .fill('#FFFFFF');
        try {
            const tmpDir = '/tmp';
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            const qrPath = path.join(tmpDir, `${postId}-qr.png`);
            const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(qrPath, base64Data, 'base64');
            doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize });
            fs.unlinkSync(qrPath);
        }
        catch (error) {
            console.error('QR kod yüklenemedi:', error);
        }
        const sloganX = qrX + qrSize + 20;
        const sloganY = qrY + 15;
        doc
            .font('Helvetica-Bold')
            .fontSize(16)
            .fillColor(dark)
            .text('Feellink ile', sloganX, sloganY, { width: 80 });
        doc
            .font('Helvetica-Bold')
            .fontSize(16)
            .fillColor(orange)
            .text('sanat daha anlamlı!', sloganX, sloganY + 20, { width: 80 });
        const infoBoxY = qrY + qrSize + 10;
        const infoBoxWidth = doc.page.width - leftMargin * 2 - 25;
        doc
            .roundedRect(leftMargin, infoBoxY, infoBoxWidth, 35, 4)
            .lineWidth(1.5)
            .stroke(orange)
            .fill('#FFFFFF');
        doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(dark)
            .text('Bu eser hakkında ne düşünüyorsun? Duygularını, fikirlerini bizimle paylaş! QR kodu tarat, yorumunu bırak ve diğer sanatseverlerin görüşlerini keşfet.', leftMargin + 5, infoBoxY + 5, {
            width: infoBoxWidth - 10,
            align: 'left',
            lineGap: 2,
        });
        doc.end();
    }
    async getColorMatches(userId) {
        const userArtworks = await this.prisma.post.findMany({
            where: {
                userId,
                type: 'artwork',
                colors: {
                    isEmpty: false,
                },
            },
            select: {
                colors: true,
            },
        });
        const userColors = [
            ...new Set(userArtworks.flatMap((artwork) => artwork.colors || [])),
        ];
        if (userColors.length === 0) {
            return [];
        }
        const allUsers = await this.prisma.user.findMany({
            where: {
                id: {
                    not: userId,
                },
            },
            include: {
                posts: {
                    where: {
                        type: 'artwork',
                        colors: {
                            isEmpty: false,
                        },
                    },
                    select: {
                        colors: true,
                    },
                },
            },
        });
        const matches = [];
        for (const otherUser of allUsers) {
            const otherColors = [
                ...new Set(otherUser.posts.flatMap((artwork) => artwork.colors || [])),
            ];
            if (otherColors.length === 0) {
                continue;
            }
            const ortakRenkler = otherColors.filter((color) => userColors.includes(color));
            if (ortakRenkler.length > 0) {
                let similarityScore = 0;
                let totalSimilarity = 0;
                for (const userColor of userColors) {
                    let maxSimilarity = 0;
                    for (const otherColor of otherColors) {
                        const similarity = this.colorAnalysisService.calculateColorSimilarity(userColor, otherColor);
                        maxSimilarity = Math.max(maxSimilarity, similarity);
                    }
                    totalSimilarity += maxSimilarity;
                }
                const avgSimilarity = totalSimilarity / userColors.length;
                const matchScore = ortakRenkler.length * 20 +
                    avgSimilarity * 0.6;
                matches.push({
                    user: {
                        id: otherUser.id,
                        username: otherUser.username,
                        fullName: otherUser.fullName,
                        avatar: otherUser.avatar,
                        isVerified: otherUser.isVerified,
                        roles: otherUser.roles,
                    },
                    ortakRenkSayisi: ortakRenkler.length,
                    ortakRenkler: ortakRenkler.slice(0, 5),
                    matchScore: Math.round(matchScore),
                    similarityPercentage: Math.round(avgSimilarity),
                });
            }
        }
        return matches
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 10);
    }
    async getUserColorPalette(userId) {
        const userArtworks = await this.prisma.post.findMany({
            where: {
                userId,
                type: 'artwork',
                colors: {
                    isEmpty: false,
                },
            },
            select: {
                colors: true,
            },
        });
        const allColors = userArtworks.flatMap((artwork) => artwork.colors || []);
        const colorFrequency = {};
        for (const color of allColors) {
            colorFrequency[color] = (colorFrequency[color] || 0) + 1;
        }
        const sortedColors = Object.entries(colorFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([color]) => color);
        return sortedColors;
    }
    async generateQrLabelPdf(postId) {
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
            throw new common_1.NotFoundException('Eser bulunamadı');
        }
        if (post.type !== 'artwork') {
            throw new common_1.BadRequestException('Bu gönderi bir eser değil');
        }
        let artworkCode = post.code;
        if (!artworkCode) {
            artworkCode = await (0, artwork_utils_1.generateUniqueArtworkCode)(this.prisma);
            await this.prisma.post.update({
                where: { id: postId },
                data: { code: artworkCode },
            });
        }
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const artworkQrUrl = buildArtworkQrUrl(frontendUrl, postId);
        const { createCanvas, loadImage, registerFont } = require('canvas');
        const assetsRoot = (0, resolve_feellink_assets_1.resolveFeellinkAssetsRoot)();
        const fontsDir = path.join(assetsRoot, 'fonts');
        const notoRegPath = path.join(fontsDir, 'NotoSans-Regular.ttf');
        const notoBoldPath = path.join(fontsDir, 'NotoSans-SemiBold.ttf');
        const interRegularPath = path.join(fontsDir, 'Inter-Regular.ttf');
        const interBoldPath = path.join(fontsDir, 'Inter-Bold.ttf');
        const F_REG = 'FeellinkTicket';
        const F_BOLD = 'FeellinkTicketBold';
        try {
            if (fs.existsSync(notoRegPath)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(notoRegPath, 'feellink-NotoSans-Regular.ttf'), {
                    family: F_REG,
                });
            }
            else if (fs.existsSync(interRegularPath)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(interRegularPath, 'feellink-Inter-Regular.ttf'), {
                    family: F_REG,
                });
            }
            if (fs.existsSync(notoBoldPath)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(notoBoldPath, 'feellink-NotoSans-SemiBold.ttf'), {
                    family: F_BOLD,
                });
            }
            else if (fs.existsSync(interBoldPath)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(interBoldPath, 'feellink-Inter-Bold.ttf'), {
                    family: F_BOLD,
                });
            }
        }
        catch (error) {
            console.warn('Font kayıt hatası:', error);
        }
        const hasReg = fs.existsSync(notoRegPath) || fs.existsSync(interRegularPath);
        const hasBold = fs.existsSync(notoBoldPath) || fs.existsSync(interBoldPath);
        if (!hasReg) {
            console.error(`[generateQrLabelPdf] Font yok. cwd=${process.cwd()} assetsRoot=${assetsRoot} — PDF □ olur.`);
        }
        const fontReg = hasReg ? F_REG : 'sans-serif';
        const fontBold = hasBold ? F_BOLD : fontReg;
        const fontMono = fontReg;
        const height = 425;
        const dpiScale = 2;
        const PAD = 32;
        const GAP_STACK = 6;
        const GAP_SECTION = 26;
        const GAP_QR_SLOGAN = 24;
        const GAP_SLOGAN_LOGO = 18;
        const QR_SIZE = 192;
        const QR_INNER_PAD = 8;
        const LOGO_MAX_W = 252;
        const LOGO_MAX_H = 70;
        const MIN_SLOGAN_MIDDLE_W = 168;
        const TITLE_MAX_LINES = 2;
        const GAP_AFTER_TITLE = 6;
        const DIVIDER_H = 1;
        const GAP_AFTER_DIVIDER = 9;
        const TITLE_BLOCK_TO_META = GAP_AFTER_TITLE + DIVIDER_H + GAP_AFTER_DIVIDER;
        const BRAND_ORANGE = '#ff7b00';
        const BRAND_TEAL = '#1fb4bc';
        const titleRaw = (post.title && post.title.trim()) ||
            (post.caption && post.caption.trim()) ||
            '';
        const ownerRaw = (post.user.fullName && post.user.fullName.trim()) ||
            (post.user.username || '').trim();
        const ARTIST_FS = 20;
        const CODE_FS = 16;
        const SLOGAN_BASE_FS = 28;
        const TITLE_LINE_HEIGHT = 1.2;
        const logosDir = path.join(assetsRoot, 'logos');
        const orangeLogo = path.join(logosDir, 'feellink-turuncu.png');
        const blueLogo = path.join(logosDir, 'feellink-mavi.png');
        const useOrange = hashPostIdForLayout(postId) % 2 === 0;
        let logoPath = useOrange ? orangeLogo : blueLogo;
        if (!fs.existsSync(logoPath)) {
            const alt = useOrange ? blueLogo : orangeLogo;
            logoPath = fs.existsSync(alt) ? alt : path.join(assetsRoot, 'logo.png');
        }
        if (!fs.existsSync(logoPath)) {
            logoPath = path.join(process.cwd(), 'assets', 'logo.png');
        }
        let logoLw = 0;
        let logoLh = 0;
        let logoImg = null;
        try {
            if (fs.existsSync(logoPath)) {
                logoImg = await loadImage(fs.readFileSync(logoPath));
                const ratio = logoImg.width / logoImg.height;
                let lw = LOGO_MAX_W;
                let lh = Math.round(lw / ratio);
                if (lh > LOGO_MAX_H) {
                    lh = LOGO_MAX_H;
                    lw = Math.round(lh * ratio);
                }
                logoLw = lw;
                logoLh = lh;
            }
        }
        catch (e) {
            console.warn('Logo yüklenemedi:', e);
        }
        const qrX = PAD;
        const sloganBandLeft = qrX + QR_SIZE + GAP_QR_SLOGAN;
        const sloganBrand = 'Feellink';
        const sloganRest = ' ile sanat daha anlamlı!';
        const sloganFontItalic = (size) => `italic 500 ${size}px ${fontBold}`;
        const measureCv = createCanvas(1600, 120);
        const mctx = measureCv.getContext('2d');
        mctx.textBaseline = 'top';
        let middleW = MIN_SLOGAN_MIDDLE_W;
        let sloganFont = SLOGAN_BASE_FS;
        let wBrand = 0;
        let wRest = 0;
        for (let iter = 0; iter < 48; iter++) {
            const sloganSlotW = Math.max(48, middleW - 8);
            sloganFont = SLOGAN_BASE_FS;
            for (; sloganFont >= 12; sloganFont -= 1) {
                mctx.font = sloganFontItalic(sloganFont);
                wBrand = mctx.measureText(sloganBrand).width;
                wRest = mctx.measureText(sloganRest).width;
                if (wBrand + wRest <= sloganSlotW - 8) {
                    break;
                }
            }
            const totalW = wBrand + wRest;
            const needed = Math.max(totalW + 48, MIN_SLOGAN_MIDDLE_W);
            if (needed <= middleW) {
                break;
            }
            middleW = Math.min(needed + 8, 920);
        }
        const totalSloganW = wBrand + wRest;
        const logoLeftX = sloganBandLeft + middleW + GAP_SLOGAN_LOGO;
        const width = logoLw > 0
            ? Math.ceil(logoLeftX + logoLw + PAD)
            : Math.ceil(sloganBandLeft + middleW + PAD);
        const canvas = createCanvas(width * dpiScale, height * dpiScale);
        const ctx = canvas.getContext('2d');
        ctx.scale(dpiScale, dpiScale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const contentTop = PAD;
        const qrY = height - PAD - QR_SIZE;
        const bottomBandTop = qrY;
        const topBlockMaxBottom = bottomBandTop - GAP_SECTION;
        const topContentW = width - PAD * 2;
        let titleFont = 30;
        let titleLines = [];
        for (; titleFont >= 18; titleFont -= 1) {
            ctx.font = `${titleFont}px ${fontBold}`;
            titleLines = titleRaw ? wrapCanvasText(ctx, titleRaw, topContentW, TITLE_MAX_LINES) : [];
            const titleH = titleLines.length > 0
                ? titleLines.length * titleFont * TITLE_LINE_HEIGHT
                : Math.round(titleFont * 0.35);
            const ruleBlock = TITLE_BLOCK_TO_META;
            let cursorY = contentTop + titleH + ruleBlock;
            ctx.font = `${ARTIST_FS}px ${fontReg}`;
            const artistH = ownerRaw ? ARTIST_FS * 1.25 : 0;
            if (ownerRaw) {
                cursorY += artistH + GAP_STACK;
            }
            ctx.font = `${CODE_FS}px ${fontMono}`;
            cursorY += CODE_FS * 1.25;
            if (cursorY <= topBlockMaxBottom) {
                break;
            }
        }
        let drawY = contentTop;
        ctx.fillStyle = '#0f172a';
        ctx.font = `${titleFont}px ${fontBold}`;
        if (titleLines.length > 0) {
            for (const line of titleLines) {
                ctx.fillText(line, PAD, drawY);
                drawY += titleFont * TITLE_LINE_HEIGHT;
            }
            drawY += GAP_AFTER_TITLE;
            const divGrad = ctx.createLinearGradient(PAD, 0, PAD + topContentW, 0);
            divGrad.addColorStop(0, '#f0e8e2');
            divGrad.addColorStop(0.45, '#e8eaef');
            divGrad.addColorStop(1, '#e0eef0');
            ctx.fillStyle = divGrad;
            ctx.fillRect(PAD, drawY, topContentW, DIVIDER_H);
            drawY += DIVIDER_H + GAP_AFTER_DIVIDER;
        }
        else {
            drawY += Math.round(titleFont * 0.2);
            drawY += GAP_AFTER_TITLE + GAP_AFTER_DIVIDER;
        }
        ctx.font = `${ARTIST_FS}px ${fontReg}`;
        ctx.fillStyle = '#334155';
        if (ownerRaw) {
            ctx.fillText(truncateOneLine(ctx, ownerRaw, topContentW), PAD, drawY);
            drawY += ARTIST_FS * 1.25 + GAP_STACK;
        }
        ctx.font = `${CODE_FS}px ${fontMono}`;
        ctx.fillStyle = '#475569';
        ctx.fillText(artworkCode, PAD, drawY);
        const qrBuffer = await QRCode.toBuffer(artworkQrUrl, {
            margin: 1,
            width: 640,
            type: 'png',
        });
        const qrImg = await loadImage(qrBuffer);
        const innerQr = QR_SIZE - QR_INNER_PAD * 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX, qrY, QR_SIZE, QR_SIZE);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(qrX + 0.5, qrY + 0.5, QR_SIZE - 1, QR_SIZE - 1);
        ctx.drawImage(qrImg, qrX + QR_INNER_PAD, qrY + QR_INNER_PAD, innerQr, innerQr);
        const sy = qrY;
        let sx = sloganBandLeft + Math.max(0, (middleW - totalSloganW) / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = BRAND_ORANGE;
        ctx.font = sloganFontItalic(sloganFont);
        ctx.fillText(sloganBrand, sx, sy);
        sx += wBrand;
        ctx.fillStyle = '#0f172a';
        ctx.font = sloganFontItalic(sloganFont);
        ctx.fillText(sloganRest, sx, sy);
        if (logoImg && logoLw > 0) {
            const lx = logoLeftX;
            const ly = height - PAD - logoLh;
            ctx.drawImage(logoImg, lx, ly, logoLw, logoLh);
        }
        const cardR = 14;
        const bx = 0.75;
        const by = 0.75;
        const bw = width - 1.5;
        const bh = height - 1.5;
        const borderGrad = ctx.createLinearGradient(0, 0, width, 0);
        borderGrad.addColorStop(0, BRAND_ORANGE);
        borderGrad.addColorStop(1, BRAND_TEAL);
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + cardR, by);
        ctx.lineTo(bx + bw - cardR, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + cardR);
        ctx.lineTo(bx + bw, by + bh - cardR);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - cardR, by + bh);
        ctx.lineTo(bx + cardR, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - cardR);
        ctx.lineTo(bx, by + cardR);
        ctx.quadraticCurveTo(bx, by, bx + cardR, by);
        ctx.closePath();
        ctx.stroke();
        const pngBuffer = canvas.toBuffer('image/png');
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const a4Width = 210;
        const a4Height = 297;
        const mmPerInch = 25.4;
        const dpi = 144;
        const mmPerPx = mmPerInch / dpi;
        const labelWidthMm = width * mmPerPx;
        const labelHeightMm = height * mmPerPx;
        let pdfScale = 1;
        if (labelWidthMm > a4Width || labelHeightMm > a4Height) {
            const scaleX = (a4Width - 20) / labelWidthMm;
            const scaleY = (a4Height - 20) / labelHeightMm;
            pdfScale = Math.min(scaleX, scaleY, 1);
        }
        const finalWidthMm = labelWidthMm * pdfScale;
        const finalHeightMm = labelHeightMm * pdfScale;
        const page = pdfDoc.addPage([a4Width, a4Height]);
        const xOffset = (a4Width - finalWidthMm) / 2;
        const yOffset = (a4Height - finalHeightMm) / 2;
        const pngImage = await pdfDoc.embedPng(pngBuffer);
        page.drawImage(pngImage, {
            x: xOffset,
            y: a4Height - yOffset - finalHeightMm,
            width: finalWidthMm,
            height: finalHeightMm,
        });
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }
    async generateArtworkTicket(postId, userId) {
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
            throw new common_1.NotFoundException('Eser bulunamadı');
        }
        if (post.type !== 'artwork') {
            throw new common_1.BadRequestException('Bu gönderi bir eser değil');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        }
        let artworkCode = post.code;
        if (!artworkCode) {
            artworkCode = await (0, artwork_utils_1.generateUniqueArtworkCode)(this.prisma);
            await this.prisma.post.update({
                where: { id: postId },
                data: { code: artworkCode },
            });
        }
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
        const artworkQrUrl = buildArtworkQrUrl(frontendUrl, postId);
        const { createCanvas, loadImage, registerFont } = require('canvas');
        const ticketAssetsRoot = (0, resolve_feellink_assets_1.resolveFeellinkAssetsRoot)();
        const templatePath = path.join(ticketAssetsRoot, 'templates', 'bilet_template.png');
        if (!fs.existsSync(templatePath)) {
            throw new common_1.NotFoundException(`Bilet şablonu bulunamadı: ${templatePath}. Lütfen backend/assets/templates/bilet_template.png dosyasını ekleyin.`);
        }
        const template = await loadImage(templatePath);
        const width = template.width;
        const height = template.height;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(template, 0, 0, width, height);
        try {
            const fontsDir = path.join(ticketAssetsRoot, 'fonts');
            const interRegular = path.join(fontsDir, 'Inter-Regular.ttf');
            const interBold = path.join(fontsDir, 'Inter-Bold.ttf');
            const notoReg = path.join(fontsDir, 'NotoSans-Regular.ttf');
            const notoBold = path.join(fontsDir, 'NotoSans-SemiBold.ttf');
            if (fs.existsSync(notoReg)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(notoReg, 'feellink-ticket-NotoSans-Regular.ttf'), {
                    family: 'Inter',
                });
            }
            else if (fs.existsSync(interRegular)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(interRegular, 'feellink-ticket-Inter-Regular.ttf'), {
                    family: 'Inter',
                });
            }
            if (fs.existsSync(notoBold)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(notoBold, 'feellink-ticket-NotoSans-SemiBold.ttf'), {
                    family: 'InterBold',
                });
            }
            else if (fs.existsSync(interBold)) {
                registerFont((0, resolve_feellink_assets_1.fontPathForRegister)(interBold, 'feellink-ticket-Inter-Bold.ttf'), {
                    family: 'InterBold',
                });
            }
        }
        catch (error) {
            console.warn('Font kayıt hatası (sistem fontları kullanılacak):', error);
        }
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        const fontsDir = path.join(ticketAssetsRoot, 'fonts');
        const hasInterBold = fs.existsSync(path.join(fontsDir, 'NotoSans-SemiBold.ttf')) ||
            fs.existsSync(path.join(fontsDir, 'Inter-Bold.ttf'));
        const hasInterRegular = fs.existsSync(path.join(fontsDir, 'NotoSans-Regular.ttf')) ||
            fs.existsSync(path.join(fontsDir, 'Inter-Regular.ttf'));
        const artworkName = post.title || post.caption || artworkCode;
        const nameFontSize = width * (48 / 1400);
        ctx.font = `${nameFontSize}px ${hasInterBold ? 'InterBold' : 'Arial-Bold'}`;
        ctx.fillText(artworkName, width * (120 / 1400), height * (180 / 700));
        const artistName = post.user.fullName || post.user.username || '';
        const artistFontSize = width * (36 / 1400);
        ctx.font = `${artistFontSize}px ${hasInterRegular ? 'Inter' : 'Arial'}`;
        ctx.fillText(artistName, width * (120 / 1400), height * (240 / 700));
        const codeFontSize = width * (28 / 1400);
        ctx.font = `${codeFontSize}px ${hasInterRegular ? 'Inter' : 'Arial'}`;
        ctx.fillStyle = '#555555';
        ctx.fillText(`Kod: ${artworkCode}`, width * (120 / 1400), height * (290 / 700));
        const qrBuffer = await QRCode.toBuffer(artworkQrUrl, {
            margin: 1,
            width: 400,
            type: 'png',
        });
        const qrImg = await loadImage(qrBuffer);
        const qrX = width * (120 / 1400);
        const qrY = height * (320 / 700);
        const qrSize = width * (280 / 1400);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        const pngBuffer = canvas.toBuffer('image/png');
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const a4Width = 210;
        const a4Height = 297;
        const mmPerInch = 25.4;
        const dpi = 72;
        const mmPerPx = mmPerInch / dpi;
        const labelWidthMm = width * mmPerPx;
        const labelHeightMm = height * mmPerPx;
        let scale = 1;
        if (labelWidthMm > a4Width || labelHeightMm > a4Height) {
            const scaleX = (a4Width - 20) / labelWidthMm;
            const scaleY = (a4Height - 20) / labelHeightMm;
            scale = Math.min(scaleX, scaleY, 1);
        }
        const finalWidthMm = labelWidthMm * scale;
        const finalHeightMm = labelHeightMm * scale;
        const page = pdfDoc.addPage([a4Width, a4Height]);
        const xOffset = (a4Width - finalWidthMm) / 2;
        const yOffset = (a4Height - finalHeightMm) / 2;
        const pngImage = await pdfDoc.embedPng(pngBuffer);
        page.drawImage(pngImage, {
            x: xOffset,
            y: a4Height - yOffset - finalHeightMm,
            width: finalWidthMm,
            height: finalHeightMm,
        });
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    }
    streamToBuffer(doc) {
        return new Promise((resolve, reject) => {
            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, common_1.Inject)((0, common_1.forwardRef)(() => posts_gateway_1.PostsGateway))),
    __param(7, (0, common_1.Inject)((0, common_1.forwardRef)(() => comments_gateway_1.CommentsGateway))),
    __param(11, (0, common_1.Inject)((0, common_1.forwardRef)(() => chat_service_1.ChatService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        notifications_gateway_1.NotificationsGateway,
        analytics_service_1.AnalyticsService,
        feed_service_1.FeedService,
        search_service_1.SearchService,
        posts_gateway_1.PostsGateway,
        comments_gateway_1.CommentsGateway,
        config_1.ConfigService,
        limits_service_1.LimitsService,
        color_analysis_service_1.ColorAnalysisService,
        chat_service_1.ChatService,
        blocks_service_1.BlocksService])
], PostsService);
//# sourceMappingURL=posts.service.js.map