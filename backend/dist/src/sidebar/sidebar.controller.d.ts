import { SidebarService } from './sidebar.service';
export declare class SidebarController {
    private readonly sidebarService;
    constructor(sidebarService: SidebarService);
    getGlobalSidebarData(): Promise<{
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
    getExplorePosts(user: any, limit?: string): Promise<{
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
