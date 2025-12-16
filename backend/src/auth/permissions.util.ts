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

/**
 * Check if user is superAdmin (GOD-MODE)
 * SuperAdmin bypasses all role checks
 */
export function isSuperAdmin(user?: AuthUser | null): boolean {
  if (!user) return false;
  return Boolean(user.superAdmin === true);
}

/**
 * Check if user is admin (regular admin or superAdmin)
 */
export function isAdmin(user?: AuthUser | null): boolean {
  if (!user) return false;
  return Boolean(user.isAdmin === true || user.superAdmin === true);
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








