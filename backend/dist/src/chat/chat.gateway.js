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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const blocks_service_1 = require("../blocks/blocks.service");
const follow_service_1 = require("../follow/follow.service");
const notifications_service_1 = require("../notifications/notifications.service");
const websocket_cors_util_1 = require("../common/utils/websocket-cors.util");
let ChatGateway = class ChatGateway {
    constructor(jwtService, prisma, blocksService, followService, notificationsService) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.blocksService = blocksService;
        this.followService = followService;
        this.notificationsService = notificationsService;
        this.userSockets = new Map();
        this.socketToUser = new Map();
        this.userLastActiveAt = new Map();
        this.presenceTimeoutInterval = null;
    }
    afterInit(server) {
        console.log('Chat WebSocket Gateway initialized');
        const PRESENCE_TIMEOUT_MS = 60000;
        const CHECK_INTERVAL_MS = 45000;
        this.presenceTimeoutInterval = setInterval(async () => {
            const now = new Date();
            const cutoff = new Date(now.getTime() - PRESENCE_TIMEOUT_MS);
            for (const [userId, lastActive] of this.userLastActiveAt.entries()) {
                if (lastActive >= cutoff)
                    continue;
                const socketIds = this.userSockets.get(userId);
                this.userLastActiveAt.delete(userId);
                if (!socketIds?.size)
                    continue;
                try {
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: { isOnline: false, lastSeen: now },
                    });
                    this.broadcastUserStatus(userId, false);
                }
                catch (e) {
                }
            }
        }, CHECK_INTERVAL_MS);
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            const userId = payload.userId;
            let socketIds = this.userSockets.get(userId);
            if (!socketIds) {
                socketIds = new Set();
                this.userSockets.set(userId, socketIds);
            }
            const wasEmpty = socketIds.size === 0;
            socketIds.add(client.id);
            this.socketToUser.set(client.id, userId);
            client.join(`user_${userId}`);
            if (wasEmpty) {
                const now = new Date();
                this.userLastActiveAt.set(userId, now);
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { isOnline: true, lastActiveAt: now },
                });
                console.log(`✅ ${userId} çevrim içi`);
                this.broadcastUserStatus(userId, true);
            }
            else {
                this.userLastActiveAt.set(userId, new Date());
            }
        }
        catch (error) {
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        const userId = this.socketToUser.get(client.id);
        if (userId) {
            const socketIds = this.userSockets.get(userId);
            if (socketIds) {
                socketIds.delete(client.id);
                if (socketIds.size === 0) {
                    this.userSockets.delete(userId);
                    this.userLastActiveAt.delete(userId);
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: { isOnline: false, lastSeen: new Date() },
                    });
                    console.log(`❌ ${userId} çevrim dışı`);
                    this.broadcastUserStatus(userId, false);
                }
            }
            this.socketToUser.delete(client.id);
        }
    }
    async handlePresencePing(client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId)
            return;
        const now = new Date();
        this.userLastActiveAt.set(userId, now);
        const before = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isOnline: true },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { lastActiveAt: now, isOnline: true },
        });
        if (before && !before.isOnline)
            this.broadcastUserStatus(userId, true);
    }
    async handlePresenceOffline(client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId)
            return;
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            socketIds.delete(client.id);
            if (socketIds.size === 0) {
                this.userSockets.delete(userId);
                this.userLastActiveAt.delete(userId);
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { isOnline: false, lastSeen: new Date() },
                });
                this.broadcastUserStatus(userId, false);
            }
        }
        this.socketToUser.delete(client.id);
    }
    async handleJoinConversation(data, client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId)
            return { error: 'Unauthorized' };
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: data.conversationId },
            include: { participants: true },
        });
        if (!conversation) {
            return { error: 'Conversation not found' };
        }
        const hasAccess = conversation.participants.some((p) => p.userId === userId);
        if (!hasAccess) {
            return { error: 'Access denied' };
        }
        client.join(`conversation_${data.conversationId}`);
        return { success: true, conversationId: data.conversationId };
    }
    async handleLeaveConversation(data, client) {
        client.leave(`conversation_${data.conversationId}`);
        return { success: true, conversationId: data.conversationId };
    }
    async handleSendMessage(data, client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId) {
            return { error: 'Unauthorized' };
        }
        const isPostShare = data.messageType === 'POST_SHARE' && data.sharedPostId;
        if (!data.content && !data.imageUrl && !data.fileUrl && !isPostShare) {
            return { error: 'Message must have content, imageUrl, or fileUrl' };
        }
        try {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: data.conversationId },
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
                return { error: 'Conversation not found' };
            }
            const hasAccess = conversation.participants.some((p) => p.userId === userId);
            if (!hasAccess) {
                return { error: 'Access denied' };
            }
            const otherParticipant = conversation.participants.find((p) => p.userId !== userId);
            if (!otherParticipant) {
                return { error: 'Other participant not found' };
            }
            const isBlocked = await this.blocksService.isBlocked(userId, otherParticipant.userId);
            if (isBlocked) {
                return { error: 'Cannot send message. User is blocked.' };
            }
            const recipient = await this.prisma.user.findUnique({
                where: { id: otherParticipant.userId },
                select: { id: true, isPrivate: true },
            });
            let isRequest = false;
            if (recipient?.isPrivate) {
                const isFollowing = await this.prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: userId,
                            followingId: recipient.id,
                        },
                    },
                });
                if (!isFollowing) {
                    isRequest = true;
                    console.log(`📩 [ChatGateway] Message marked as request: sender=${userId}, recipient=${recipient.id} (private account, not following)`);
                }
            }
            const conversationAny = conversation;
            const messageContext = conversationAny.context || 'DIRECT';
            const messageJobId = conversationAny.jobId || null;
            const messageApplicationId = conversationAny.applicationId || null;
            const messageData = {
                conversationId: data.conversationId,
                senderId: userId,
                content: isPostShare ? null : data.content || null,
                imageUrl: isPostShare ? null : data.imageUrl || null,
                fileUrl: isPostShare ? null : data.fileUrl || null,
                fileName: isPostShare ? null : data.fileName || null,
                fileType: isPostShare ? null : data.fileType || null,
                messageType: isPostShare ? 'POST_SHARE' : 'TEXT',
                sharedPostId: isPostShare ? String(data.sharedPostId) : null,
                isRequest: isRequest,
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
                        },
                    },
                },
            });
            console.log(`✅ [ChatGateway] Message created in DB: ${message.id}, conversation: ${data.conversationId}, sender: ${userId}`);
            this.broadcastMessageImmediately(message, conversation, userId, data.conversationId);
            const receiverParticipant = conversation.participants.find((p) => p.userId !== userId);
            if (receiverParticipant) {
                this.notificationsService.createNotificationSync({
                    userId: receiverParticipant.userId,
                    type: 'message',
                    fromUserId: userId,
                    targetPath: '/messages',
                    targetUrl: '/messages',
                }).catch((err) => {
                    console.warn('[ChatGateway] Message notification failed:', err?.message || err);
                });
            }
            const lastMessageText = isPostShare
                ? '📎 Bir gönderi paylaştı'
                : message.content ?? (message.imageUrl ? '📷 Fotoğraf' : (message.fileUrl ? '📎 Dosya' : 'Yeni mesaj'));
            await this.prisma.conversation.update({
                where: { id: data.conversationId },
                data: {
                    lastMessage: lastMessageText,
                    updatedAt: new Date(),
                },
            });
            console.log(`✅ [ChatGateway] Conversation lastMessage updated: ${lastMessageText.substring(0, 50)}...`);
            if (receiverParticipant) {
                this.prisma.userConversation.upsert({
                    where: {
                        userId_conversationId: {
                            userId: receiverParticipant.userId,
                            conversationId: data.conversationId,
                        },
                    },
                    create: {
                        userId: receiverParticipant.userId,
                        conversationId: data.conversationId,
                        isDeleted: false,
                    },
                    update: {
                        isDeleted: false,
                    },
                }).then(() => {
                    console.log(`✅ [ChatGateway] UserConversation ensured for receiver: ${receiverParticipant.userId}`);
                }).catch(err => {
                    console.error(`❌ [ChatGateway] Failed to create UserConversation for receiver: ${err.message}`);
                });
            }
            this.prisma.userConversation.upsert({
                where: {
                    userId_conversationId: {
                        userId: userId,
                        conversationId: data.conversationId,
                    },
                },
                create: {
                    userId: userId,
                    conversationId: data.conversationId,
                    isDeleted: false,
                },
                update: {},
            }).then(() => {
                console.log(`✅ [ChatGateway] UserConversation ensured for sender: ${userId}`);
            }).catch(err => {
                console.error(`❌ [ChatGateway] Failed to create UserConversation for sender: ${err.message}`);
            });
            this.prepareAndSendConversationUpdate(data.conversationId, message).catch(err => {
                console.error(`❌ [ChatGateway] Failed to prepare conversation update: ${err.message}`);
            });
            return { success: true, message };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    async broadcastMessageImmediately(message, conversation, userId, conversationId) {
        console.log(`📤 [ChatGateway] Broadcasting message ${message.id} to conversation ${conversationId} (IMMEDIATE)`);
        console.log(`📤 [ChatGateway] Sender: ${userId}`);
        console.log(`📤 [ChatGateway] Participants:`, conversation.participants.map((p) => ({ userId: p.userId, username: p.user?.username })));
        console.log(`📤 [ChatGateway] Active sockets:`, Array.from(this.userSockets.entries()).map(([uid, sid]) => ({ userId: uid, socketId: sid })));
        const conversationAny = conversation;
        const updatedConversation = {
            id: conversation.id,
            createdAt: conversation.createdAt,
            updatedAt: new Date(),
            lastMessage: message.messageType === 'POST_SHARE'
                ? '📎 Bir gönderi paylaştı'
                : message.content ?? (message.imageUrl ? '📷 Fotoğraf' : (message.fileUrl ? '📎 Dosya' : 'Yeni mesaj')),
            context: conversationAny.context || 'DIRECT',
            jobId: conversationAny.jobId || null,
            applicationId: conversationAny.applicationId || null,
            participants: conversation.participants.map((p) => ({
                id: p.id || p.userId,
                userId: p.userId,
                user: p.user,
            })),
        };
        this.server.to(`conversation_${conversationId}`).emit('receive_message', message);
        this.server.to(`conversation_${conversationId}`).emit('new_message', {
            conversationId: conversationId,
            message,
            conversation: updatedConversation,
        });
        console.log(`📤 [ChatGateway] Sent to conversation room: conversation_${conversationId}`);
        conversation.participants.forEach((participant) => {
            const participantUserId = participant.userId;
            this.server.to(`user_${participantUserId}`).emit('receive_message', message);
            this.server.to(`user_${participantUserId}`).emit('new_message', {
                conversationId: conversationId,
                message,
                conversation: updatedConversation,
            });
            this.server.to(`user_${participantUserId}`).emit('conversation_updated', updatedConversation);
            this.server.to(`conversation_${conversationId}`).emit('receive_message', message);
            this.server.to(`conversation_${conversationId}`).emit('new_message', {
                conversationId: conversationId,
                message,
                conversation: updatedConversation,
            });
            this.server.to(`conversation_${conversationId}`).emit('conversation_updated', updatedConversation);
        });
        console.log(`✅ [ChatGateway] Message ${message.id} broadcasted to all participants of conversation ${conversationId} (IMMEDIATE)`);
    }
    async prepareAndSendConversationUpdate(conversationId, message) {
        try {
            const updatedConversation = await this.prisma.conversation.findUnique({
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
            });
            if (updatedConversation) {
                updatedConversation.participants.forEach((participant) => {
                    this.server.to(`user_${participant.userId}`).emit('conversation_updated', updatedConversation);
                });
                console.log(`✅ [ChatGateway] Conversation update sent for conversation ${conversationId}`);
            }
        }
        catch (error) {
            console.error(`❌ [ChatGateway] Failed to prepare conversation update: ${error.message}`);
        }
    }
    async handleTyping(data, client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId)
            return;
        client.to(`conversation_${data.conversationId}`).emit('user_typing', {
            userId,
            conversationId: data.conversationId,
            isTyping: data.isTyping,
        });
    }
    async handleTypingStart(data, client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId)
            return { error: 'Unauthorized' };
        try {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: data.conversationId },
                include: { participants: true },
            });
            if (!conversation) {
                return { error: 'Conversation not found' };
            }
            const hasAccess = conversation.participants.some((p) => p.userId === userId);
            if (!hasAccess) {
                return { error: 'Access denied' };
            }
            conversation.participants.forEach((participant) => {
                if (participant.userId !== userId) {
                    this.server.to(`user_${participant.userId}`).emit('typing_start', {
                        conversationId: data.conversationId,
                        userId,
                    });
                }
            });
            return { success: true };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    async handleTypingStop(data, client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId)
            return { error: 'Unauthorized' };
        try {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: data.conversationId },
                include: { participants: true },
            });
            if (!conversation) {
                return { error: 'Conversation not found' };
            }
            const hasAccess = conversation.participants.some((p) => p.userId === userId);
            if (!hasAccess) {
                return { error: 'Access denied' };
            }
            conversation.participants.forEach((participant) => {
                if (participant.userId !== userId) {
                    this.server.to(`user_${participant.userId}`).emit('typing_stop', {
                        conversationId: data.conversationId,
                        userId,
                    });
                }
            });
            return { success: true };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    async handleMarkMessageRead(data, client) {
        const userId = this.socketToUser.get(client.id);
        if (!userId) {
            return { error: 'Unauthorized' };
        }
        try {
            const message = await this.prisma.message.findUnique({
                where: { id: data.messageId },
                include: {
                    conversation: {
                        include: { participants: true },
                    },
                },
            });
            if (!message) {
                return { error: 'Message not found' };
            }
            const hasAccess = message.conversation.participants.some((p) => p.userId === userId);
            if (!hasAccess) {
                return { error: 'Access denied' };
            }
            if (message.senderId === userId) {
                return { error: 'Cannot mark own message as read' };
            }
            const updatedMessage = await this.prisma.message.update({
                where: { id: data.messageId },
                data: { read: true },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            });
            this.server.to(`user_${message.senderId}`).emit('message_read_update', {
                messageId: data.messageId,
                conversationId: data.conversationId,
                readBy: userId,
            });
            return { success: true, message: updatedMessage };
        }
        catch (error) {
            return { error: error.message };
        }
    }
    async markMessagesAsRead(conversationId, userId) {
        const updatedCount = await this.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: userId },
                read: false,
            },
            data: {
                read: true,
            },
        });
        this.server.to(`conversation_${conversationId}`).emit('messages_read', {
            conversationId,
            userId,
            count: updatedCount.count,
        });
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });
        if (conversation) {
            const senderParticipant = conversation.participants.find((p) => p.userId !== userId);
            if (senderParticipant) {
                this.server.to(`user_${senderParticipant.userId}`).emit('messages_read', {
                    conversationId,
                    userId,
                    count: updatedCount.count,
                });
            }
        }
        return updatedCount;
    }
    isUserOnline(userId) {
        const set = this.userSockets.get(userId);
        return !!set && set.size > 0;
    }
    sendToUser(userId, event, data) {
        this.server.to(`user_${userId}`).emit(event, data);
    }
    async broadcastMessageEdited(message) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: message.conversationId },
            include: { participants: true },
        });
        if (conversation) {
            this.server.to(`conversation_${message.conversationId}`).emit('messageEdited', message);
        }
    }
    async broadcastMessageDeleted(messageId, conversationId) {
        this.server.to(`conversation_${conversationId}`).emit('messageDeleted', {
            id: messageId,
            conversationId,
        });
    }
    async broadcastUserStatus(userId, isOnline) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, isOnline: true, lastSeen: true },
        });
        if (user) {
            this.server.emit('user_status_update', {
                userId,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
            });
        }
    }
    async handleGetActiveUsers(client) {
        const activeUserIds = Array.from(this.userSockets.keys());
        const userStatuses = await Promise.all(activeUserIds.map(async (userId) => {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, isOnline: true, lastSeen: true },
            });
            return user ? { userId: user.id, isOnline: user.isOnline, lastSeen: user.lastSeen } : null;
        }));
        const validUsers = userStatuses.filter((u) => u !== null);
        client.emit('active_users_list', validUsers.map((u) => u.userId));
        validUsers.forEach((u) => {
            client.emit('user_status_update', {
                userId: u.userId,
                isOnline: u.isOnline,
                lastSeen: u.lastSeen,
            });
        });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('presence:ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handlePresencePing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('presence:offline'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handlePresenceOffline", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_conversation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing_start'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing_stop'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTypingStop", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('mark_message_read'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkMessageRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('get_active_users'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleGetActiveUsers", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/chat',
        ...(0, websocket_cors_util_1.getWebSocketCorsConfig)(),
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        blocks_service_1.BlocksService,
        follow_service_1.FollowService,
        notifications_service_1.NotificationsService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map