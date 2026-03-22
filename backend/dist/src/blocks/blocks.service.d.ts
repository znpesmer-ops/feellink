import { PrismaService } from '../prisma/prisma.service';
export declare class BlocksService {
    private prisma;
    constructor(prisma: PrismaService);
    blockUser(blockerId: string, blockedId: string): Promise<{
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    }>;
    unblockUser(blockerId: string, blockedId: string): Promise<{
        success: boolean;
    }>;
    isBlocked(userId1: string, userId2: string): Promise<boolean>;
    checkBlockStatus(blockerId: string, blockedId: string): Promise<{
        isBlocked: boolean;
        block: {
            id: string;
            createdAt: Date;
            blockerId: string;
            blockedId: string;
        };
    }>;
    getBlockedUsers(userId: string): Promise<({
        blocked: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        blockerId: string;
        blockedId: string;
    })[]>;
}
