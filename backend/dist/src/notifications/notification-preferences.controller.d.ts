import { NotificationsService } from './notifications.service';
export declare class NotificationPreferencesController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyPrefs(user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        like: boolean;
        comment: boolean;
        follow: boolean;
        mention: boolean;
    }>;
    updatePrefs(user: any, body: {
        mention?: boolean;
        follow?: boolean;
        like?: boolean;
        comment?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        like: boolean;
        comment: boolean;
        follow: boolean;
        mention: boolean;
    }>;
}
