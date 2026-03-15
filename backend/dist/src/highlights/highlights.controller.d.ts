import { HighlightsService } from './highlights.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class HighlightsController {
    private highlightsService;
    private prisma;
    constructor(highlightsService: HighlightsService, prisma: PrismaService);
    getMonthlyHighlights(): Promise<any>;
    getHighlightsByUserId(userId: string): Promise<({
        items: ({
            post: {
                id: string;
                title: string;
                media: {
                    type: string;
                    url: string;
                }[];
                caption: string;
            };
        } & {
            id: string;
            postId: string;
            sortOrder: number;
            highlightId: string;
        })[];
        coverPost: {
            id: string;
            media: {
                type: string;
                url: string;
            }[];
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        userId: string;
        title: string;
        coverPostId: string;
    })[]>;
    getHighlightsByUsername(username: string): Promise<({
        items: ({
            post: {
                id: string;
                title: string;
                media: {
                    type: string;
                    url: string;
                }[];
                caption: string;
            };
        } & {
            id: string;
            postId: string;
            sortOrder: number;
            highlightId: string;
        })[];
        coverPost: {
            id: string;
            media: {
                type: string;
                url: string;
            }[];
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        userId: string;
        title: string;
        coverPostId: string;
    })[]>;
    createHighlight(body: {
        title: string;
        coverPostId?: string;
    }, req: any): Promise<{
        items: {
            id: string;
            postId: string;
            sortOrder: number;
            highlightId: string;
        }[];
        coverPost: {
            id: string;
            media: {
                type: string;
                url: string;
            }[];
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        userId: string;
        title: string;
        coverPostId: string;
    }>;
    deleteHighlight(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    addPostsToHighlight(id: string, body: {
        postIds: string[];
    }, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    removePostsFromHighlight(id: string, body: {
        postIds: string[];
    }, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    renameHighlight(id: string, body: {
        title: string;
    }, req: any): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        userId: string;
        title: string;
        coverPostId: string;
    }>;
}
