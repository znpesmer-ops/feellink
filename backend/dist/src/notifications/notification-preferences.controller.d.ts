import { NotificationsService } from './notifications.service';
export declare class NotificationPreferencesController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyPrefs(user: any): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        userId: string;
        comment: boolean;
        like: boolean;
        follow: boolean;
        mention: boolean;
    }>;
    updatePrefs(user: any, body: {
        mention?: boolean;
        follow?: boolean;
        like?: boolean;
        comment?: boolean;
    }): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        userId: string;
        comment: boolean;
        like: boolean;
        follow: boolean;
        mention: boolean;
    }>;
}
