export type AuthUser = {
    id: string;
    email: string;
    username: string;
    roles?: string[];
    isAdmin?: boolean;
    superAdmin?: boolean;
};
export declare function isSuperAdmin(user?: AuthUser | null): boolean;
export declare function isAdmin(user?: AuthUser | null): boolean;
export declare function hasRole(user: AuthUser | null | undefined, requiredRole: string): boolean;
export declare function hasAnyRole(user: AuthUser | null | undefined, requiredRoles: string[]): boolean;
