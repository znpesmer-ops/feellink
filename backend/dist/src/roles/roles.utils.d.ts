import { BadgeState, CapabilitySummary, RoleOverview, SubscriptionPlanCode, UserRoleCode, SidebarVisibility } from './roles.types';
export declare const DEFAULT_BADGE_STATE: BadgeState;
export declare const parseBadgeState: (value: string[] | null | undefined) => BadgeState;
export declare const isValidRole: (role: string) => role is UserRoleCode;
export declare const normalizeRoles: (roles: string[] | null | undefined) => UserRoleCode[];
export declare const computeBadgeState: (badges: string[] | null | undefined, roles: UserRoleCode[], plan: SubscriptionPlanCode) => BadgeState & {
    premium: boolean;
};
export declare const computeCapabilities: (roles: string[] | null | undefined, plan: SubscriptionPlanCode, badges: string[] | null | undefined) => CapabilitySummary;
export declare const getSidebarVisibility: (capabilities: CapabilitySummary) => SidebarVisibility;
export declare const ensureRoleAssignment: (roles: string[]) => UserRoleCode[];
export declare const getRoleCatalog: () => {
    id: UserRoleCode;
    label: string;
    emoji: string;
    description: string;
}[];
export declare const getRoleOverview: () => RoleOverview;
