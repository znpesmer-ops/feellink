import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
export declare class StoriesService {
    private prisma;
    private mediaService;
    constructor(prisma: PrismaService, mediaService: MediaService);
    createStory(userId: string, mediaUrl: string, mediaType: string): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
        mediaUrl: string;
        mediaType: string;
    }>;
    getStories(userId: string): Promise<unknown[]>;
    viewStory(storyId: string, userId: string): Promise<{
        id: string;
        userId: string;
        storyId: string;
        viewedAt: Date;
    }>;
    deleteStory(storyId: string, userId: string): Promise<{
        status: string;
    }>;
}
