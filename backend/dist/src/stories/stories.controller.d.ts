import { StoriesService } from './stories.service';
export declare class StoriesController {
    private storiesService;
    constructor(storiesService: StoriesService);
    createStory(user: any, data: {
        mediaUrl: string;
        mediaType: string;
    }): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        id: string;
        userId: string;
        createdAt: Date;
        mediaUrl: string;
        mediaType: string;
        expiresAt: Date;
    }>;
    getStories(user: any): Promise<unknown[]>;
    viewStory(id: string, user: any): Promise<{
        id: string;
        userId: string;
        viewedAt: Date;
        storyId: string;
    }>;
    deleteStory(id: string, user: any): Promise<{
        status: string;
    }>;
}
