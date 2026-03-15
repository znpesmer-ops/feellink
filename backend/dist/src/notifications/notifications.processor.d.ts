import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../prisma/prisma.service';
export declare class NotificationsProcessor extends WorkerHost {
    private notificationsService;
    private notificationsGateway;
    private prisma;
    constructor(notificationsService: NotificationsService, notificationsGateway: NotificationsGateway, prisma: PrismaService);
    process(job: Job<any>): Promise<{
        fromUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
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
    }>;
}
