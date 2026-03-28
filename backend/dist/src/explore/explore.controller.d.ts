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
        id: string;
        createdAt: Date;
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
