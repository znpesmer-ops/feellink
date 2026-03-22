import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';
import { FollowService } from '../follow/follow.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private prisma;
    private blocksService;
    private followService;
    private notificationsService;
    server: Server;
    private userSockets;
    private socketToUser;
    private userLastActiveAt;
    private presenceTimeoutInterval;
    constructor(jwtService: JwtService, prisma: PrismaService, blocksService: BlocksService, followService: FollowService, notificationsService: NotificationsService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handlePresencePing(client: Socket): Promise<void>;
    handlePresenceOffline(client: Socket): Promise<void>;
    handleJoinConversation(data: {
        conversationId: string;
    }, client: Socket): Promise<{
        error: string;
        success?: undefined;
        conversationId?: undefined;
    } | {
        success: boolean;
        conversationId: string;
        error?: undefined;
    }>;
    handleLeaveConversation(data: {
        conversationId: string;
    }, client: Socket): Promise<{
        success: boolean;
        conversationId: string;
    }>;
    handleSendMessage(data: {
        conversationId: string;
        content?: string;
        imageUrl?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
    }, client: Socket): Promise<{
        success: boolean;
        message: {
            sender: {
                id: string;
                username: string;
                avatar: string;
            };
        } & {
            id: string;
            isDeleted: boolean;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            imageUrl: string;
            fileUrl: string;
            fileName: string;
            fileType: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            applicationId: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
            conversationId: string;
            senderId: string;
        };
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
        message?: undefined;
    }>;
    private broadcastMessageImmediately;
    private prepareAndSendConversationUpdate;
    handleTyping(data: {
        conversationId: string;
        isTyping: boolean;
    }, client: Socket): Promise<void>;
    handleTypingStart(data: {
        conversationId: string;
    }, client: Socket): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
    }>;
    handleTypingStop(data: {
        conversationId: string;
    }, client: Socket): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
    }>;
    handleMarkMessageRead(data: {
        messageId: string;
        conversationId: string;
    }, client: Socket): Promise<{
        success: boolean;
        message: {
            sender: {
                id: string;
                username: string;
                avatar: string;
            };
        } & {
            id: string;
            isDeleted: boolean;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            imageUrl: string;
            fileUrl: string;
            fileName: string;
            fileType: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            applicationId: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
            conversationId: string;
            senderId: string;
        };
        error?: undefined;
    } | {
        error: any;
        success?: undefined;
        message?: undefined;
    }>;
    markMessagesAsRead(conversationId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    isUserOnline(userId: string): boolean;
    sendToUser(userId: string, event: string, data: any): void;
    broadcastMessageEdited(message: any): Promise<void>;
    broadcastMessageDeleted(messageId: string, conversationId: string): Promise<void>;
    private broadcastUserStatus;
    handleGetActiveUsers(client: Socket): Promise<void>;
}
