import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
export declare class FollowService {
    private prisma;
    private notificationsService;
    private notificationsGateway;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, notificationsGateway: NotificationsGateway);
    private incrementFollowCounts;
    private decrementFollowCounts;
    followUser(followerId: string, followingId: string): Promise<{
        status: string;
    }>;
    unfollowUser(followerId: string, followingId: string): Promise<{
        status: string;
    }>;
    acceptFollowRequest(requestedId: string, requesterId: string): Promise<{
        status: string;
    }>;
    rejectFollowRequest(requestedId: string, requesterId: string): Promise<{
        status: string;
    }>;
    cancelFollowRequest(requesterId: string, requestedId: string): Promise<{
        status: string;
    }>;
    blockUser(blockerId: string, blockedId: string): Promise<{
        status: string;
    }>;
    unblockUser(blockerId: string, blockedId: string): Promise<{
        status: string;
    }>;
    getFollowRequests(userId: string): Promise<({
        requester: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        requesterId: string;
        requestedId: string;
    })[]>;
    getFollowers(userId: string, currentUserId?: string): Promise<{
        username: string;
        fullName: string;
        id: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    getFollowing(userId: string, currentUserId?: string): Promise<{
        username: string;
        fullName: string;
        id: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    removeFollower(currentUserId: string, targetUserId: string): Promise<{
        status: string;
    }>;
}
