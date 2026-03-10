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
exports.SidebarGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const admin_gateway_1 = require("../admin/admin.gateway");
const websocket_cors_util_1 = require("../common/utils/websocket-cors.util");
let SidebarGateway = class SidebarGateway {
    constructor(adminGateway) {
        this.adminGateway = adminGateway;
    }
    handleConnection(client) {
        console.log('Sidebar client bağlandı:', client.id);
        const ip = client.handshake.address || client.request.socket.remoteAddress;
        this.emitVisitorLocation(client, ip);
    }
    broadcastSidebarUpdate(newData) {
        this.server.emit('sidebarUpdate', newData);
    }
    async emitVisitorLocation(client, ip) {
        try {
            const mockLocations = [
                { country: 'Türkiye', city: 'İstanbul', lat: 41.0082, lon: 28.9784 },
                { country: 'Türkiye', city: 'Ankara', lat: 39.9334, lon: 32.8597 },
                { country: 'Türkiye', city: 'İzmir', lat: 38.4237, lon: 27.1428 },
                { country: 'Almanya', city: 'Berlin', lat: 52.52, lon: 13.405 },
                { country: 'Fransa', city: 'Paris', lat: 48.8566, lon: 2.3522 },
                { country: 'İngiltere', city: 'Londra', lat: 51.5074, lon: -0.1278 },
            ];
            const randomLocation = mockLocations[Math.floor(Math.random() * mockLocations.length)];
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            let userId = client.id;
            let username;
            if (token) {
                try {
                }
                catch (error) {
                }
            }
            this.adminGateway.emitVisitorLocation({
                userId,
                country: randomLocation.country,
                city: randomLocation.city,
                lat: randomLocation.lat,
                lon: randomLocation.lon,
                timestamp: new Date().toISOString(),
                username,
            });
        }
        catch (error) {
            console.error('Error emitting visitor location:', error);
        }
    }
};
exports.SidebarGateway = SidebarGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SidebarGateway.prototype, "server", void 0);
exports.SidebarGateway = SidebarGateway = __decorate([
    (0, websockets_1.WebSocketGateway)((0, websocket_cors_util_1.getWebSocketCorsConfig)()),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [admin_gateway_1.AdminGateway])
], SidebarGateway);
//# sourceMappingURL=sidebar.gateway.js.map