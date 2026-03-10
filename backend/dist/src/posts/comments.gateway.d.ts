import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class CommentsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private prisma;
    private notificationsService;
    server: Server;
    constructor(jwtService: JwtService, prisma: PrismaService, notificationsService: NotificationsService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleJoinPostRoom(postId: string, client: Socket): void;
    handleLeavePostRoom(postId: string, client: Socket): void;
    handleNewComment(data: {
        postId: string;
        comment: any;
        userId?: string;
    }, client: Socket): Promise<any>;
}
