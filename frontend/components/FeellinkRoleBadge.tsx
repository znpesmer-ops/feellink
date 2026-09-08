'use client'

import {
  getFeellinkRoleLabel,
  getPrimaryFeellinkRole,
} from '@/lib/feellink-role-labels'

export interface FeellinkRoleBadgeProps {
  roles?: string[] | null
  /** pill: ✦ Sanatçı; compact: küçük ✦ (hikaye avatar köşesi vb.) */
  variant?: 'pill' | 'compact'
  className?: string
}

export function FeellinkRoleBadge({
  roles,
  variant = 'pill',
  className = '',
}: FeellinkRoleBadgeProps) {
  const key = getPrimaryFeellinkRole(roles)
  if (!key) return null
  const label = getFeellinkRoleLabel(key)
  if (!label) return null
  const tooltip = `Feellink rolü: ${label}`

  if (variant === 'compact') {
    return (
      <span
        title={tooltip}
        className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/25 text-[10px] font-semibold text-orange-700 shadow-sm backdrop-blur-sm dark:bg-orange-500/20 dark:text-orange-300 ${className}`}
        aria-label={tooltip}
      >
        ✦
      </span>
    )
  }

  return (
    <span
      title={tooltip}
      className={`ml-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-300/70 bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-orange-800 shadow-[0_10px_24px_-16px_rgba(249,115,22,0.95),inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-white/45 backdrop-blur-md dark:border-orange-300/35 dark:bg-[#2a1a11]/80 dark:text-orange-100 dark:ring-orange-200/10 ${className}`}
    >
      <span className="text-orange-500 dark:text-orange-300" aria-hidden>
        ✦
      </span>
      {label}
    </span>
  )
}
