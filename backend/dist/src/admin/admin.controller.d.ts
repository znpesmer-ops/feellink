import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import { ReportsService } from '../reports/reports.service';
export declare class AdminController {
    private prisma;
    private adminService;
    private reportsService;
    constructor(prisma: PrismaService, adminService: AdminService, reportsService: ReportsService);
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
    getUsers(page?: string, limit?: string, search?: string, role?: string, city?: string, gender?: string, ageMin?: string, ageMax?: string): Promise<{
        users: {
            id: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
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
            termsAcceptedAt: Date;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            suspendedAt: Date;
            suspendedUntil: Date;
            suspensionReason: string;
            deletionRequestedAt: Date;
            scheduledDeletionAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateUser(userId: string, data: {
        roles?: string[];
        isVerified?: boolean;
        isAdmin?: boolean;
    }, user: any): Promise<{
        id: string;
        username: string;
        email: string;
        fullName: string;
        roles: import(".prisma/client").$Enums.UserRole[];
    }>;
    suspendUser(userId: string, data: {
        until?: string;
        reason: string;
        note?: string;
    }, admin: any): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            suspendedAt: Date;
            suspendedUntil: Date;
            suspensionReason: string;
        };
    }>;
    unsuspendUser(userId: string): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            suspendedAt: Date;
            suspendedUntil: Date;
            suspensionReason: string;
        };
    }>;
    updateUserRoles(userId: string, data: {
        roles: string[];
    }, user: any): Promise<{
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
    getRoleChangeRemainingDays(userId: string): Promise<{
        remainingDays: number;
    }>;
    getRoleChangeRequests(status?: string, page?: string, limit?: string): Promise<{
        requests: ({
            user: {
                id: string;
                username: string;
                email: string;
                fullName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            status: string;
            message: string;
            requestedRole: import(".prisma/client").$Enums.UserRole;
            reviewedAt: Date;
            reviewNote: string;
            reviewedBy: string;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    approveRoleChangeRequest(requestId: string, adminUser: any, data?: {
        reviewNote?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    rejectRoleChangeRequest(requestId: string, adminUser: any, data?: {
        reviewNote?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteUser(userId: string, user: any): Promise<{
        success: boolean;
        message: string;
        deletedUserId: string;
    }>;
    getPosts(page?: string, limit?: string): Promise<{
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
                url: string;
                id: string;
                type: string;
                order: number;
                thumbnailUrl: string;
            }[];
        } & {
            id: string;
            title: string;
            location: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            type: string;
            caption: string;
            code: string;
            colors: string[];
            colorPalette: string[];
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    deletePost(postId: string, user: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getArtworks(page?: string, limit?: string, search?: string, userId?: string): Promise<{
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
                url: string;
                id: string;
                type: string;
                order: number;
                thumbnailUrl: string;
            }[];
        } & {
            id: string;
            title: string;
            location: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            type: string;
            caption: string;
            code: string;
            colors: string[];
            colorPalette: string[];
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    deleteArtwork(artworkId: string, user: any): Promise<{
        message: string;
        deletedArtworkId: string;
    }>;
    getComments(page?: string, limit?: string): Promise<{
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
    deleteComment(commentId: string, user: any): Promise<{
        success: boolean;
    }>;
    getArticles(page?: string, limit?: string): Promise<{
        articles: ({
            author: {
                id: string;
                username: string;
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
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    deleteArticle(articleId: string, user: any): Promise<{
        success: boolean;
    }>;
    getEvents(page?: string, limit?: string): Promise<{
        events: ({
            owner: {
                id: string;
                username: string;
                avatar: string;
            };
            _count: {
                participants: number;
                tickets: number;
            };
        } & {
            date: Date;
            participantCount: number;
            maxParticipants: number;
            id: string;
            title: string;
            description: string;
            coverImage: string;
            ticketUrl: string;
            price: number;
            isFree: boolean;
            location: string;
            ownerId: string;
            reminderMailSent: boolean;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getTickets(page?: string, limit?: string): Promise<{
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
                price: number;
                createdAt: Date;
                updatedAt: Date;
                eventId: string;
                type: string;
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
    updateFeatureFlag(body: {
        key: string;
        enabled: boolean;
    }, user: any): Promise<{
        updatedAt: Date;
        note: string;
        key: string;
        enabled: boolean;
        updatedBy: string;
    }>;
    getAuditLogs(page?: string, limit?: string): Promise<{
        logs: ({
            actor: {
                id: string;
                username: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            action: string;
            target: string;
            meta: import("@prisma/client/runtime/library").JsonValue;
            ip: string;
            userAgent: string;
            actorId: string;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getModeration(): Promise<{
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
    recalculateFollows(): Promise<{
        message: string;
        totalUsers: number;
        updated: number;
        timestamp: string;
    }>;
    recalculateColors(): Promise<{
        message: string;
        totalPosts: number;
        processed: number;
        failed: number;
        results: any[];
        timestamp: string;
    }>;
    getReports(status?: string, page?: string, limit?: string): Promise<{
        reports: ({
            reporter: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
            reportedUser: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        } & {
            messageId: string;
            id: string;
            createdAt: Date;
            status: string;
            conversationId: string;
            reporterId: string;
            reportedUserId: string;
            reason: import(".prisma/client").$Enums.ReportReason;
            note: string;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getReportById(reportId: string): Promise<{
        reporter: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        reportedUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        messageId: string;
        id: string;
        createdAt: Date;
        status: string;
        conversationId: string;
        reporterId: string;
        reportedUserId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
    }>;
    updateReportStatus(reportId: string, body: {
        status: string;
    }): Promise<{
        reporter: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            avatar: string;
        };
        reportedUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        messageId: string;
        id: string;
        createdAt: Date;
        status: string;
        conversationId: string;
        reporterId: string;
        reportedUserId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
    }>;
    updateSiteName(body: {
        value: string;
    }, user: any): Promise<{
        success: boolean;
        data: {
            success: boolean;
            key: any;
            value: any;
            updatedAt: any;
        };
    }>;
    updateSiteDescription(body: {
        value: string;
    }, user: any): Promise<{
        success: boolean;
        data: {
            success: boolean;
            key: any;
            value: any;
            updatedAt: any;
        };
    }>;
    updateAdminEmail(body: {
        value: string;
    }, user: any): Promise<{
        success: boolean;
        data: {
            success: boolean;
            key: any;
            value: any;
            updatedAt: any;
        };
    }>;
    getSettings(): Promise<{
        success: boolean;
        data: {
            siteName: any;
            siteDescription: any;
            adminEmail: any;
        };
    }>;
}
