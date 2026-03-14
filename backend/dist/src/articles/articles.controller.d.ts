import { ArticlesService } from './articles.service';
export declare class ArticlesController {
    private articlesService;
    constructor(articlesService: ArticlesService);
    create(user: any, body: {
        title: string;
        content: string;
        coverImage?: string;
        excerpt?: string;
        publish?: boolean;
        scheduledAt?: string;
    }): Promise<{
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    }>;
    getDrafts(user: any): Promise<({
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    })[]>;
    getScheduled(user: any): Promise<({
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    })[]>;
    getPublished(user: any): Promise<({
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    })[]>;
    publish(id: string, user: any): Promise<{
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    }>;
    getAllPublic(): Promise<({
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    })[]>;
    getAllPublishedArticles(): Promise<({
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    })[]>;
    getMyArticles(user: any): Promise<({
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    })[]>;
    getUserArticles(userId: string): Promise<{
        views: number;
        _count: {
            likes: number;
            comments: number;
        };
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        authorId: string;
    }[]>;
    getArticle(id: string): Promise<{
        views: number;
        _count: {
            likes: number;
            comments: number;
        };
        comments: {
            id: any;
            content: any;
            createdAt: any;
            updatedAt: any;
            author: {
                id: any;
                username: any;
                avatar: any;
                fullName: any;
            };
            replies: any;
        }[];
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        authorId: string;
    }>;
    update(id: string, user: any, body: {
        title?: string;
        content?: string;
        coverImage?: string;
        excerpt?: string;
        publish?: boolean;
        scheduledAt?: string;
    }): Promise<{
        author: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
        authorId: string;
    }>;
    delete(id: string, user: any): Promise<{
        success: boolean;
    }>;
    incrementView(id: string): Promise<{
        success: boolean;
    }>;
    createComment(articleId: string, user: any, body: {
        content: string;
    }): Promise<{
        id: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        author: {
            id: string;
            username: string;
            avatar: string;
            fullName: string;
        };
    }>;
    deleteComment(commentId: string, user: any): Promise<{
        success: boolean;
    }>;
    replyComment(commentId: string, user: any, body: {
        content: string;
    }): Promise<{
        id: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        parentId: string;
        author: {
            id: string;
            username: string;
            avatar: string;
            fullName: string;
        };
    }>;
    toggleCommentLike(commentId: string, user: any): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    getTopLikedAuthors(limit?: string): Promise<{
        id: string;
        username: string;
        name: string;
        avatar: string;
    }[]>;
}
