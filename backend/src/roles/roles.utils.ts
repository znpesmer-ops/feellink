import {
  ROLE_COMBINATIONS,
  ROLE_DEFINITIONS,
  ROLE_FEATURE_MATRIX,
  ROLE_LIMITS,
  ROLE_SIDEBAR_CONFIG,
  PRO_BADGE_PLAN,
  PLAN_DEFINITIONS,
  BADGE_DEFINITIONS,
} from './roles.constants';
import {
  BadgeState,
  CapabilitySummary,
  RoleOverview,
  RoleCombinationDefinition,
  RoleFeatureFlags,
  RoleSidebarConfig,
  SubscriptionPlanCode,
  UserRoleCode,
  SidebarVisibility,
} from './roles.types';

const ROLE_ORDER: UserRoleCode[] = ['corporate', 'collector', 'artist', 'art_lover'];

export const DEFAULT_BADGE_STATE: BadgeState = {
  pro: false,
  corporate_verified: false,
};

export const parseBadgeState = (value: string[] | null | undefined): BadgeState => {
  if (!value || !Array.isArray(value) || value.length === 0) {
    return { ...DEFAULT_BADGE_STATE };
  }

  const set = new Set(value);

  return {
    pro: value.some((badge) => badge.endsWith('-pro')),
    corporate_verified: set.has('kurumsal-pro'),
  };
};

export const isValidRole = (role: string): role is UserRoleCode =>
  (ROLE_DEFINITIONS as Record<string, unknown>)[role] !== undefined;

export const normalizeRoles = (roles: string[] | null | undefined): UserRoleCode[] => {
  if (!roles || roles.length === 0) {
    return [];
  }

  const unique = new Set<UserRoleCode>();

  roles.forEach((role) => {
    if (isValidRole(role)) {
      unique.add(role);
    }
  });

  return ROLE_ORDER.filter((role) => unique.has(role));
};

const mergeFeatureFlags = (roles: UserRoleCode[]): RoleFeatureFlags => {
  if (roles.length === 0) {
    return {
      canCreateEvents: false,
      canAccessMyEvents: false,
      canAccessCollections: false,
      canManageCollections: false,
      canAccessAnalytics: true, // Guests still can see analytics cards (read-only)
      canCreateListings: false,
      canCreateArtworks: false,
    };
  }

  return roles.reduce<RoleFeatureFlags>((acc, role) => {
    const flags = ROLE_FEATURE_MATRIX[role];
    return {
      canCreateEvents: acc.canCreateEvents || flags.canCreateEvents,
      canAccessMyEvents: acc.canAccessMyEvents || flags.canAccessMyEvents,
      canAccessCollections: acc.canAccessCollections || flags.canAccessCollections,
      canManageCollections: acc.canManageCollections || flags.canManageCollections,
      canAccessAnalytics: acc.canAccessAnalytics || flags.canAccessAnalytics,
      canCreateListings: acc.canCreateListings || flags.canCreateListings,
      canCreateArtworks: acc.canCreateArtworks || flags.canCreateArtworks,
    };
  }, {
    canCreateEvents: false,
    canAccessMyEvents: false,
    canAccessCollections: false,
    canManageCollections: false,
    canAccessAnalytics: false,
    canCreateListings: false,
    canCreateArtworks: false,
  });
};

const mergeSidebarConfig = (roles: UserRoleCode[]): RoleSidebarConfig => {
  return roles.reduce<RoleSidebarConfig>((acc, role) => {
    const cfg = ROLE_SIDEBAR_CONFIG[role];
    return {
      home: acc.home || cfg.home,
      explore: acc.explore || cfg.explore,
      messages: acc.messages || cfg.messages,
      profile: acc.profile || cfg.profile,
      createEvent: acc.createEvent || cfg.createEvent,
      myEvents: acc.myEvents || cfg.myEvents,
      collections: acc.collections || cfg.collections,
      manageCollections: acc.manageCollections || cfg.manageCollections,
      analytics: acc.analytics || cfg.analytics,
      listings: acc.listings || cfg.listings,
      badges: acc.badges || cfg.badges,
    };
  }, {
    home: true,
    explore: true,
    messages: true,
    profile: true,
    createEvent: false,
    myEvents: false,
    collections: false,
    manageCollections: false,
    analytics: true,
    listings: false,
    badges: true,
  });
};

const matchRoleCombination = (roles: UserRoleCode[]): RoleCombinationDefinition[] => {
  const set = new Set(roles);
  return ROLE_COMBINATIONS.filter((combo) => combo.roles.every((role) => set.has(role)));
};

const aggregatePlanLimits = (
  roles: UserRoleCode[],
  plan: SubscriptionPlanCode,
): CapabilitySummary['limits'] => {
  let eventLimit: number | null | undefined = undefined;
  let artworkLimit: number | null | undefined = undefined;
  let eventCooldown: number | null = null;

  roles.forEach((role) => {
    // Plan kontrolü kaldırıldı - artık her zaman PRO plan limitlerini kullan
    const rolePlanLimits =
      ROLE_LIMITS[role]?.plans?.['PRO'] ?? ROLE_LIMITS[role]?.plans?.['ORI'] ?? ROLE_LIMITS[role]?.plans?.FREE ?? {};

    if (rolePlanLimits.eventLimitMonthly !== undefined) {
      const limit = rolePlanLimits.eventLimitMonthly;
      if (limit === null) {
        eventLimit = null;
      } else if (typeof limit === 'number' && eventLimit !== null) {
        eventLimit = eventLimit === undefined ? limit : Math.max(eventLimit, limit);
      }
    }

    if (rolePlanLimits.artworkLimitMonthly !== undefined) {
      const limit = rolePlanLimits.artworkLimitMonthly;
      if (limit === null) {
        artworkLimit = null;
      } else if (typeof limit === 'number' && artworkLimit !== null) {
        artworkLimit = artworkLimit === undefined ? limit : Math.max(artworkLimit, limit);
      }
    }

    if (rolePlanLimits.eventCooldownMonths !== undefined) {
      const cooldown = rolePlanLimits.eventCooldownMonths;
      if (cooldown === null) {
        eventCooldown = null;
      } else if (typeof cooldown === 'number' && cooldown > 0) {
        eventCooldown =
          eventCooldown === null ? cooldown : Math.min(eventCooldown, cooldown);
      }
    }
  });

  return {
    eventLimitMonthly: eventLimit ?? null,
    artworkLimitMonthly: artworkLimit ?? null,
    eventCooldownMonths: eventCooldown,
  };
};

export const computeBadgeState = (
  badges: string[] | null | undefined,
  roles: UserRoleCode[],
  plan: SubscriptionPlanCode,
): BadgeState & { premium: boolean } => {
  const base: BadgeState = parseBadgeState(badges);

  // Plan kontrolü kaldırıldı - artık her zaman pro aktif
  const proActive = true; // Her zaman true
  const corporateActive = roles.includes('corporate') && base.corporate_verified;
  const premium = roles.length === ROLE_ORDER.length;

  return {
    pro: proActive,
    corporate_verified: corporateActive,
    premium,
  };
};

export const computeCapabilities = (
  roles: string[] | null | undefined,
  plan: SubscriptionPlanCode,
  badges: string[] | null | undefined,
): CapabilitySummary => {
  const normalizedRoles = normalizeRoles(roles);
  const permissions = mergeFeatureFlags(normalizedRoles);
  const limits = aggregatePlanLimits(normalizedRoles, plan);
  const sidebar = mergeSidebarConfig(normalizedRoles);
  const unlockedCombinations = matchRoleCombination(normalizedRoles);
  const badgeState = computeBadgeState(badges, normalizedRoles, plan);

  return {
    roles: normalizedRoles,
    plan,
    permissions,
    limits,
    sidebar,
    unlockedCombinations,
    badges: badgeState,
  };
};

export const getSidebarVisibility = (capabilities: CapabilitySummary): SidebarVisibility => {
  const roles = capabilities.roles ?? [];
  const permissions = capabilities.permissions;
  // Plan kontrolü kaldırıldı - artık herkes tüm özelliklere erişebilir
  const isSoloArtLover = roles.length === 1 && roles[0] === 'art_lover';

  // Plan kontrolü kaldırıldı - artık her zaman true
  const showAnalytics = permissions.canAccessAnalytics;
  const showEvents =
    permissions.canAccessMyEvents ||
    permissions.canCreateEvents;
  const showCollections = permissions.canAccessCollections || permissions.canManageCollections;
  const showListings = permissions.canCreateListings || !isSoloArtLover;

  return {
    showFeed: true,
    showExplore: true,
    showProfile: true,
    showMessages: true,
    showListings,
    showAnalytics,
    showEvents,
    showCollections,
    showTickets: true,
  };
};

export const ensureRoleAssignment = (roles: string[]): UserRoleCode[] => {
  const normalized = normalizeRoles(roles);
  if (normalized.length > 0) {
    return normalized;
  }
  // Default fallback: art_lover role for base experience
  return ['art_lover'];
};

export const getRoleCatalog = () =>
  ROLE_ORDER.map((role) => ({
    ...ROLE_DEFINITIONS[role],
  }));

export const getRoleOverview = (): RoleOverview => ({
  roles: getRoleCatalog(),
  features: ROLE_FEATURE_MATRIX,
  limits: ROLE_LIMITS,
  sidebar: ROLE_SIDEBAR_CONFIG,
  combinations: ROLE_COMBINATIONS,
  plans: PLAN_DEFINITIONS,
  badges: BADGE_DEFINITIONS,
});

