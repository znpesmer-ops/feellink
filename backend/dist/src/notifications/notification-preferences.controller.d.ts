import { NotificationsService } from './notifications.service';
export declare class NotificationPreferencesController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyPrefs(user: any): Promise<{
        comment: boolean;
        like: boolean;
        follow: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        mention: boolean;
    }>;
    updatePrefs(user: any, body: {
        mention?: boolean;
        follow?: boolean;
        like?: boolean;
        comment?: boolean;
    }): Promise<{
        comment: boolean;
        like: boolean;
        follow: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        mention: boolean;
    }>;
}
