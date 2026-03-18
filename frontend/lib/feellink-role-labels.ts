/** Feellink UserRole (Prisma) → görünen etiket */
export const FEELLINK_ROLE_LABELS: Record<string, string> = {
  artist: 'Sanatçı',
  corporate: 'Kurumsal',
  collector: 'Koleksiyoner',
  art_lover: 'Sanatsever',
  curator: 'Küratör',
  researcher: 'Araştırmacı',
}

const ROLE_PRIORITY = ['artist', 'collector', 'corporate', 'art_lover'] as const

export function getPrimaryFeellinkRole(roles?: string[] | null): string | null {
  if (!roles?.length) return null
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r
  }
  const first = roles.find((r) => FEELLINK_ROLE_LABELS[r])
  return first ?? null
}

export function getFeellinkRoleLabel(roleKey: string): string {
  return FEELLINK_ROLE_LABELS[roleKey] ?? ''
}
