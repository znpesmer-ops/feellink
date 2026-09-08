/**
 * Admin utility functions for SaaS-style admin management
 * Admin users bypass all plan restrictions and have full access
 */

import { useAuthStore } from './store'

type AdminLikeUser = {
  email?: string | null
  isAdmin?: boolean | null
  superAdmin?: boolean | null
  roles?: readonly string[] | null
  plan?: string | null
}

const ADMIN_ALLOWED_EMAILS = new Set(['znp.esmer@gmail.com'])

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export function isAllowedAdminEmail(user: AdminLikeUser | null | undefined): boolean {
  return ADMIN_ALLOWED_EMAILS.has(normalizeEmail(user?.email))
}

/**
 * Check if current user is admin (isAdmin or superAdmin)
 */
export function useIsAdmin(): boolean {
  const { user } = useAuthStore()
  return isAdminUser(user)
}

/**
 * Check if user has admin privileges (static version)
 */
export function isSuperAdminUser(user: AdminLikeUser | null | undefined): boolean {
  return isAllowedAdminEmail(user)
}

export function isAdminUser(user: AdminLikeUser | null | undefined): boolean {
  return isAllowedAdminEmail(user)
}

/**
 * Check if feature should be available (admin bypasses plan restrictions)
 */
export function hasFeatureAccess(
  user: AdminLikeUser | null | undefined,
  requiredPlan: 'FREE' | 'PRO' | 'ORI' = 'FREE'
): boolean {
  // Admin users have access to all features
  if (isAdminUser(user)) {
    return true
  }

  // Normal plan-based access control
  const userPlan = user?.plan?.toUpperCase() || 'FREE'
  const planHierarchy = { FREE: 0, ORI: 1, PRO: 2 }
  const requiredLevel = planHierarchy[requiredPlan] || 0
  const userLevel = planHierarchy[userPlan as keyof typeof planHierarchy] || 0

  return userLevel >= requiredLevel
}

/**
 * Get admin status label for UI
 */
export function getAdminStatusLabel(user: AdminLikeUser | null | undefined): string {
  if (isSuperAdminUser(user)) {
    return 'Super Admin'
  }
  if (isAdminUser(user)) {
    return 'Admin'
  }
  return ''
}





