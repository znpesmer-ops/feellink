import { NotificationsService } from './notifications.service';
export declare class NotificationPreferencesController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyPrefs(user: any): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        comment: boolean;
        mention: boolean;
        follow: boolean;
        like: boolean;
    }>;
    updatePrefs(user: any, body: {
        mention?: boolean;
        follow?: boolean;
        like?: boolean;
        comment?: boolean;
    }): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        comment: boolean;
        mention: boolean;
        follow: boolean;
        like: boolean;
    }>;
}
