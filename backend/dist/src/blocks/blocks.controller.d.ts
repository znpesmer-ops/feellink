import { BlocksService } from './blocks.service';
export declare class BlocksController {
    private blocksService;
    constructor(blocksService: BlocksService);
    blockUser(blockedId: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    }>;
    unblockUser(blockedId: string, user: any): Promise<{
        success: boolean;
    }>;
    checkBlockStatus(blockedId: string, user: any): Promise<{
        isBlocked: boolean;
        block: {
            id: string;
            createdAt: Date;
            blockerId: string;
            blockedId: string;
        };
    }>;
    getBlockedUsers(user: any): Promise<({
        blocked: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    })[]>;
}
