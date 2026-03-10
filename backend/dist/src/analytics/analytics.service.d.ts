import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getVisitStats(userId: string, dateRange?: 'today' | '7d' | '30d'): Promise<any[]>;
    getTopWords(userId: string): Promise<{
        word: string;
        count: number;
    }[]>;
    getTopVisitors(userId: string): Promise<{
        username: string;
        avatar: string;
        fullName: string;
        activityCount: number;
    }[]>;
    getEventStats(userId: string): Promise<{
        id: string;
        title: string;
        ticketCount: number;
        totalCapacity: number;
        commentCount: number;
        recentTickets: {
            username: string;
            fullName: string;
            avatar: string;
            createdAt: Date;
        }[];
    }[]>;
    getColorPalette(userId: string): Promise<{
        hex: string;
        frequency: number;
    }[]>;
    getTopColorMatches(userId: string): Promise<{
        userId: string;
        username: string;
        avatar: string;
        similarity: number;
        commonColors: string[];
    }[]>;
    private calculateColorSimilarity;
    getTopPerformingContent(userId: string, dateRange?: 'today' | '7d' | '30d'): Promise<{
        mostViewed: {
            id: string;
            type: "post";
            title: string;
            thumbnail: string;
            likes: number;
            comments: number;
            saves: number;
            createdAt: Date;
        } | {
            id: string;
            type: "article";
            title: string;
            thumbnail: string;
            likes: number;
            comments: number;
            saves: number;
            createdAt: Date;
        };
        mostCommented: {
            id: string;
            type: "post";
            title: string;
            thumbnail: string;
            likes: number;
            comments: number;
            saves: number;
            createdAt: Date;
        } | {
            id: string;
            type: "article";
            title: string;
            thumbnail: string;
            likes: number;
            comments: number;
            saves: number;
            createdAt: Date;
        };
        mostSaved: {
            id: string;
            type: "post";
            title: string;
            thumbnail: string;
            likes: number;
            comments: number;
            saves: number;
            createdAt: Date;
        } | {
            id: string;
            type: "article";
            title: string;
            thumbnail: string;
            likes: number;
            comments: number;
            saves: number;
            createdAt: Date;
        };
    }>;
    getSaveAnalytics(userId: string, dateRange?: 'today' | '7d' | '30d'): Promise<{
        totalSaves: number;
        saveRate: number;
        mostSaved: {
            id: string;
            type: "post";
            title: string;
            thumbnail: string;
            saves: number;
        };
    }>;
    getSourceDistribution(userId: string, dateRange?: 'today' | '7d' | '30d'): Promise<{
        explore: number;
        profile: number;
        home: number;
    }>;
    getPeriodComparison(userId: string, dateRange?: 'today' | '7d' | '30d'): Promise<{
        likes: {
            current: number;
            previous: number;
            change: number;
        };
        comments: {
            current: number;
            previous: number;
            change: number;
        };
        saves: {
            current: number;
            previous: number;
            change: number;
        };
    }>;
    getLowEngagementWarning(userId: string): Promise<{
        count: number;
        hasWarning: boolean;
    }>;
}
