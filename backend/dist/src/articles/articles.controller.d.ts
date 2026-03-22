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
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    }>;
    getDrafts(user: any): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    getScheduled(user: any): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    getPublished(user: any): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    publish(id: string, user: any): Promise<{
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    }>;
    getAllPublic(): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    getAllPublishedArticles(): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    getMyArticles(user: any): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    getUserArticles(userId: string): Promise<{
        views: number;
        _count: {
            likes: number;
            comments: number;
        };
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
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
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
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
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        title: string;
        coverImage: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        content: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    }>;
    delete(id: string, user: any): Promise<{
        success: boolean;
        message: string;
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
