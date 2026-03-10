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
exports.NotificationsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const websocket_cors_util_1 = require("../common/utils/websocket-cors.util");
let NotificationsGateway = class NotificationsGateway {
    constructor(jwtService, prisma) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.userSockets = new Map();
    }
    afterInit(server) {
        console.log('WebSocket Gateway initialized');
    }
    handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            const userId = payload.userId;
            this.userSockets.set(userId, client);
        }
        catch (error) {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        for (const [userId, socket] of this.userSockets.entries()) {
            if (socket === client) {
                this.userSockets.delete(userId);
                break;
            }
        }
    }
    notifyUser(userId, notification) {
        const socket = this.userSockets.get(userId);
        if (socket) {
            socket.emit('notification', notification);
        }
    }
    async sendNotificationToUser(userId, notificationData) {
        const socket = this.userSockets.get(userId);
        if (socket) {
            socket.emit('notification', notificationData);
            return true;
        }
        return false;
    }
    notifyNotificationRead(userId, notificationId) {
        const socket = this.userSockets.get(userId);
        if (socket) {
            socket.emit('notificationRead', {
                notificationId,
                userId,
            });
            console.log(`📡 Notification read event sent to user ${userId} for notification ${notificationId}`);
        }
    }
    emitTicketUpdate(eventId, ticketData) {
        this.server.emit(`ticket_update:${eventId}`, ticketData);
        console.log(`🎫 Ticket update event emitted for event ${eventId}`);
    }
    emitVisitorUpdate(corporateUserId, visitorsData) {
        this.server.emit(`visitor:update:${corporateUserId}`, visitorsData);
        console.log(`🏆 Visitor update event emitted for corporate user ${corporateUserId}`);
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
exports.NotificationsGateway = NotificationsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)((0, websocket_cors_util_1.getWebSocketCorsConfig)()),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService])
], NotificationsGateway);
//# sourceMappingURL=notifications.gateway.js.map