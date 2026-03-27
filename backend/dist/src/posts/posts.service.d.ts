/// <reference types="node" />
/// <reference types="node" />
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AnalyticsService } from '../analytics/analytics.service';
import { FeedService } from '../feed/feed.service';
import { SearchService } from '../search/search.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsGateway } from './posts.gateway';
import { CommentsGateway } from './comments.gateway';
import { ConfigService } from '@nestjs/config';
import { LimitsService } from '../limits/limits.service';
import { ColorAnalysisService } from './color-analysis.service';
export declare class PostsService {
    private prisma;
    private notificationsService;
    private notificationsGateway;
    private analyticsService;
    private feedService;
    private searchService;
    private postsGateway;
    private commentsGateway;
    private configService;
    private readonly limitsService;
    private colorAnalysisService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService, notificationsGateway: NotificationsGateway, analyticsService: AnalyticsService, feedService: FeedService, searchService: SearchService, postsGateway: PostsGateway, commentsGateway: CommentsGateway, configService: ConfigService, limitsService: LimitsService, colorAnalysisService: ColorAnalysisService);
    private transformMediaUrl;
    private transformAvatarUrl;
    createPost(userId: string, dto: CreatePostDto): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        media: {
            type: string;
            order: number;
            url: string;
            id: string;
            createdAt: Date;
            thumbnailUrl: string;
            postId: string;
        }[];
        _count: {
            comments: number;
            likes: number;
        };
    } & {
        type: string;
        id: string;
        userId: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getPost(postId: string, currentUserId?: string): Promise<{
        id: string;
        userId: string;
        caption: string;
        title: string;
        location: string;
        type: string;
        createdAt: string;
        updatedAt: string;
        media: any[];
        user: {
            avatar: string;
            id: string;
            username: string;
            fullName: string;
            isVerified: boolean;
        };
        comments: {
            id: any;
            postId: any;
            parentId: any;
            content: any;
            createdAt: any;
            updatedAt: any;
            userId: any;
            isPinned: any;
            isLikedByCurrentUser: boolean;
            likesCount: any;
            user: {
                id: any;
                username: any;
                fullName: any;
                avatar: any;
                isVerified: any;
            };
            replies: any;
        }[];
        isLiked: boolean;
        isSaved: boolean;
        _count: {
            likes: number;
            comments: number;
        };
        hashtags: ({
            hashtag: {
                name: string;
                id: string;
                createdAt: Date;
                postCount: number;
            };
        } & {
            id: string;
            postId: string;
            hashtagId: string;
        })[];
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
    }>;
    updatePost(postId: string, userId: string, data: {
        caption?: string;
        title?: string;
    }): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        media: {
            type: string;
            order: number;
            url: string;
            id: string;
            createdAt: Date;
            thumbnailUrl: string;
            postId: string;
        }[];
        _count: {
            comments: number;
            likes: number;
        };
    } & {
        type: string;
        id: string;
        userId: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deletePost(postId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    likePost(postId: string, userId: string): Promise<{
        success: boolean;
        liked: boolean;
        likeCount: number;
    }>;
    unlikePost(postId: string, userId: string): Promise<{
        success: boolean;
        liked: boolean;
        likeCount: number;
    }>;
    createComment(postId: string, userId: string, content: string, parentId?: string): Promise<{
        id: string;
        postId: string;
        userId: string;
        content: string;
        createdAt: string;
        updatedAt: string;
        parentId: string;
        isPinned: boolean;
        isLikedByCurrentUser: boolean;
        likesCount: number;
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        replies: any[];
    }>;
    getUserComments(userId: string): Promise<({
        post: {
            id: string;
            caption: string;
            media: {
                type: string;
                url: string;
            }[];
        };
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        _count: {
            likes: number;
            replies: number;
        };
    } & {
        content: string;
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        postId: string;
        parentId: string;
        isPinned: boolean;
    })[]>;
    getComments(postId: string, parentId?: string): Promise<({
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        content: string;
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        postId: string;
        parentId: string;
        isPinned: boolean;
    })[] | {
        id: string;
        postId: string;
        parentId: string;
        content: string;
        createdAt: Date;
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        replies: {
            id: string;
            postId: string;
            parentId: string;
            content: string;
            createdAt: Date;
            user: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
                isVerified: boolean;
            };
        }[];
        _count: {
            replies: number;
        };
    }[]>;
    updateComment(commentId: string, userId: string, content: string): Promise<{
        id: string;
        content: string;
        updatedAt: Date;
        createdAt: Date;
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        likesCount: number;
        repliesCount: number;
    }>;
    deleteComment(commentId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    toggleCommentReaction(userId: string, commentId: string, emoji: string): Promise<{
        reacted: boolean;
    }>;
    getCommentReactions(commentId: string): Promise<{
        emoji: string;
        count: number;
    }[]>;
    getUserCommentReactions(commentId: string, userId: string): Promise<string[]>;
    getUserPosts(userId: string, currentUserId?: string, type?: 'post' | 'artwork'): Promise<{
        id: string;
        title: string;
        caption: string;
        type: string;
        media: any[];
        isLiked: boolean;
        _count: {
            likes: number;
            comments: number;
        };
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        userId: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    private extractHashtags;
    savePost(postId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        savedPost?: undefined;
    } | {
        success: boolean;
        message: string;
        savedPost: {
            id: string;
            userId: string;
            createdAt: Date;
            postId: string;
        };
    }>;
    unsavePost(postId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getSavedPosts(userId: string): Promise<{
        isLiked: boolean;
        savedAt: Date;
        _count: {
            likes: number;
            comments: number;
        };
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        media: {
            type: string;
            order: number;
            url: string;
            id: string;
            createdAt: Date;
            thumbnailUrl: string;
            postId: string;
        }[];
        type: string;
        id: string;
        userId: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    saveArtwork(postId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        saved?: undefined;
    } | {
        success: boolean;
        message: string;
        saved: boolean;
    }>;
    unsaveArtwork(postId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        saved: boolean;
    }>;
    getSavedArtworks(userId: string): Promise<{
        isLiked: boolean;
        savedAt: Date;
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        media: {
            type: string;
            order: number;
            url: string;
            id: string;
            createdAt: Date;
            thumbnailUrl: string;
            postId: string;
        }[];
        _count: {
            comments: number;
            likes: number;
        };
        type: string;
        id: string;
        userId: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getSaved(userId: string): Promise<{
        isLiked: boolean;
        savedAt: Date;
        _count: {
            likes: number;
            comments: number;
        };
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        media: {
            type: string;
            order: number;
            url: string;
            id: string;
            createdAt: Date;
            thumbnailUrl: string;
            postId: string;
        }[];
        type: string;
        id: string;
        userId: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    toggleCommentLike(commentId: string, userId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    toggleCommentPin(commentId: string, userId: string, pinned: boolean): Promise<{
        id: string;
        content: string;
        isPinned: boolean;
        createdAt: Date;
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
        };
        likesCount: number;
        repliesCount: number;
    }>;
    getPublicSharePost(postId: string): Promise<{
        id: string;
        userId: string;
        caption: string;
        title: string;
        location: string;
        type: string;
        createdAt: string;
        updatedAt: string;
        media: any[];
        user: {
            avatar: string;
            id: string;
            username: string;
            fullName: string;
            isVerified: boolean;
        };
        comments: {
            id: any;
            postId: any;
            parentId: any;
            content: any;
            createdAt: any;
            updatedAt: any;
            userId: any;
            isPinned: any;
            isLikedByCurrentUser: boolean;
            likesCount: any;
            user: {
                id: any;
                username: any;
                fullName: any;
                avatar: any;
                isVerified: any;
            };
            replies: any;
        }[];
        isLiked: boolean;
        isSaved: boolean;
        _count: {
            likes: number;
            comments: number;
        };
        hashtags: ({
            hashtag: {
                name: string;
                id: string;
                createdAt: Date;
                postCount: number;
            };
        } & {
            id: string;
            postId: string;
            hashtagId: string;
        })[];
        code: string;
        colors: string[];
        colorPalette: string[];
        isDeleted: boolean;
        deletedAt: Date;
    }>;
    getPublicArtworkTicketByCode(rawCode: string): Promise<{
        ticketCode: string;
        artworkTitle: string;
        artistName: string;
        artistUsername: string;
        imageUrl: string;
        isValid: true;
    }>;
    resolveArtworkQrByCode(rawCode: string): Promise<{
        postId: string;
    }>;
    generateArtworkQrPdf(postId: string, res: Response): Promise<void>;
    getColorMatches(userId: string): Promise<any[]>;
    getUserColorPalette(userId: string): Promise<string[]>;
    generateQrLabelPdf(postId: string): Promise<Buffer>;
    generateArtworkTicket(postId: string, userId: string): Promise<Buffer>;
    private streamToBuffer;
}
