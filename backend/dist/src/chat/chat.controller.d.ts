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
    getMessages(id: string, limit?: string, cursor?: string, user?: any): Promise<{
        messages: any[];
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
    deleteMessage(id: string, user: any): Promise<{
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
