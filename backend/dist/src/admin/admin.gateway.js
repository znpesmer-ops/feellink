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
var AdminGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const schedule_1 = require("@nestjs/schedule");
const websocket_cors_util_1 = require("../common/utils/websocket-cors.util");
let AdminGateway = AdminGateway_1 = class AdminGateway {
    constructor(jwtService, adminService) {
        this.jwtService = jwtService;
        this.adminService = adminService;
        this.logger = new common_1.Logger(AdminGateway_1.name);
        this.adminSockets = new Map();
    }
    afterInit(server) {
        this.logger.log('Admin WebSocket Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            const userId = payload.userId;
            this.adminSockets.set(userId, client);
            this.logger.log(`Admin connected: ${userId}`);
            const summary = await this.adminService.getSummary();
            client.emit('admin:metrics', summary);
        }
        catch (error) {
            this.logger.error('Admin connection error:', error);
            client.disconnect();
        }
    }
    emitVisitorLocation(data) {
        this.server.emit('visitor:location', data);
    }
    handleDisconnect(client) {
        for (const [userId, socket] of this.adminSockets.entries()) {
            if (socket === client) {
                this.adminSockets.delete(userId);
                this.logger.log(`Admin disconnected: ${userId}`);
                break;
            }
        }
    }
    async broadcastMetrics() {
        try {
            const summary = await this.adminService.getSummary();
            this.server.emit('admin:metrics', summary);
        }
        catch (error) {
            this.logger.error('Error broadcasting metrics:', error);
        }
    }
    async broadcastAnalytics() {
        try {
            const analytics = await this.adminService.getAnalytics();
            this.server.emit('admin:analytics', analytics);
        }
        catch (error) {
            this.logger.error('Error broadcasting analytics:', error);
        }
    }
    emitModerationEvent(event) {
        this.server.emit('admin:moderation', event);
    }
    emitSystemEvent(event) {
        this.server.emit('admin:system', event);
    }
};
exports.AdminGateway = AdminGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AdminGateway.prototype, "server", void 0);
__decorate([
    (0, schedule_1.Cron)('*/10 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGateway.prototype, "broadcastMetrics", null);
__decorate([
    (0, schedule_1.Cron)('*/30 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGateway.prototype, "broadcastAnalytics", null);
exports.AdminGateway = AdminGateway = AdminGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/admin',
        ...(0, websocket_cors_util_1.getWebSocketCorsConfig)(),
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        admin_service_1.AdminService])
], AdminGateway);
//# sourceMappingURL=admin.gateway.js.map