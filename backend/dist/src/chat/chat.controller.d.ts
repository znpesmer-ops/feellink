import { ChatService } from './chat.service';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    getConversations(user: any): Promise<{
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
            content: string;
            fileName: string;
            fileType: string;
            imageUrl: string;
            fileUrl: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            applicationId: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
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
            isDeleted: boolean;
            createdAt: Date;
            userId: string;
            conversationId: string;
        })[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        lastMessage: string;
    }[]>;
    getConversation(id: string, user: any): Promise<{
        participants: ({
            user: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
                isPrivate: boolean;
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
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        lastMessage: string;
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
            content: string;
            fileName: string;
            fileType: string;
            imageUrl: string;
            fileUrl: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            applicationId: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
            conversationId: string;
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
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        lastMessage: string;
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
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        fileName: string;
        fileType: string;
        imageUrl: string;
        fileUrl: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        read: boolean;
        isEdited: boolean;
        isRequest: boolean;
        conversationId: string;
        senderId: string;
    }>;
    deleteMessage(id: string, user: any): Promise<{
        id: string;
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        fileName: string;
        fileType: string;
        imageUrl: string;
        fileUrl: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        read: boolean;
        isEdited: boolean;
        isRequest: boolean;
        conversationId: string;
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
        content: string;
        fileName: string;
        fileType: string;
        imageUrl: string;
        fileUrl: string;
        context: import(".prisma/client").$Enums.ConversationContext;
        jobId: string;
        applicationId: string;
        read: boolean;
        isEdited: boolean;
        isRequest: boolean;
        conversationId: string;
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
        fileName: string;
        fileType: string;
        fileUrl: string;
        senderId: string;
    }[]>;
    getMessageRequests(user: any): Promise<({
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
            content: string;
            fileName: string;
            fileType: string;
            imageUrl: string;
            fileUrl: string;
            context: import(".prisma/client").$Enums.ConversationContext;
            jobId: string;
            applicationId: string;
            read: boolean;
            isEdited: boolean;
            isRequest: boolean;
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
            isDeleted: boolean;
            createdAt: Date;
            userId: string;
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
