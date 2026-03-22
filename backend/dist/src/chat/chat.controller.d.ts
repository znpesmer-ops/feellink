import { ChatService } from './chat.service';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    getConversations(user: any): Promise<{
        participants: {
            user: {
                lastActiveAt: Date;
                id: string;
                username: string;
                avatar?: string;
                fullName?: string;
                isOnline: boolean;
                lastSeen: Date;
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
    getConversation(id: string, user: any): Promise<{
        participants: {
            user: {
                lastActiveAt: Date;
                id: string;
                username: string;
                avatar?: string;
                fullName?: string;
                isPrivate?: boolean;
                isOnline: boolean;
                lastSeen: Date;
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
    getMessages(id: string, limit?: string, cursor?: string, user?: any): Promise<{
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
    createConversation(body: {
        participantIds: string[];
        context?: 'DIRECT' | 'JOB_APPLICATION';
        jobId?: string;
        applicationId?: string;
    }, user: any): Promise<{
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
    markAsRead(id: string, user: any): Promise<{
        success: boolean;
    }>;
    deleteConversation(id: string, user: any): Promise<{
        success: boolean;
    }>;
    editMessage(id: string, body: {
        content: string;
    }, user: any): Promise<{
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
    deleteMessage(id: string, user: any): Promise<{
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
    createMessage(body: {
        conversationId: string;
        content?: string;
        imageUrl?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
    }, user: any): Promise<{
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
    getMedia(conversationId: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        imageUrl: string;
        senderId: string;
    }[]>;
    getFiles(conversationId: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        fileUrl: string;
        fileName: string;
        fileType: string;
        senderId: string;
    }[]>;
    getMessageRequests(user: any): Promise<({
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
    acceptMessageRequest(conversationId: string, user: any): Promise<{
        success: boolean;
    }>;
    declineMessageRequest(conversationId: string, user: any): Promise<{
        success: boolean;
    }>;
    getUnreadCount(user: any): Promise<{
        count: number;
    }>;
}
