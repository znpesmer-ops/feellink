import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PostsService } from '../posts/posts.service';
import { BlocksService } from '../blocks/blocks.service';
export declare class ChatService {
    private prisma;
    private chatGateway;
    private notificationsService;
    private postsService;
    private blocksService;
    constructor(prisma: PrismaService, chatGateway: ChatGateway, notificationsService: NotificationsService, postsService: PostsService, blocksService: BlocksService);
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
            userId: string;
            createdAt: Date;
            isDeleted: boolean;
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
            createdAt: Date;
            updatedAt: Date;
            isDeleted: boolean;
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
            messageType: string;
            sharedPostId: string;
            conversationId: string;
            senderId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        lastMessage: string;
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
            userId: string;
            createdAt: Date;
            isDeleted: boolean;
            conversationId: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        lastMessage: string;
    }>;
    getMessages(conversationId: string, userId: string, limit?: number, cursor?: string): Promise<{
        messages: any[];
        hasMore: boolean;
        nextCursor: string;
    }>;
    sendPostShareMessage(senderId: string, conversationId: string, sharedPostId: string): Promise<{
        sender: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isDeleted: boolean;
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
        messageType: string;
        sharedPostId: string;
        conversationId: string;
        senderId: string;
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
        createdAt: Date;
        updatedAt: Date;
        isDeleted: boolean;
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
        messageType: string;
        sharedPostId: string;
        conversationId: string;
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
            userId: string;
            createdAt: Date;
            isDeleted: boolean;
            conversationId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        lastMessage: string;
    }>;
    markAsRead(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    deleteConversation(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    editMessage(messageId: string, userId: string, newContent: string): Promise<{
        conversation: {
            id: string;
        };
        sender: {
            id: string;
            username: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isDeleted: boolean;
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
        messageType: string;
        sharedPostId: string;
        conversationId: string;
        senderId: string;
    }>;
    deleteMessage(messageId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isDeleted: boolean;
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
        messageType: string;
        sharedPostId: string;
        conversationId: string;
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
        messages: ({
            sender: {
                id: string;
                username: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isDeleted: boolean;
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
            messageType: string;
            sharedPostId: string;
            conversationId: string;
            senderId: string;
        })[];
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
            userId: string;
            createdAt: Date;
            isDeleted: boolean;
            conversationId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        lastMessage: string;
    })[]>;
    acceptMessageRequest(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
    declineMessageRequest(conversationId: string, userId: string): Promise<{
        success: boolean;
    }>;
}
