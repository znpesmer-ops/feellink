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
exports.CommentsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const websocket_cors_util_1 = require("../common/utils/websocket-cors.util");
let CommentsGateway = class CommentsGateway {
    constructor(jwtService, prisma, notificationsService) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    afterInit(server) {
        console.log('Comments WebSocket Gateway initialized');
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
            console.log(`✅ Comments: ${userId} connected`);
        }
        catch (error) {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        console.log('❌ Comments: Client disconnected');
    }
    handleJoinPostRoom(postId, client) {
        const room = `post_${postId}`;
        client.join(room);
        console.log(`📝 Client joined room: ${room}`);
    }
    handleLeavePostRoom(postId, client) {
        const room = `post_${postId}`;
        client.leave(room);
        console.log(`📝 Client left room: ${room}`);
    }
    async handleNewComment(data, client) {
        const room = `post_${data.postId}`;
        this.server.to(room).emit('newComment', data.comment);
        console.log(`💬 New comment in room: ${room}`);
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (token) {
                const payload = this.jwtService.verify(token);
                const commenterId = payload.userId;
                const post = await this.prisma.post.findUnique({
                    where: { id: data.postId },
                    select: { userId: true },
                });
                if (post && post.userId !== commenterId) {
                    await this.notificationsService.createNotification({
                        userId: post.userId,
                        type: 'comment',
                        fromUserId: commenterId,
                        postId: data.postId,
                        commentId: data.comment?.id,
                    });
                    console.log(`🔔 Comment notification sent to post owner: ${post.userId}`);
                }
            }
        }
        catch (error) {
            console.error('Error sending comment notification:', error);
        }
        return data.comment;
    }
};
exports.CommentsGateway = CommentsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], CommentsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinPostRoom'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], CommentsGateway.prototype, "handleJoinPostRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leavePostRoom'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], CommentsGateway.prototype, "handleLeavePostRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('newComment'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], CommentsGateway.prototype, "handleNewComment", null);
exports.CommentsGateway = CommentsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/comments',
        ...(0, websocket_cors_util_1.getWebSocketCorsConfig)(),
    }),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], CommentsGateway);
//# sourceMappingURL=comments.gateway.js.map