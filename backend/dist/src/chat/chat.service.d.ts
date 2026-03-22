import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ChatService {
    private prisma;
    private chatGateway;
    private notificationsService;
    constructor(prisma: PrismaService, chatGateway: ChatGateway, notificationsService: NotificationsService);
    getConversations(userId: string): Promise<{
        participants: {
            user: {
                lastActiveAt: Date;
                id: string;
                username: string;
                avatar?: string;
                fullName?: string;
                isOnline: boolean;
                lastSeen: Date | null;
            };
            id: string;
            isDeleted: boolean;
            createdAt: Date;
            userId: string;
            conversationId: string;
        }[];
        unreadCount: number;
        messages: ({
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
            conversationId: string;
            applicationId: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            content: string;
            imageUrl: string;
            fileUrl: string;
            fileName: string;
            fileType: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
            senderId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string;
        lastMessage: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
    }[]>;
    getUnreadMessageCount(userId: string): Promise<number>;
    getConversation(conversationId: string, userId: string): Promise<{
        participants: {
            user: {
                lastActiveAt: Date;
                id: string;
                username: string;
                avatar?: string;
                fullName?: string;
                isPrivate?: boolean;
                isOnline: boolean;
                lastSeen: Date | null;
            };
            id: string;
            isDeleted: boolean;
            createdAt: Date;
            userId: string;
            conversationId: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string;
        lastMessage: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
    }>;
    getMessages(conversationId: string, userId: string, limit?: number, cursor?: string): Promise<{
        messages: ({
            sender: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        } & {
            id: string;
            isDeleted: boolean;
            createdAt: Date;
            updatedAt: Date;
            conversationId: string;
            applicationId: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            content: string;
            imageUrl: string;
            fileUrl: string;
            fileName: string;
            fileType: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
            senderId: string;
        })[];
        hasMore: boolean;
        nextCursor: string;
    }>;
    createMessage(userId: string, conversationId: string, content?: string, imageUrl?: string, fileUrl?: string, fileName?: string, fileType?: string): Promise<{
        sender: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        conversationId: string;
        applicationId: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        content: string;
        imageUrl: string;
        fileUrl: string;
        fileName: string;
        fileType: string;
        read: boolean;
        isEdited: boolean;
        isRequest: boolean;
        senderId: string;
    }>;
    createConversation(userId: string, participantIds: string[], context?: 'DIRECT' | 'JOB_APPLICATION', jobId?: string, applicationId?: string): Promise<{
        participants: ({
            user: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
                isOnline: boolean;
                lastSeen: Date;
            };
        } & {
            id: string;
            isDeleted: boolean;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string;
        lastMessage: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
    }>;
    markAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    deleteConversation(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    editMessage(messageId: string, userId: string, newContent: string): Promise<{
        sender: {
            id: string;
            username: string;
            avatar: string;
        };
        conversation: {
            id: string;
        };
    } & {
        id: string;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        conversationId: string;
        applicationId: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        content: string;
        imageUrl: string;
        fileUrl: string;
        fileName: string;
        fileType: string;
        read: boolean;
        isEdited: boolean;
        isRequest: boolean;
        senderId: string;
    }>;
    deleteMessage(messageId: string, userId: string): Promise<{
        id: string;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        conversationId: string;
        applicationId: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        content: string;
        imageUrl: string;
        fileUrl: string;
        fileName: string;
        fileType: string;
        read: boolean;
        isEdited: boolean;
        isRequest: boolean;
        senderId: string;
    }>;
    getMedia(conversationId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string;
        senderId: string;
    }[]>;
    getFiles(conversationId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        fileUrl: string;
        fileName: string;
        fileType: string;
        senderId: string;
    }[]>;
    getMessageRequests(userId: string): Promise<({
        participants: ({
            user: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
                isOnline: boolean;
                lastSeen: Date;
            };
        } & {
            id: string;
            isDeleted: boolean;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
        messages: ({
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
            conversationId: string;
            applicationId: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            content: string;
            imageUrl: string;
            fileUrl: string;
            fileName: string;
            fileType: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
            senderId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        applicationId: string;
        lastMessage: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
    })[]>;
    acceptMessageRequest(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    declineMessageRequest(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
