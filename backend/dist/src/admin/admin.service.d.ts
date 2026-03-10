import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ColorAnalysisService } from '../posts/color-analysis.service';
import { MailService } from '../mail/mail.service';
export declare class AdminService {
    private prisma;
    private colorAnalysisService;
    private mailService;
    constructor(prisma: PrismaService, colorAnalysisService: ColorAnalysisService, mailService: MailService);
    getSummary(): Promise<{
        totalUsers: number;
        newUsers24h: number;
        onlineUsers: number;
        postsToday: number;
        commentsToday: number;
        ticketsToday: number;
        revenue: number;
        totalPosts: number;
        totalComments: number;
        totalEvents: number;
        totalTickets: number;
        traffic30d: {
            date: Date;
            count: number;
        }[];
    }>;
    getUsers(page?: number, limit?: number, search?: string, role?: string, city?: string, gender?: string, ageMin?: number, ageMax?: number): Promise<{
        users: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isPrivate: boolean;
            isVerified: boolean;
            isAdmin: boolean;
            followerCount: number;
            followingCount: number;
            isOnline: boolean;
            dateOfBirth: Date;
            country: string;
            city: string;
            gender: string;
            profileCompleted: boolean;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateUser(userId: string, data: {
        roles?: string[];
        isVerified?: boolean;
        isAdmin?: boolean;
    }, actorId: string): Promise<{
        id: string;
        username: string;
        email: string;
        fullName: string;
        roles: import(".prisma/client").$Enums.UserRole[];
    }>;
    getRoleHistory(userId: string): Promise<{
        id: string;
        oldRoles: import(".prisma/client").$Enums.UserRole[];
        newRoles: import(".prisma/client").$Enums.UserRole[];
        changedBy: string;
        createdAt: Date;
    }[]>;
    getRoleChangeRemainingDays(userId: string): Promise<number | null>;
    deleteUser(userId: string, actorId: string): Promise<{
        success: boolean;
        message: string;
        deletedUserId: string;
    }>;
    getPosts(page?: number, limit?: number): Promise<{
        posts: ({
            user: {
                id: string;
                username: string;
                avatar: string;
            };
            _count: {
                comments: number;
                likes: number;
            };
            media: {
                id: string;
                type: string;
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
            title: string;
            location: string;
            caption: string;
            code: string;
            colors: string[];
            colorPalette: string[];
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getArtworks(page?: number, limit?: number, search?: string, userId?: string): Promise<{
        artworks: ({
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
                type: string;
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
            title: string;
            location: string;
            caption: string;
            code: string;
            colors: string[];
            colorPalette: string[];
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    deleteArtwork(artworkId: string, actorId: string): Promise<{
        message: string;
        deletedArtworkId: string;
    }>;
    deletePost(postId: string, actorId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getComments(page?: number, limit?: number): Promise<{
        comments: ({
            user: {
                id: string;
                username: string;
                avatar: string;
            };
            post: {
                id: string;
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
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    deleteComment(commentId: string, actorId: string): Promise<{
        success: boolean;
    }>;
    getArticles(page?: number, limit?: number): Promise<{
        articles: ({
            author: {
                id: string;
                username: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            coverImage: string;
            content: string;
            authorId: string;
            excerpt: string;
            isPublished: boolean;
            scheduledAt: Date;
            views: number;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    deleteArticle(articleId: string, actorId: string): Promise<{
        success: boolean;
    }>;
    getEvents(page?: number, limit?: number): Promise<{
        events: ({
            _count: {
                participants: number;
                tickets: number;
            };
            owner: {
                id: string;
                username: string;
                avatar: string;
            };
        } & {
            id: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            title: string;
            coverImage: string;
            date: Date;
            participantCount: number;
            ticketUrl: string;
            price: number;
            isFree: boolean;
            location: string;
            ownerId: string;
            reminderMailSent: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getTickets(page?: number, limit?: number): Promise<{
        tickets: ({
            user: {
                id: string;
                username: string;
                avatar: string;
            };
            ticket: {
                event: {
                    id: string;
                    title: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                type: string;
                price: number;
                eventId: string;
                capacity: number;
                sold: number;
                qrCodeUrl: string;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            code: string;
            ticketId: string;
            qrUrl: string;
            used: boolean;
            usedAt: Date;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getFeatureFlags(): Promise<{
        updatedAt: Date;
        note: string;
        key: string;
        enabled: boolean;
        updatedBy: string;
    }[]>;
    updateFeatureFlag(key: string, enabled: boolean, updatedBy: string): Promise<{
        updatedAt: Date;
        note: string;
        key: string;
        enabled: boolean;
        updatedBy: string;
    }>;
    getAuditLogs(page?: number, limit?: number): Promise<{
        logs: ({
            actor: {
                id: string;
                username: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            target: string;
            action: string;
            meta: Prisma.JsonValue;
            ip: string;
            userAgent: string;
            actorId: string;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    createAuditLog(data: {
        actorId: string;
        action: string;
        target?: string;
        meta?: any;
        ip?: string;
        userAgent?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        target: string;
        action: string;
        meta: Prisma.JsonValue;
        ip: string;
        userAgent: string;
        actorId: string;
    }>;
    getModerationItems(): Promise<{
        items: any[];
        total: number;
    }>;
    getAnalytics(): Promise<{
        totalUsers: number;
        activeUsers: number;
        totalPosts: number;
        totalComments: number;
        totalTickets: number;
        totalRevenue: number;
        topCountries: {
            country: string;
            count: number;
        }[];
        engagementTrend: any[];
        growthTrend: any[];
    }>;
    recalculateColors(): Promise<{
        message: string;
        totalPosts: number;
        processed: number;
        failed: number;
        results: any[];
        timestamp: string;
    }>;
    updateSetting(key: string, value: string, updatedBy?: string): Promise<{
        success: boolean;
        key: any;
        value: any;
        updatedAt: any;
    }>;
    getSettings(): Promise<{
        siteName: any;
        siteDescription: any;
        adminEmail: any;
    }>;
    suspendUser(userId: string, actorId: string, data: {
        until?: Date | null;
        reason: string;
        note?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    unsuspendUser(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getRoleChangeRequests(status?: string, page?: number, limit?: number): Promise<{
        requests: ({
            user: {
                id: string;
                username: string;
                email: string;
                fullName: string;
            };
        } & {
            message: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            requestedRole: import(".prisma/client").$Enums.UserRole;
            status: string;
            reviewedBy: string;
            reviewedAt: Date;
            reviewNote: string;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    approveRoleChangeRequest(requestId: string, adminId: string, reviewNote?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    rejectRoleChangeRequest(requestId: string, adminId: string, reviewNote?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
