import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private prisma;
    server: Server;
    private userSockets;
    constructor(jwtService: JwtService, prisma: PrismaService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    notifyUser(userId: string, notification: any): void;
    sendNotificationToUser(userId: string, notificationData: any): Promise<boolean>;
    notifyNotificationRead(userId: string, notificationId: string): void;
    emitTicketUpdate(eventId: string, ticketData: any): void;
    emitVisitorUpdate(corporateUserId: string, visitorsData: any[]): void;
}
