import { BadgeDefinition, PlanDefinition, RoleCombinationDefinition, RoleDefinition, RoleFeatureFlags, RoleLimitConfig, RoleSidebarConfig, SubscriptionPlanCode, UserRoleCode } from './roles.types';
export declare const ROLE_DEFINITIONS: Record<UserRoleCode, RoleDefinition>;
export declare const ROLE_FEATURE_MATRIX: Record<UserRoleCode, RoleFeatureFlags>;
export declare const ROLE_LIMITS: Record<UserRoleCode, RoleLimitConfig>;
export declare const ROLE_SIDEBAR_CONFIG: Record<UserRoleCode, RoleSidebarConfig>;
export declare const ROLE_COMBINATIONS: RoleCombinationDefinition[];
export declare const PRO_BADGE_PLAN: SubscriptionPlanCode;
export declare const PLAN_DEFINITIONS: PlanDefinition[];
export declare const BADGE_DEFINITIONS: BadgeDefinition[];
