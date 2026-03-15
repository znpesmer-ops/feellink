import { ExploreService } from './explore.service';
export declare class ExploreController {
    private exploreService;
    constructor(exploreService: ExploreService);
    getExplore(user: any, limit?: string, cursor?: string): Promise<{
        posts: any[];
        nextCursor: string;
        hasMore: boolean;
    }>;
    searchHashtags(query: string, limit?: string): Promise<{
        createdAt: Date;
        id: string;
        name: string;
        postCount: number;
    }[]>;
    getHashtagPosts(user: any, hashtag: string, limit?: string, cursor?: string): Promise<{
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
            createdAt: Date;
            id: string;
            code: string;
            isDeleted: boolean;
            deletedAt: Date;
            updatedAt: Date;
            userId: string;
            type: string;
            title: string;
            location: string;
            caption: string;
            colors: string[];
            colorPalette: string[];
        }[];
        nextCursor: string;
        hasMore: boolean;
    }>;
}
