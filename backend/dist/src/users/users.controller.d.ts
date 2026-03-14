import { UsersService } from './users.service';
import { UpdateRoleSelectionDto } from './dto/update-role-selection.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { RoleChangeRequestDto } from './dto/role-change-request.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getSelf(user: any): Promise<{
        id: string;
        username: string;
        email: string;
        fullName: string;
        avatar: string;
        bio: string;
        website: string;
        roles: import("../roles/roles.types").UserRoleCode[];
        extras: string[];
        plan: import("../roles/roles.types").SubscriptionPlanCode;
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
        capabilities: import("../roles/roles.types").CapabilitySummary;
        sidebar: import("../roles/roles.types").SidebarVisibility;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
    }>;
    getColorSignature(username: string): Promise<{
        topColors: string[];
    }>;
    getProfileAnalysis(username: string, user: any): Promise<{
        userId: string;
        username: string;
        visibility: "public" | "private";
        palette: string[];
        colorProfile?: {
            warmRatio: number;
            coolRatio: number;
            avgBrightness: number;
            avgSaturation: number;
            dominantMood?: string;
        };
        productionProfile: {
            totalPosts: number;
            activeMonth: string;
            postingFrequency: "low" | "medium" | "high";
        };
        engagement: {
            totalLikes: number;
            totalComments: number;
            avgLikesPerPost: number;
            mostEngagedPostId: string;
        };
        summary: string;
    }>;
    getProfile(username: string, user: any): Promise<any>;
    updateUsername(user: any, data: UpdateUsernameDto): Promise<{
        email: string;
        username: string;
        fullName: string;
        id: string;
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
    updateProfile(user: any, data: UpdateUserDto): Promise<any>;
    completeOnboarding(user: any, data: CompleteOnboardingDto): Promise<{
        success: boolean;
        user: {
            email: string;
            username: string;
            fullName: string;
            id: string;
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
    searchUsers(query: string, user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        avatarUrl: string;
        isVerified: boolean;
    }[]>;
    getSavedPosts(user: any): Promise<{
        message: string;
    }>;
    getHighlights(user: any): Promise<{
        username: string;
        fullName: string;
        id: string;
        avatar: string;
        isVerified: boolean;
    }[]>;
    updateMyRoles(user: any, data: UpdateRoleSelectionDto): Promise<{
        message: string;
        user: {
            activeRole: string;
            email: string;
            username: string;
            fullName: string;
            id: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isAdmin: boolean;
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    updateMyPlan(user: any, data: {
        plan: 'FREE' | 'PRO';
    }): Promise<{
        message: string;
        user: {
            username: string;
            id: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    getMyCapabilities(user: any): Promise<import("../roles/roles.types").CapabilitySummary>;
    getRoleOverview(): Promise<import("../roles/roles.types").RoleOverview>;
    blockUser(userId: string, user: any): Promise<{
        message: string;
    }>;
    unblockUser(userId: string, user: any): Promise<{
        message: string;
    }>;
    getBlockedUsers(user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
        isVerified: boolean;
        blockedAt: Date;
    }[]>;
    deleteAccount(user: any): Promise<{
        message: string;
    }>;
    getSavedArtworks(userId: string, user: any): Promise<{
        isLiked: boolean;
        savedAt: Date;
        user: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
            isVerified: boolean;
        };
        _count: {
            comments: number;
            likes: number;
        };
        media: {
            url: string;
            id: string;
            createdAt: Date;
            type: string;
            postId: string;
            order: number;
            thumbnailUrl: string;
        }[];
        id: string;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        location: string;
        type: string;
        caption: string;
        code: string;
        colors: string[];
        colorPalette: string[];
    }[]>;
    getSaved(userId: string, user: any): Promise<{
        isLiked: boolean;
        savedAt: Date;
        user: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
            isVerified: boolean;
        };
        _count: {
            comments: number;
            likes: number;
        };
        media: {
            url: string;
            id: string;
            createdAt: Date;
            type: string;
            postId: string;
            order: number;
            thumbnailUrl: string;
        }[];
        id: string;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        location: string;
        type: string;
        caption: string;
        code: string;
        colors: string[];
        colorPalette: string[];
    }[]>;
    verifyPhone(user: any, data: {
        code: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    resendPhoneCode(user: any): Promise<{
        success: boolean;
        message: string;
        _devMode?: {
            smsCode: string;
        };
    }>;
    createRoleChangeRequest(user: any, dto: RoleChangeRequestDto): Promise<{
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
