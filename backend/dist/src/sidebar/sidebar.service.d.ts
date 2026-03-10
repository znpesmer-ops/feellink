import { PrismaService } from '../prisma/prisma.service';
import { SidebarGateway } from './sidebar.gateway';
import { ArticlesService } from '../articles/articles.service';
export declare class SidebarService {
    private prisma;
    private gateway;
    private articlesService;
    constructor(prisma: PrismaService, gateway: SidebarGateway, articlesService: ArticlesService);
    getFeaturedMuseums(): Promise<{
        id: string;
        username: string;
        name: string;
        image: string;
        color: string;
    }[]>;
    getGlobalData(): Promise<{
        museums: {
            id: string;
            username: string;
            name: string;
            image: string;
            color: string;
        }[];
        authors: {
            id: string;
            slug: string;
            name: string;
            avatar: string;
            preview: string;
            bio: string;
            lastPost: {
                title: string;
                preview: string;
                link: string;
            };
        }[];
        topLikedArticles: {
            id: string;
            title: string;
            coverImage: string;
            totalLikes: number;
            author: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        }[];
    }>;
    updateSidebarData(): Promise<{
        museums: {
            id: string;
            username: string;
            name: string;
            image: string;
            color: string;
        }[];
        authors: {
            id: string;
            slug: string;
            name: string;
            avatar: string;
            preview: string;
            bio: string;
            lastPost: {
                title: string;
                preview: string;
                link: string;
            };
        }[];
        topLikedArticles: {
            id: string;
            title: string;
            coverImage: string;
            totalLikes: number;
            author: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        }[];
    }>;
    getExplorePosts(userId: string, limit?: number): Promise<{
        id: string;
        slug: string;
        name: string;
        avatar: string;
        preview: string;
        bio: string;
        lastPost: {
            title: string;
            preview: string;
            link: string;
        };
    }[]>;
    getFeaturedHighlights(): Promise<{
        museum: any;
        artwork: any;
        comment: any;
        collector: any;
    }>;
}
