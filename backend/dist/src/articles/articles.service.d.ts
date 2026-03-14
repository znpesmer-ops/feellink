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
    findDrafts(userId: string): Promise<({
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
    findScheduled(userId: string): Promise<({
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
    findPublished(userId: string): Promise<({
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
    publish(id: string, userId: string): Promise<{
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
    findAllPublic(): Promise<({
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
    findByUserId(userId: string): Promise<{
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
    findMyArticles(userId: string): Promise<{
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
    update(id: string, userId: string, data: {
        title?: string;
        content?: string;
        coverImage?: string;
        excerpt?: string;
        isPublished?: boolean;
        scheduledAt?: Date;
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
