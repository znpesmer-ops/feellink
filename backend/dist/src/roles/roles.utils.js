"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoleOverview = exports.getRoleCatalog = exports.ensureRoleAssignment = exports.getSidebarVisibility = exports.computeCapabilities = exports.computeBadgeState = exports.normalizeRoles = exports.isValidRole = exports.parseBadgeState = exports.DEFAULT_BADGE_STATE = void 0;
const roles_constants_1 = require("./roles.constants");
const ROLE_ORDER = ['corporate', 'collector', 'artist', 'art_lover'];
exports.DEFAULT_BADGE_STATE = {
    pro: false,
    corporate_verified: false,
};
const parseBadgeState = (value) => {
    if (!value || !Array.isArray(value) || value.length === 0) {
        return { ...exports.DEFAULT_BADGE_STATE };
    }
    const set = new Set(value);
    return {
        pro: value.some((badge) => badge.endsWith('-pro')),
        corporate_verified: set.has('kurumsal-pro'),
    };
};
exports.parseBadgeState = parseBadgeState;
const isValidRole = (role) => roles_constants_1.ROLE_DEFINITIONS[role] !== undefined;
exports.isValidRole = isValidRole;
const normalizeRoles = (roles) => {
    if (!roles || roles.length === 0) {
        return [];
    }
    const unique = new Set();
    roles.forEach((role) => {
        if ((0, exports.isValidRole)(role)) {
            unique.add(role);
        }
    });
    return ROLE_ORDER.filter((role) => unique.has(role));
};
exports.normalizeRoles = normalizeRoles;
const ALLOW_ALL_ROLES = true;
const mergeFeatureFlags = (roles) => {
    if (ALLOW_ALL_ROLES) {
        return {
            canCreateEvents: true,
            canAccessMyEvents: true,
            canAccessCollections: true,
            canManageCollections: true,
            canAccessAnalytics: true,
            canCreateListings: true,
            canCreateArtworks: true,
        };
    }
    if (roles.length === 0) {
        return {
            canCreateEvents: false,
            canAccessMyEvents: false,
            canAccessCollections: false,
            canManageCollections: false,
            canAccessAnalytics: true,
            canCreateListings: false,
            canCreateArtworks: false,
        };
    }
    return roles.reduce((acc, role) => {
        const flags = roles_constants_1.ROLE_FEATURE_MATRIX[role];
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
const mergeSidebarConfig = (roles) => {
    if (ALLOW_ALL_ROLES) {
        return {
            home: true,
            explore: true,
            messages: true,
            profile: true,
            createEvent: true,
            myEvents: true,
            collections: true,
            manageCollections: true,
            analytics: true,
            listings: true,
            badges: true,
        };
    }
    return roles.reduce((acc, role) => {
        const cfg = roles_constants_1.ROLE_SIDEBAR_CONFIG[role];
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
const matchRoleCombination = (roles) => {
    const set = new Set(roles);
    return roles_constants_1.ROLE_COMBINATIONS.filter((combo) => combo.roles.every((role) => set.has(role)));
};
const aggregatePlanLimits = (roles, plan) => {
    let eventLimit = undefined;
    let artworkLimit = undefined;
    let eventCooldown = null;
    roles.forEach((role) => {
        const rolePlanLimits = roles_constants_1.ROLE_LIMITS[role]?.plans?.['PRO'] ?? roles_constants_1.ROLE_LIMITS[role]?.plans?.['ORI'] ?? roles_constants_1.ROLE_LIMITS[role]?.plans?.FREE ?? {};
        if (rolePlanLimits.eventLimitMonthly !== undefined) {
            const limit = rolePlanLimits.eventLimitMonthly;
            if (limit === null) {
                eventLimit = null;
            }
            else if (typeof limit === 'number' && eventLimit !== null) {
                eventLimit = eventLimit === undefined ? limit : Math.max(eventLimit, limit);
            }
        }
        if (rolePlanLimits.artworkLimitMonthly !== undefined) {
            const limit = rolePlanLimits.artworkLimitMonthly;
            if (limit === null) {
                artworkLimit = null;
            }
            else if (typeof limit === 'number' && artworkLimit !== null) {
                artworkLimit = artworkLimit === undefined ? limit : Math.max(artworkLimit, limit);
            }
        }
        if (rolePlanLimits.eventCooldownMonths !== undefined) {
            const cooldown = rolePlanLimits.eventCooldownMonths;
            if (cooldown === null) {
                eventCooldown = null;
            }
            else if (typeof cooldown === 'number' && cooldown > 0) {
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
const computeBadgeState = (badges, roles, plan) => {
    const base = (0, exports.parseBadgeState)(badges);
    const proActive = true;
    const corporateActive = roles.includes('corporate') && base.corporate_verified;
    const premium = roles.length === ROLE_ORDER.length;
    return {
        pro: proActive,
        corporate_verified: corporateActive,
        premium,
    };
};
exports.computeBadgeState = computeBadgeState;
const computeCapabilities = (roles, plan, badges) => {
    const normalizedRoles = (0, exports.normalizeRoles)(roles);
    const permissions = mergeFeatureFlags(normalizedRoles);
    const limits = aggregatePlanLimits(normalizedRoles, plan);
    const sidebar = mergeSidebarConfig(normalizedRoles);
    const unlockedCombinations = matchRoleCombination(normalizedRoles);
    const badgeState = (0, exports.computeBadgeState)(badges, normalizedRoles, plan);
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
exports.computeCapabilities = computeCapabilities;
const getSidebarVisibility = (capabilities) => {
    const roles = capabilities.roles ?? [];
    const permissions = capabilities.permissions;
    const isSoloArtLover = roles.length === 1 && roles[0] === 'art_lover';
    const showAnalytics = permissions.canAccessAnalytics;
    const showEvents = permissions.canAccessMyEvents ||
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
exports.getSidebarVisibility = getSidebarVisibility;
const ensureRoleAssignment = (roles) => {
    const normalized = (0, exports.normalizeRoles)(roles);
    if (normalized.length > 0) {
        return normalized;
    }
    return ['art_lover'];
};
exports.ensureRoleAssignment = ensureRoleAssignment;
const getRoleCatalog = () => ROLE_ORDER.map((role) => ({
    ...roles_constants_1.ROLE_DEFINITIONS[role],
}));
exports.getRoleCatalog = getRoleCatalog;
const getRoleOverview = () => ({
    roles: (0, exports.getRoleCatalog)(),
    features: roles_constants_1.ROLE_FEATURE_MATRIX,
    limits: roles_constants_1.ROLE_LIMITS,
    sidebar: roles_constants_1.ROLE_SIDEBAR_CONFIG,
    combinations: roles_constants_1.ROLE_COMBINATIONS,
    plans: roles_constants_1.PLAN_DEFINITIONS,
    badges: roles_constants_1.BADGE_DEFINITIONS,
});
exports.getRoleOverview = getRoleOverview;
//# sourceMappingURL=roles.utils.js.map