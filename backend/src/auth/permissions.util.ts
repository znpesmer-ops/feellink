/**
 * Permission utilities for GOD-MODE (superAdmin) support
 */

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  roles?: string[];
  isAdmin?: boolean;
  superAdmin?: boolean;
};

type AdminLikeUser = Pick<AuthUser, 'roles' | 'isAdmin' | 'superAdmin'> & {
  email?: string | null;
};

const ADMIN_ALLOWED_EMAILS = new Set(['znp.esmer@gmail.com']);

function normalizeEmail(email?: string | null): string {
  return (email ?? '').trim().toLowerCase();
}

export function isAllowedAdminEmail(user?: { email?: string | null } | null): boolean {
  return ADMIN_ALLOWED_EMAILS.has(normalizeEmail(user?.email));
}

/**
 * Check if user is superAdmin (GOD-MODE)
 * SuperAdmin bypasses all role checks
 */
export function isSuperAdmin(user?: AdminLikeUser | null): boolean {
  return isAllowedAdminEmail(user);
}

/**
 * Check if user is admin (regular admin or superAdmin)
 */
export function isAdmin(user?: AdminLikeUser | null): boolean {
  return isAllowedAdminEmail(user);
}

/**
 * Check if user has required role
 * SuperAdmin always returns true
 */
export function hasRole(user: AuthUser | null | undefined, requiredRole: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true; // GOD-MODE: bypass all checks
  return Boolean(user.roles?.includes(requiredRole));
}

/**
 * Check if user has any of the required roles
 * SuperAdmin always returns true
 */
export function hasAnyRole(user: AuthUser | null | undefined, requiredRoles: string[]): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true; // GOD-MODE: bypass all checks
  if (!user.roles || !requiredRoles.length) return false;
  return requiredRoles.some((role) => user.roles?.includes(role));
}


