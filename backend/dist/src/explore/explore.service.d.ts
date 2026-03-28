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
        id: string;
        createdAt: Date;
        name: string;
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
            userId: string;
            code: string;
            createdAt: Date;
            type: string;
            updatedAt: Date;
            isDeleted: boolean;
            deletedAt: Date;
            caption: string;
            title: string;
            location: string;
            colors: string[];
            colorPalette: string[];
            artworkCreatedDate: Date;
        }[];
        nextCursor: string;
        hasMore: boolean;
    }>;
}
