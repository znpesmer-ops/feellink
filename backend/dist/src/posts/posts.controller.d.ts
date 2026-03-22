/// <reference types="multer" />
import { Response } from 'express';
import { PostsService } from './posts.service';
import { MediaService } from '../media/media.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostIdDto } from './dto/post-id.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
export declare class PostsController {
    private postsService;
    private mediaService;
    constructor(postsService: PostsService, mediaService: MediaService);
    createPost(user: any, files: Express.Multer.File[], body: {
        caption?: string;
        title?: string;
        location?: string;
        type?: string;
        colorPalette?: string | string[];
    }): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        _count: {
            comments: number;
            likes: number;
        };
        media: {
            id: string;
            createdAt: Date;
            type: string;
            postId: string;
            order: number;
            url: string;
            thumbnailUrl: string;
        }[];
    } & {
        id: string;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
    }>;
    createPostWithUrls(user: any, dto: CreatePostDto): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
        _count: {
            comments: number;
            likes: number;
        };
        media: {
            id: string;
            createdAt: Date;
            type: string;
            postId: string;
            order: number;
            url: string;
            thumbnailUrl: string;
        }[];
    } & {
        id: string;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
    }>;
    getQrLabel(id: string, res: Response): Promise<Response<any, Record<string, any>>>;
    generateArtworkQrPdf(postId: string, res: Response): Promise<void>;
    getPost(params: PostIdDto, user: any): Promise<{
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
                id: string;
                createdAt: Date;
                name: string;
                postCount: number;
            };
        } & {
            id: string;
            postId: string;
            hashtagId: string;
        })[];
        isDeleted: boolean;
        deletedAt: Date;
        code: string;
        colors: string[];
        colorPalette: string[];
    }>;
    updatePost(params: PostIdDto, user: any, body: {
        caption?: string;
        title?: string;
    }): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        _count: {
            comments: number;
            likes: number;
        };
        media: {
            id: string;
            createdAt: Date;
            type: string;
            postId: string;
            order: number;
            url: string;
            thumbnailUrl: string;
        }[];
    } & {
        id: string;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
    }>;
    deletePost(params: PostIdDto, user: any): Promise<{
        success: boolean;
        message: string;
    }>;
    likePost(params: PostIdDto, user: any): Promise<{
        success: boolean;
        liked: boolean;
        likeCount: number;
    }>;
    unlikePost(params: PostIdDto, user: any): Promise<{
        success: boolean;
        liked: boolean;
        likeCount: number;
    }>;
    createComment(params: PostIdDto, user: any, dto: CreateCommentDto): Promise<{
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
    getComments(params: PostIdDto, parentId?: string): Promise<({
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            isVerified: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        postId: string;
        content: string;
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
    getUserPosts(userId: string, user: any): Promise<{
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
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
    }[]>;
    getUserComments(userId: string): Promise<({
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
        post: {
            id: string;
            media: {
                type: string;
                url: string;
            }[];
            caption: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        postId: string;
        content: string;
        parentId: string;
        isPinned: boolean;
    })[]>;
    savePost(params: PostIdDto, user: any): Promise<{
        success: boolean;
        message: string;
        savedPost?: undefined;
    } | {
        success: boolean;
        message: string;
        savedPost: {
            id: string;
            createdAt: Date;
            userId: string;
            postId: string;
        };
    }>;
    unsavePost(params: PostIdDto, user: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getSavedPosts(user: any): Promise<{
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
            id: string;
            createdAt: Date;
            type: string;
            postId: string;
            order: number;
            url: string;
            thumbnailUrl: string;
        }[];
        id: string;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        type: string;
        caption: string;
        title: string;
        location: string;
        code: string;
        colors: string[];
        colorPalette: string[];
    }[]>;
    saveArtwork(params: PostIdDto, user: any): Promise<{
        success: boolean;
        message: string;
        saved?: undefined;
    } | {
        success: boolean;
        message: string;
        saved: boolean;
    }>;
    unsaveArtwork(params: PostIdDto, user: any): Promise<{
        success: boolean;
        message: string;
        saved: boolean;
    }>;
    updateComment(postId: string, commentId: string, dto: CreateCommentDto, user: any): Promise<{
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
    deleteComment(postId: string, commentId: string, user: any): Promise<{
        success: boolean;
        message: string;
    }>;
    toggleCommentLike(commentId: string, user: any): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    toggleCommentReaction(commentId: string, user: any, dto: {
        emoji: string;
    }): Promise<{
        reacted: boolean;
    }>;
    getCommentReactions(commentId: string): Promise<{
        emoji: string;
        count: number;
    }[]>;
    getUserCommentReactions(commentId: string, user: any): Promise<string[]>;
    toggleCommentPin(commentId: string, user: any, body: {
        pinned: boolean;
    }): Promise<{
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
    getColorMatches(userId: string): Promise<any[]>;
    getUserColorPalette(userId: string): Promise<{
        palette: string[];
    }>;
    generateArtworkTicket(artworkId: string, userId: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
