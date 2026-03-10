/// <reference types="cookie-parser" />
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SetRoleDto } from './dto/role.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private authService;
    private readonly logger;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto, req: Request, res: Response): Promise<{
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
            roles: import("../roles/roles.types").UserRoleCode[];
            extras: string[];
            plan: import("../roles/roles.types").SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
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
    registerCorporate(registerDto: RegisterDto, res: Response): Promise<{
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
            roles: import("../roles/roles.types").UserRoleCode[];
            extras: string[];
            plan: import("../roles/roles.types").SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
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
    login(loginDto: LoginDto, res: Response): Promise<any>;
    corporateLogin(loginDto: LoginDto, res: Response): Promise<{
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
            roles: import("../roles/roles.types").UserRoleCode[];
            extras: string[];
            plan: import("../roles/roles.types").SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
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
    loginUnified(loginDto: LoginDto, res: Response): Promise<{
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
            roles: import("../roles/roles.types").UserRoleCode[];
            extras: string[];
            plan: import("../roles/roles.types").SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
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
    setRole(setRoleDto: SetRoleDto): Promise<{
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: import("../roles/roles.types").UserRoleCode[];
            extras: string[];
            plan: import("../roles/roles.types").SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
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
    refresh(refreshDto: RefreshDto, req: Request, res: Response): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: import("../roles/roles.types").UserRoleCode[];
            extras: string[];
            plan: import("../roles/roles.types").SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
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
    logout(refreshDto: RefreshDto, req: Request, res: Response): Promise<{
        message: string;
    }>;
    logoutAll(user: any): Promise<{
        message: string;
    }>;
    getCurrentUser(user: any): Promise<{
        user: {
            id: any;
            username: any;
            email: any;
            fullName: any;
            avatar: any;
            bio: any;
            roles: import("../roles/roles.types").UserRoleCode[];
            extras: string[];
            plan: import("../roles/roles.types").SubscriptionPlanCode;
            badges: string[];
            isPrivate: any;
            isVerified: any;
            isAdmin: any;
            superAdmin: any;
            createdAt: any;
            activeRole: string;
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
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
