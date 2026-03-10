import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class FeedService {
    private prisma;
    private configService;
    private redis;
    constructor(prisma: PrismaService, configService: ConfigService);
    private transformMediaUrl;
    private transformAvatarUrl;
    getFeed(userId: string, limit?: number, cursor?: string): Promise<{
        posts: any[];
        nextCursor: any;
        hasMore: boolean;
    }>;
    addToFollowersFeeds(userId: string, postId: string): Promise<void>;
    removeFromFeeds(postId: string): Promise<void>;
    private rebuildFeed;
}
