import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
import { NotificationsGateway } from './notifications.gateway';
interface CreateNotificationDto {
    userId: string;
    type: string;
    message?: string;
    fromUserId?: string;
    postId?: string;
    articleId?: string;
    commentId?: string;
    targetUrl?: string;
    targetPath?: string;
    meta?: Record<string, any>;
}
type NotifType = 'mention' | 'follow' | 'follow_request' | 'follow_accept' | 'like' | 'comment' | 'reply' | 'comment_pinned' | 'event_join' | 'event_comment' | 'event_like' | 'event_ticket_purchased' | 'ticket_confirmation';
export declare class NotificationsService {
    private prisma;
    private notificationsQueue;
    private notificationsGateway;
    constructor(prisma: PrismaService, notificationsQueue: Queue | null, notificationsGateway: NotificationsGateway);
    createNotification(data: CreateNotificationDto): Promise<({
        fromUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        fromUserId: string;
        postId: string;
        articleId: string;
        commentId: string;
        targetUrl: string;
        targetPath: string;
        isRead: boolean;
    }) | {
        queued: boolean;
    }>;
    createNotificationSync(data: CreateNotificationDto): Promise<{
        fromUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        type: string;
        fromUserId: string;
        postId: string;
        articleId: string;
        commentId: string;
        targetUrl: string;
        targetPath: string;
        isRead: boolean;
    }>;
    getNotifications(userId: string, limit?: number, offset?: number): Promise<{
        notifications: {
            sender: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
                isVerified: boolean;
            };
            payload: {
                fromUserId: string;
                postId: string;
                commentId: string;
            };
            message: string;
            id: string;
            createdAt: Date;
            userId: string;
            type: string;
            fromUserId: string;
            postId: string;
            articleId: string;
            commentId: string;
            targetUrl: string;
            targetPath: string;
            isRead: boolean;
        }[];
        unreadCount: number;
    }>;
    markAsRead(userId: string, notificationId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
        unreadCount: number;
    }>;
    getUnreadCount(userId: string, excludeProfileIncomplete?: boolean): Promise<number>;
    getPrefs(userId: string): Promise<{
        comment: boolean;
        like: boolean;
        follow: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        mention: boolean;
    }>;
    updatePrefs(userId: string, data: Partial<Record<NotifType, boolean>>): Promise<{
        comment: boolean;
        like: boolean;
        follow: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        mention: boolean;
    }>;
    isAllowed(toUserId: string, type: NotifType): Promise<boolean>;
    createEventTicketNotification(eventId: string, buyerId: string): Promise<void>;
}
export {};
