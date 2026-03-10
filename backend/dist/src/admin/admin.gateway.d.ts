import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from './admin.service';
export declare class AdminGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private adminService;
    server: Server;
    private readonly logger;
    private adminSockets;
    constructor(jwtService: JwtService, adminService: AdminService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    emitVisitorLocation(data: {
        userId: string;
        country: string;
        city: string;
        lat: number;
        lon: number;
        timestamp: string;
        username?: string;
    }): void;
    handleDisconnect(client: Socket): void;
    broadcastMetrics(): Promise<void>;
    broadcastAnalytics(): Promise<void>;
    emitModerationEvent(event: {
        type: string;
        target: string;
        action: string;
        data?: any;
    }): void;
    emitSystemEvent(event: {
        type: string;
        message: string;
        data?: any;
    }): void;
}
