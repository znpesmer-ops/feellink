import { NotificationsService } from './notifications.service';
export declare class NotificationPreferencesController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyPrefs(user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        follow: boolean;
        userId: string;
        like: boolean;
        comment: boolean;
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
        follow: boolean;
        userId: string;
        like: boolean;
        comment: boolean;
        mention: boolean;
    }>;
}
