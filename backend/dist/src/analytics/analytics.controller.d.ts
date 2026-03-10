import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getVisits(user: any, range?: 'today' | '7d' | '30d'): Promise<any[]>;
    getWords(user: any): Promise<{
        word: string;
        count: number;
    }[]>;
    getTopUsers(user: any): Promise<{
        username: string;
        avatar: string;
        fullName: string;
        activityCount: number;
    }[]>;
    getEventStats(user: any): Promise<{
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
    getColorPalette(user: any): Promise<{
        hex: string;
        frequency: number;
    }[]>;
    getTopColorMatches(user: any): Promise<{
        userId: string;
        username: string;
        avatar: string;
        similarity: number;
        commonColors: string[];
    }[]>;
    getTopPerforming(user: any, range?: 'today' | '7d' | '30d'): Promise<{
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
    getSaveAnalytics(user: any, range?: 'today' | '7d' | '30d'): Promise<{
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
    getSourceDistribution(user: any, range?: 'today' | '7d' | '30d'): Promise<{
        explore: number;
        profile: number;
        home: number;
    }>;
    getComparison(user: any, range?: 'today' | '7d' | '30d'): Promise<{
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
    getLowEngagement(user: any): Promise<{
        count: number;
        hasWarning: boolean;
    }>;
}
