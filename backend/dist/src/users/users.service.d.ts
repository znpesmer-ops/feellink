import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CapabilitySummary, SubscriptionPlanCode, RoleOverview, UserRoleCode } from '../roles/roles.types';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare function getBadgesFromSelection(roles: UserRoleCode[], plan: SubscriptionPlanCode | null, extras?: string[]): string[];
export declare class UsersService {
    private prisma;
    private configService;
    private notificationsService;
    constructor(prisma: PrismaService, configService: ConfigService, notificationsService: NotificationsService);
    getProfile(username: string, currentUserId?: string): Promise<any>;
    getSelf(userId: string): Promise<{
        id: string;
        username: string;
        email: string;
        fullName: string;
        avatar: string;
        bio: string;
        website: string;
        roles: UserRoleCode[];
        extras: string[];
        plan: SubscriptionPlanCode;
        badges: string[];
        createdAt: Date;
        usernameLastChangedAt: Date;
        phoneNumber: string;
        phoneVerified: boolean;
        profileCompleted: boolean;
        dateOfBirth: Date;
        country: string;
        city: string;
        gender: string;
        accountStatus: import(".prisma/client").$Enums.AccountStatus;
        suspendedUntil: Date;
        suspensionReason: string;
        capabilities: CapabilitySummary;
        sidebar: import("../roles/roles.types").SidebarVisibility;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
    }>;
    updateUsername(userId: string, newUsername: string): Promise<{
        id: string;
        username: string;
        email: string;
        fullName: string;
        bio: string;
        avatar: string;
        roles: import(".prisma/client").$Enums.UserRole[];
        plan: import(".prisma/client").$Enums.SubscriptionPlan;
        badges: string[];
        isPrivate: boolean;
        isVerified: boolean;
        usernameLastChangedAt: Date;
        website: string;
        dateOfBirth: Date;
        country: string;
        city: string;
        gender: string;
        profileCompleted: boolean;
    } | {
        id: string;
        username: string;
        usernameLastChangedAt: Date;
    }>;
    updateProfile(userId: string, data: UpdateUserDto): Promise<any>;
    completeOnboarding(userId: string, data: CompleteOnboardingDto): Promise<{
        success: boolean;
        user: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            bio: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isPrivate: boolean;
            isVerified: boolean;
            isAdmin: boolean;
            superAdmin: boolean;
            dateOfBirth: Date;
            country: string;
            city: string;
            gender: string;
            profileCompleted: boolean;
        };
        message: string;
    }>;
    searchUsers(query: string, currentUserId: string): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        avatarUrl: string;
        isVerified: boolean;
    }[]>;
    getHighlights(userId: string): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    updateRoles(userId: string, payload: string[] | {
        roles?: string[];
        plan?: SubscriptionPlanCode;
        extras?: string[];
    }): Promise<{
        message: string;
        user: {
            activeRole: string;
            id: string;
            username: string;
            email: string;
            fullName: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isAdmin: boolean;
        };
        capabilities: CapabilitySummary;
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    getRoleCapabilities(userId: string): Promise<CapabilitySummary>;
    updatePlan(userId: string, plan: SubscriptionPlanCode): Promise<{
        message: string;
        user: {
            id: string;
            username: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
        };
        capabilities: CapabilitySummary;
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    getRolesOverview(): RoleOverview;
    blockUser(blockerId: string, blockedId: string): Promise<{
        message: string;
    }>;
    unblockUser(blockerId: string, blockedId: string): Promise<{
        message: string;
    }>;
    getBlockedUsers(blockerId: string): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        isVerified: boolean;
        blockedAt: Date;
    }[]>;
    deleteAccount(userId: string): Promise<{
        message: string;
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
    }[]>;
    getSaved(userId: string): Promise<{
        isLiked: boolean;
        savedAt: Date;
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
    }[]>;
    private sendPhoneVerificationCode;
    verifyPhone(userId: string, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resendPhoneCode(userId: string): Promise<{
        success: boolean;
        message: string;
        _devMode?: {
            smsCode: string;
        };
    }>;
    getColorSignature(username: string): Promise<{
        topColors: string[];
    }>;
    createRoleChangeRequest(userId: string, dto: {
        requestedRole: string;
        message?: string;
    }): Promise<{
        success: boolean;
        message: string;
        request: {
            id: string;
            requestedRole: import(".prisma/client").$Enums.UserRole;
            status: string;
            createdAt: Date;
        };
    }>;
}
