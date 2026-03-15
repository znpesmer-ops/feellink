import { FollowService } from './follow.service';
export declare class FollowController {
    private followService;
    constructor(followService: FollowService);
    acceptRequest(userId: string, user: any): Promise<{
        status: string;
    }>;
    rejectRequest(userId: string, user: any): Promise<{
        status: string;
    }>;
    cancelRequest(userId: string, user: any): Promise<{
        status: string;
    }>;
    blockUser(userId: string, user: any): Promise<{
        status: string;
    }>;
    unblockUser(userId: string, user: any): Promise<{
        status: string;
    }>;
    getFollowRequests(user: any): Promise<({
        requester: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        createdAt: Date;
        id: string;
        requesterId: string;
        requestedId: string;
    })[]>;
    getMyFollowers(user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    getMyFollowing(user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    getFollowers(userId: string, user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    getFollowing(userId: string, user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    removeFollower(userId: string, user: any): Promise<{
        status: string;
    }>;
    followUser(userId: string, user: any): Promise<{
        status: string;
    }>;
    unfollowUser(userId: string, user: any): Promise<{
        status: string;
    }>;
}
