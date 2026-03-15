import { BlocksService } from './blocks.service';
export declare class BlocksController {
    private blocksService;
    constructor(blocksService: BlocksService);
    blockUser(blockedId: string, user: any): Promise<{
        createdAt: Date;
        id: string;
        blockerId: string;
        blockedId: string;
    }>;
    unblockUser(blockedId: string, user: any): Promise<{
        success: boolean;
    }>;
    checkBlockStatus(blockedId: string, user: any): Promise<{
        isBlocked: boolean;
        block: {
            createdAt: Date;
            id: string;
            blockerId: string;
            blockedId: string;
        };
    }>;
    getBlockedUsers(user: any): Promise<({
        blocked: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        blockerId: string;
        blockedId: string;
    })[]>;
}
