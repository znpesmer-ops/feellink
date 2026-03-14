import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SearchService } from '../search/search.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SubscriptionPlanCode, UserRoleCode } from '../roles/roles.types';
import { MailService } from '../mail/mail.service';
import { OtpService } from './otp.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private searchService;
    private mailService;
    private otpService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, searchService: SearchService, mailService: MailService, otpService: OtpService);
    private readonly logger;
    private readonly authSelect;
    private hydrateAuthUser;
    register(registerDto: RegisterDto): Promise<{
        needsEmailVerification: boolean;
        email: string;
    }>;
    sendSignupOtp(email: string): Promise<{
        message: string;
    }>;
    verifySignupOtp(email: string, code: string): Promise<{
        needsRoleSelection: boolean;
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: UserRoleCode[];
            extras: string[];
            plan: SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
            profileCompleted: any;
            dateOfBirth: any;
            country: any;
            city: any;
            gender: any;
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    login(loginDto: LoginDto): Promise<any>;
    corporateLogin(loginDto: LoginDto): Promise<{
        needsRoleSelection: boolean;
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: UserRoleCode[];
            extras: string[];
            plan: SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
            profileCompleted: any;
            dateOfBirth: any;
            country: any;
            city: any;
            gender: any;
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    checkDatabase(): Promise<boolean>;
    private generateTokens;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: UserRoleCode[];
            extras: string[];
            plan: SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
            profileCompleted: any;
            dateOfBirth: any;
            country: any;
            city: any;
            gender: any;
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    logoutAll(userId: string): Promise<{
        message: string;
    }>;
    loginUnified(loginDto: LoginDto): Promise<{
        reactivated: boolean;
        needsRoleSelection: boolean;
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: UserRoleCode[];
            extras: string[];
            plan: SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
            profileCompleted: any;
            dateOfBirth: any;
            country: any;
            city: any;
            gender: any;
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    validateUser(loginDto: LoginDto, options?: {
        requireCorporate?: boolean;
    }): Promise<any>;
    getUserProfile(userId: string): Promise<{
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: UserRoleCode[];
            extras: string[];
            plan: SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
            profileCompleted: any;
            dateOfBirth: any;
            country: any;
            city: any;
            gender: any;
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    private verifyAndMigratePassword;
    private buildLoginWhereClause;
    setUserRole(userId: string, role: string): Promise<{
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: UserRoleCode[];
            extras: string[];
            plan: SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
            profileCompleted: any;
            dateOfBirth: any;
            country: any;
            city: any;
            gender: any;
        };
        capabilities: import("../roles/roles.types").CapabilitySummary;
        dashboard: {
            role: string;
            plan: "pro";
            title: string;
            features: string[];
        };
        sidebar: import("../roles/roles.types").SidebarVisibility;
    }>;
    private createPasswordResetToken;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        expiresAt?: undefined;
    } | {
        message: string;
        expiresAt: string;
    }>;
    verifyResetOtp(email: string, code: string): Promise<{
        resetToken: string;
    }>;
    resetPasswordWithOtp(resetToken: string, newPassword: string): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto, requestMeta?: {
        ip?: string;
        userAgent?: string;
    }): Promise<{
        message: string;
    }>;
}
