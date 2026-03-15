import { PrismaService } from '../prisma/prisma.service';
import { PostsGateway } from '../posts/posts.gateway';
import { ArticlesGateway } from './articles.gateway';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ArticlesService {
    private prisma;
    private postsGateway;
    private articlesGateway;
    private notificationsService;
    constructor(prisma: PrismaService, postsGateway: PostsGateway, articlesGateway: ArticlesGateway, notificationsService: NotificationsService);
    create(userId: string, title: string, content: string, coverImage?: string, excerpt?: string, publish?: boolean, scheduledAt?: Date): Promise<{
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    }>;
    findDrafts(userId: string): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    findScheduled(userId: string): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    findPublished(userId: string): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    publish(id: string, userId: string): Promise<{
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    }>;
    findAllPublic(): Promise<({
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    })[]>;
    findByUserId(userId: string): Promise<{
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
    }[]>;
    findMyArticles(userId: string): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    }[]>;
    findOne(id: string): Promise<{
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
    }>;
    update(id: string, userId: string, data: {
        title?: string;
        content?: string;
        coverImage?: string;
        excerpt?: string;
        isPublished?: boolean;
        scheduledAt?: Date;
    }): Promise<{
        author: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        title: string;
        coverImage: string;
        content: string;
        authorId: string;
        excerpt: string;
        isPublished: boolean;
        scheduledAt: Date;
        views: number;
    }>;
    delete(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    incrementView(id: string): Promise<void>;
    createComment(articleId: string, userId: string, content: string): Promise<{
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
    deleteComment(commentId: string, userId: string): Promise<{
        success: boolean;
    }>;
    createReply(commentId: string, userId: string, content: string): Promise<{
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
    toggleCommentLike(commentId: string, userId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    getTopLikedAuthors(limit?: number): Promise<{
        id: string;
        username: string;
        name: string;
        avatar: string;
    }[]>;
}
