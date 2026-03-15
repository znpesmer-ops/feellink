import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsController {
    private notificationsService;
    private prisma;
    constructor(notificationsService: NotificationsService, prisma: PrismaService);
    getNotifications(user: any, limit?: string, offset?: string): Promise<{
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
            createdAt: Date;
            id: string;
            userId: string;
            message: string;
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
    getUnreadCount(user: any): Promise<{
        count: number;
    }>;
    markAsRead(id: string, user: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllAsRead(user: any): Promise<{
        success: boolean;
        unreadCount: number;
    }>;
}
