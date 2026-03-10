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
var ArticlesGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const websocket_cors_util_1 = require("../common/utils/websocket-cors.util");
let ArticlesGateway = ArticlesGateway_1 = class ArticlesGateway {
    constructor(jwtService, prisma) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(ArticlesGateway_1.name);
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                this.logger.warn(`❌ Articles: Unauthorized connection attempt`);
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            const userId = payload.userId || payload.sub;
            client.data.userId = userId;
            this.logger.log(`✅ Articles: ${userId} connected`);
        }
        catch (error) {
            this.logger.error(`❌ Articles: Authentication failed`, error);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.logger.log(`❌ Articles: Client disconnected`);
    }
    handleJoinArticleRoom(client, articleId) {
        const room = `article_${articleId}`;
        client.join(room);
        this.logger.log(`📝 Client joined room: ${room}`);
    }
};
exports.ArticlesGateway = ArticlesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ArticlesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinArticleRoom'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], ArticlesGateway.prototype, "handleJoinArticleRoom", null);
exports.ArticlesGateway = ArticlesGateway = ArticlesGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/articles',
        ...(0, websocket_cors_util_1.getWebSocketCorsConfig)(),
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService])
], ArticlesGateway);
//# sourceMappingURL=articles.gateway.js.map