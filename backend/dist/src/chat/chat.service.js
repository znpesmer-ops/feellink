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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const chat_gateway_1 = require("./chat.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
const posts_service_1 = require("../posts/posts.service");
const blocks_service_1 = require("../blocks/blocks.service");
let ChatService = class ChatService {
    constructor(prisma, chatGateway, notificationsService, postsService, blocksService) {
        this.prisma = prisma;
        this.chatGateway = chatGateway;
        this.notificationsService = notificationsService;
        this.postsService = postsService;
        this.blocksService = blocksService;
    }
    async getConversations(userId) {
        console.log(`📋 [ChatService] getConversations called for user: ${userId}`);
        const userConversations = await this.prisma.userConversation.findMany({
            where: {
                userId,
                isDeleted: false,
            },
            include: {
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        avatar: true,
                                        fullName: true,
                                        isOnline: true,
                                        lastSeen: true,
                                    },
                                },
                            },
                        },
                        messages: {
                            take: 1,
                            orderBy: {
                                createdAt: 'desc',
                            },
                            include: {
                                sender: {
                                    select: {
                                        id: true,
                                        username: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                conversation: {
                    updatedAt: 'desc',
                },
            },
        });
        const allConversations = userConversations.map((uc) => uc.conversation).filter(Boolean);
        console.log(`📋 [ChatService] Found ${allConversations.length} conversations for user ${userId}`);
        const conversationsWithMessages = await Promise.all(allConversations.map(async (c) => {
            const hasMessage = await this.prisma.message.count({
                where: {
                    conversationId: c.id,
                    isDeleted: false,
                },
                take: 1,
            });
            return { conv: c, shouldShow: hasMessage > 0 };
        }));
        const filteredConversations = conversationsWithMessages
            .filter(({ shouldShow }) => shouldShow)
            .map(({ conv }) => conv);
        console.log(`📋 [ChatService] Returning ${filteredConversations.length} conversations for user ${userId} (with messages)`);
        const conversationsWithUnread = await Promise.all(filteredConversations.map(async (conv) => {
            const unreadCount = await this.prisma.message.count({
                where: {
                    conversationId: conv.id,
                    senderId: { not: userId },
                    read: false,
                    isDeleted: false,
                },
            });
            const participantsWithLastActive = await Promise.all(conv.participants.map(async (p) => {
                const u = p.user;
                if (u.id === userId) {
                    return { ...p, user: { ...u, lastActiveAt: u.lastSeen ?? null } };
                }
                const lastMsg = await this.prisma.message.findFirst({
                    where: { conversationId: conv.id, senderId: u.id, isDeleted: false },
                    orderBy: { updatedAt: 'desc' },
                    select: { updatedAt: true },
                });
                const lastActiveAt = u.lastSeen ?? lastMsg?.updatedAt ?? conv.updatedAt ?? null;
                return { ...p, user: { ...u, lastActiveAt } };
            }));
            return {
                ...conv,
                participants: participantsWithLastActive,
                unreadCount,
            };
        }));
        return conversationsWithUnread;
    }
    async getUnreadMessageCount(userId) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                        isDeleted: false,
                    },
                },
            },
            select: {
                id: true,
            },
        });
        const conversationIds = conversations.map((c) => c.id);
        if (conversationIds.length === 0) {
            return 0;
        }
        const totalUnread = await this.prisma.message.count({
            where: {
                conversationId: { in: conversationIds },
                senderId: { not: userId },
                read: false,
                isDeleted: false,
            },
        });
        return totalUnread;
    }
    async getConversation(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                                fullName: true,
                                isPrivate: true,
                                isOnline: true,
                                lastSeen: true,
                            },
                        },
                    },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        const participantsWithLastActive = await Promise.all(conversation.participants.map(async (p) => {
            const u = p.user;
            if (u.id === userId) {
                return { ...p, user: { ...u, lastActiveAt: u.lastSeen ?? null } };
            }
            const lastMsg = await this.prisma.message.findFirst({
                where: { conversationId, senderId: u.id, isDeleted: false },
                orderBy: { updatedAt: 'desc' },
                select: { updatedAt: true },
            });
            const lastActiveAt = u.lastSeen ?? lastMsg?.updatedAt ?? conversation.updatedAt ?? null;
            return { ...p, user: { ...u, lastActiveAt } };
        }));
        return { ...conversation, participants: participantsWithLastActive };
    }
    async getMessages(conversationId, userId, limit = 50, cursor) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    lastSeen: new Date(),
                    isOnline: true,
                },
            });
        }
        catch (error) {
            console.warn(`⚠️ [getMessages] Failed to update lastSeen:`, error);
        }
        const messages = await this.prisma.message.findMany({
            where: {
                conversationId,
                isDeleted: false,
                ...(cursor && {
                    createdAt: { lt: new Date(cursor) },
                }),
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
            take: limit + 1,
        });
        const hasMore = messages.length > limit;
        const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
        const shareIds = messagesToReturn
            .filter((m) => (m.messageType || 'TEXT') === 'POST_SHARE' && m.sharedPostId)
            .map((m) => String(m.sharedPostId));
        let previewMap = {};
        if (shareIds.length > 0 && this.postsService) {
            previewMap = await this.postsService.getSharedPostPreviewsMap(userId, shareIds);
        }
        const messagesWithPreview = messagesToReturn.map((m) => {
            const mt = m.messageType || 'TEXT';
            const sid = m.sharedPostId ? String(m.sharedPostId) : null;
            const sharedPostPreview = mt === 'POST_SHARE' && sid
                ? previewMap[sid] || { postId: sid, state: 'deleted' }
                : undefined;
            return { ...m, messageType: mt, sharedPostPreview };
        });
        return {
            messages: messagesWithPreview,
            hasMore,
            nextCursor: hasMore ? messagesToReturn[messagesToReturn.length - 1]?.createdAt.toISOString() : null,
        };
    }
    async sendPostShareMessage(senderId, conversationId, sharedPostId) {
        const pid = String(sharedPostId || '').trim();
        if (!pid) {
            throw new common_1.BadRequestException('sharedPostId gerekli');
        }
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === senderId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        const otherParticipant = conversation.participants.find((p) => p.userId !== senderId);
        if (!otherParticipant) {
            throw new common_1.BadRequestException('Invalid conversation');
        }
        if (await this.blocksService.isBlocked(senderId, otherParticipant.userId)) {
            throw new common_1.ForbiddenException('Bu kullanıcıyla paylaşım yapılamıyor.');
        }
        let isRequest = false;
        const recipientUser = await this.prisma.user.findUnique({
            where: { id: otherParticipant.userId },
            select: { id: true, isPrivate: true },
        });
        if (recipientUser?.isPrivate) {
            const isFollowing = await this.prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: senderId,
                        followingId: recipientUser.id,
                    },
                },
            });
            if (!isFollowing) {
                isRequest = true;
            }
        }
        try {
            await this.prisma.user.update({
                where: { id: senderId },
                data: { lastSeen: new Date(), isOnline: true },
            });
        }
        catch {
        }
        const conversationAny = conversation;
        const messageContext = conversationAny.context || 'DIRECT';
        const messageJobId = conversationAny.jobId || null;
        const messageApplicationId = conversationAny.applicationId || null;
        const messageData = {
            conversationId,
            senderId,
            content: null,
            imageUrl: null,
            fileUrl: null,
            fileName: null,
            fileType: null,
            messageType: 'POST_SHARE',
            sharedPostId: pid,
            isRequest,
            isDeleted: false,
            read: false,
        };
        if (messageContext) {
            messageData.context = messageContext;
        }
        if (messageJobId) {
            messageData.jobId = messageJobId;
        }
        if (messageApplicationId) {
            messageData.applicationId = messageApplicationId;
        }
        const message = await this.prisma.message.create({
            data: messageData,
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        const lastMessageText = '📎 Bir gönderi paylaştı';
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessage: lastMessageText,
                updatedAt: new Date(),
            },
        });
        if (this.chatGateway && typeof this.chatGateway.broadcastMessageImmediately === 'function') {
            try {
                const msgForSocket = { ...message, messageType: 'POST_SHARE', sharedPostId: pid };
                this.chatGateway.broadcastMessageImmediately(msgForSocket, conversation, senderId, conversationId);
            }
            catch (error) {
                console.warn('[ChatService] sendPostShare broadcast failed:', error);
            }
        }
        const recipient = conversation.participants.find((p) => p.userId !== senderId);
        if (recipient) {
            this.notificationsService
                .createNotificationSync({
                userId: recipient.userId,
                type: 'message',
                fromUserId: senderId,
                targetPath: '/messages',
                targetUrl: '/messages',
            })
                .catch((err) => {
                console.warn('[ChatService] Post share notification failed:', err?.message || err);
            });
            await this.prisma.userConversation
                .upsert({
                where: {
                    userId_conversationId: {
                        userId: recipient.userId,
                        conversationId,
                    },
                },
                create: {
                    userId: recipient.userId,
                    conversationId,
                    isDeleted: false,
                },
                update: { isDeleted: false },
            })
                .catch(() => undefined);
        }
        return message;
    }
    async createMessage(userId, conversationId, content, imageUrl, fileUrl, fileName, fileType) {
        if (!content && !imageUrl && !fileUrl) {
            throw new common_1.BadRequestException('Message must have content, imageUrl, or fileUrl');
        }
        console.log(`📨 [createMessage] User ${userId} sending message to conversation ${conversationId}`);
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });
        if (!conversation) {
            console.error(`❌ [createMessage] Conversation ${conversationId} not found`);
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            console.error(`❌ [createMessage] User ${userId} has no access to conversation ${conversationId}`);
            throw new common_1.ForbiddenException('Access denied');
        }
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    lastSeen: new Date(),
                    isOnline: true,
                },
            });
            console.log(`✅ [createMessage] Updated lastSeen for user ${userId}`);
        }
        catch (error) {
            console.warn(`⚠️ [createMessage] Failed to update lastSeen:`, error);
        }
        const conversationAny = conversation;
        const messageContext = conversationAny.context || 'DIRECT';
        const messageJobId = conversationAny.jobId || null;
        const messageApplicationId = conversationAny.applicationId || null;
        const messageData = {
            conversationId,
            senderId: userId,
            content: content || null,
            imageUrl: imageUrl || null,
            fileUrl: fileUrl || null,
            fileName: fileName || null,
            fileType: fileType || null,
            isDeleted: false,
            read: false,
        };
        if (messageContext) {
            messageData.context = messageContext;
        }
        if (messageJobId) {
            messageData.jobId = messageJobId;
        }
        if (messageApplicationId) {
            messageData.applicationId = messageApplicationId;
        }
        const message = await this.prisma.message.create({
            data: messageData,
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        console.log(`✅ [createMessage] Message created: ${message.id}`);
        const lastMessageText = message.content ?? (message.imageUrl ? '📷 Fotoğraf' : (message.fileUrl ? '📎 Dosya' : 'Yeni mesaj'));
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessage: lastMessageText,
                updatedAt: new Date(),
            },
        });
        console.log(`✅ [createMessage] Conversation ${conversationId} metadata updated`);
        if (this.chatGateway && typeof this.chatGateway.broadcastMessageImmediately === 'function') {
            try {
                this.chatGateway.broadcastMessageImmediately(message, conversation, userId, conversationId);
                console.log(`📡 [createMessage] Broadcast message via socket`);
            }
            catch (error) {
                console.warn('[ChatService] Failed to broadcast message via socket:', error);
            }
        }
        const recipient = conversation.participants.find((p) => p.userId !== userId);
        if (recipient) {
            this.notificationsService.createNotificationSync({
                userId: recipient.userId,
                type: 'message',
                fromUserId: userId,
                targetPath: '/messages',
                targetUrl: '/messages',
            }).catch((err) => {
                console.warn('[ChatService] Message notification failed:', err?.message || err);
            });
        }
        return message;
    }
    async createConversation(userId, participantIds, context, jobId, applicationId) {
        const validParticipantIds = participantIds.filter((id) => id && typeof id === 'string' && id.trim() !== '');
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid userId');
        }
        const allParticipants = [userId, ...validParticipantIds.filter((id) => id !== userId)];
        if (allParticipants.length < 2) {
            throw new Error('At least 2 participants required');
        }
        const sortedParticipantIds = allParticipants.sort();
        let existingConversation = null;
        if (context === 'JOB_APPLICATION' && applicationId) {
            const conversationsWithApplication = await this.prisma.conversation.findMany({
                where: {
                    applicationId: applicationId,
                    context: 'JOB_APPLICATION',
                },
                include: {
                    participants: true,
                },
            });
            for (const conv of conversationsWithApplication) {
                const convAny = conv;
                const convParticipantIds = convAny.participants.map((p) => p.userId).sort();
                if (convParticipantIds.length === sortedParticipantIds.length &&
                    convParticipantIds.every((id, index) => id === sortedParticipantIds[index])) {
                    existingConversation = conv;
                    break;
                }
            }
        }
        else {
            const allUserConversations = await this.prisma.conversation.findMany({
                where: {
                    participants: {
                        some: {
                            userId: userId,
                        },
                    },
                },
                include: {
                    participants: true,
                },
            });
            for (const conv of allUserConversations) {
                const convAny = conv;
                const convParticipantIds = convAny.participants.map((p) => p.userId).sort();
                if (convParticipantIds.length === sortedParticipantIds.length &&
                    convParticipantIds.every((id, index) => id === sortedParticipantIds[index])) {
                    if (context === 'DIRECT' || !context) {
                        existingConversation = conv;
                        console.log(`✅ [ChatService] Found existing DIRECT conversation: ${conv.id} (ignoring context/jobId/applicationId)`);
                        break;
                    }
                }
            }
        }
        if (existingConversation) {
            await Promise.all(allParticipants.map(async (participantId) => {
                try {
                    await this.prisma.userConversation.upsert({
                        where: {
                            userId_conversationId: {
                                userId: participantId,
                                conversationId: existingConversation.id,
                            },
                        },
                        create: {
                            userId: participantId,
                            conversationId: existingConversation.id,
                            isDeleted: false,
                        },
                        update: {
                            isDeleted: false,
                        },
                    });
                    console.log(`✅ [ChatService] UserConversation ensured for user ${participantId} in existing conversation ${existingConversation.id}`);
                }
                catch (error) {
                    if (error.code !== 'P2002') {
                        console.error(`❌ [ChatService] Failed to ensure UserConversation for user ${participantId}: ${error.message}`);
                    }
                }
            }));
            console.log(`✅ [ChatService] Existing conversation found: ${existingConversation.id} (participants: ${sortedParticipantIds.join(', ')})`);
            return this.prisma.conversation.findUnique({
                where: { id: existingConversation.id },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    avatar: true,
                                    fullName: true,
                                    isOnline: true,
                                    lastSeen: true,
                                },
                            },
                        },
                    },
                },
            });
        }
        const conversationData = {
            participants: {
                create: allParticipants.map((participantId) => ({
                    userId: participantId,
                })),
            },
        };
        if (context) {
            conversationData.context = context;
        }
        if (jobId) {
            conversationData.jobId = jobId;
        }
        if (applicationId) {
            conversationData.applicationId = applicationId;
        }
        const conversation = await this.prisma.conversation.create({
            data: conversationData,
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                                fullName: true,
                                isOnline: true,
                                lastSeen: true,
                            },
                        },
                    },
                },
            },
        });
        await Promise.all(allParticipants.map(async (participantId) => {
            try {
                await this.prisma.userConversation.create({
                    data: {
                        userId: participantId,
                        conversationId: conversation.id,
                        isDeleted: false,
                    },
                });
                console.log(`✅ [ChatService] UserConversation created for user ${participantId} in conversation ${conversation.id}`);
            }
            catch (error) {
                if (error.code !== 'P2002') {
                    console.error(`❌ [ChatService] Failed to create UserConversation for user ${participantId}: ${error.message}`);
                }
            }
        }));
        return conversation;
    }
    async markAsRead(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        const updated = await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                read: false,
            },
            data: {
                read: true,
            },
        });
        await this.chatGateway.markMessagesAsRead(conversationId, userId);
        return { success: true };
    }
    async deleteConversation(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        await this.prisma.userConversation.updateMany({
            where: {
                conversationId,
                userId,
            },
            data: {
                isDeleted: true,
            },
        });
        return { success: true };
    }
    async editMessage(messageId, userId, newContent) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            include: {
                conversation: {
                    include: { participants: true },
                },
            },
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== userId) {
            throw new common_1.ForbiddenException('Bu mesajı düzenleme yetkiniz yok');
        }
        if (message.isDeleted) {
            throw new common_1.BadRequestException('Silinmiş mesaj düzenlenemez');
        }
        const updated = await this.prisma.message.update({
            where: { id: messageId },
            data: {
                content: newContent,
                isEdited: true,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                    },
                },
                conversation: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        const lastMessage = await this.prisma.message.findFirst({
            where: {
                conversationId: message.conversationId,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 1,
        });
        if (lastMessage && lastMessage.id === messageId) {
            await this.prisma.conversation.update({
                where: { id: message.conversationId },
                data: {
                    lastMessage: newContent,
                    updatedAt: new Date(),
                },
            });
            console.log(`✅ [ChatService] Conversation lastMessage updated after edit: ${newContent.substring(0, 50)}...`);
        }
        if (this.chatGateway) {
            await this.chatGateway.broadcastMessageEdited(updated);
        }
        return updated;
    }
    async deleteMessage(messageId, userId) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            include: {
                conversation: {
                    include: { participants: true },
                },
            },
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== userId) {
            throw new common_1.ForbiddenException('Bu mesajı silme yetkiniz yok');
        }
        const updated = await this.prisma.message.update({
            where: { id: messageId },
            data: {
                isDeleted: true,
                content: null,
                imageUrl: null,
            },
        });
        const lastMessage = await this.prisma.message.findFirst({
            where: {
                conversationId: message.conversationId,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 1,
        });
        if (lastMessage && lastMessage.id === messageId) {
            const previousMessage = await this.prisma.message.findFirst({
                where: {
                    conversationId: message.conversationId,
                    isDeleted: false,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip: 1,
                take: 1,
            });
            const lastMessageText = previousMessage
                ? (previousMessage.content ?? (previousMessage.imageUrl ? '📷 Fotoğraf' : (previousMessage.fileUrl ? '📎 Dosya' : 'Yeni mesaj')))
                : null;
            await this.prisma.conversation.update({
                where: { id: message.conversationId },
                data: {
                    lastMessage: lastMessageText,
                    updatedAt: new Date(),
                },
            });
            console.log(`✅ [ChatService] Conversation lastMessage updated after delete: ${lastMessageText ? lastMessageText.substring(0, 50) + '...' : 'null'}`);
        }
        if (this.chatGateway) {
            await this.chatGateway.broadcastMessageDeleted(messageId, message.conversationId);
        }
        return updated;
    }
    async getMedia(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return this.prisma.message.findMany({
            where: {
                conversationId,
                imageUrl: { not: null },
                isDeleted: false,
            },
            select: {
                id: true,
                imageUrl: true,
                createdAt: true,
                senderId: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getFiles(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return this.prisma.message.findMany({
            where: {
                conversationId,
                fileUrl: { not: null },
                isDeleted: false,
            },
            select: {
                id: true,
                fileUrl: true,
                fileName: true,
                fileType: true,
                createdAt: true,
                senderId: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getMessageRequests(userId) {
        const conversations = await this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                        isDeleted: false,
                    },
                },
                messages: {
                    some: {
                        senderId: { not: userId },
                        isRequest: true,
                        isDeleted: false,
                    },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                                fullName: true,
                                isOnline: true,
                                lastSeen: true,
                            },
                        },
                    },
                },
                messages: {
                    where: {
                        isRequest: true,
                        isDeleted: false,
                    },
                    take: 1,
                    orderBy: {
                        createdAt: 'desc',
                    },
                    include: {
                        sender: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        return conversations;
    }
    async acceptMessageRequest(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                isRequest: true,
                isDeleted: false,
            },
            data: {
                isRequest: false,
            },
        });
        return { success: true };
    }
    async declineMessageRequest(conversationId, userId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('Access denied');
        }
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                isRequest: true,
                isDeleted: false,
            },
            data: {
                isDeleted: true,
                content: null,
                imageUrl: null,
                fileUrl: null,
            },
        });
        await this.prisma.userConversation.updateMany({
            where: {
                conversationId,
                userId,
            },
            data: {
                isDeleted: true,
            },
        });
        return { success: true };
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => chat_gateway_1.ChatGateway))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => posts_service_1.PostsService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        chat_gateway_1.ChatGateway,
        notifications_service_1.NotificationsService,
        posts_service_1.PostsService,
        blocks_service_1.BlocksService])
], ChatService);
//# sourceMappingURL=chat.service.js.map