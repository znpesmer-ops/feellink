import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class ExploreService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    private transformMediaUrl;
    private transformAvatarUrl;
    getExplorePosts(userId: string | null, limit?: number, cursor?: string): Promise<{
        posts: any[];
        nextCursor: string;
        hasMore: boolean;
    }>;
    searchHashtags(query: string, limit?: number): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        postCount: number;
    }[]>;
    getHashtagPosts(hashtagName: string, userId: string, limit?: number, cursor?: string): Promise<{
        posts: {
            isLiked: boolean;
            media: any[];
            user: {
                avatar: string;
                id: string;
                username: string;
                fullName: string;
                isVerified: boolean;
            };
            _count: {
                comments: number;
                likes: number;
            };
            id: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string;
            location: string;
            type: string;
            caption: string;
            code: string;
            colors: string[];
            colorPalette: string[];
        }[];
        nextCursor: string;
        hasMore: boolean;
    }>;
}
