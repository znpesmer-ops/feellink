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
        expiresAt: Date;
        createdAt: Date;
        id: string;
        userId: string;
        mediaUrl: string;
        mediaType: string;
    }>;
    getStories(user: any): Promise<unknown[]>;
    viewStory(id: string, user: any): Promise<{
        id: string;
        userId: string;
        storyId: string;
        viewedAt: Date;
    }>;
    deleteStory(id: string, user: any): Promise<{
        status: string;
    }>;
}
