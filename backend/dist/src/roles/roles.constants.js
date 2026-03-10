"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BADGE_DEFINITIONS = exports.PLAN_DEFINITIONS = exports.PRO_BADGE_PLAN = exports.ROLE_COMBINATIONS = exports.ROLE_SIDEBAR_CONFIG = exports.ROLE_LIMITS = exports.ROLE_FEATURE_MATRIX = exports.ROLE_DEFINITIONS = void 0;
exports.ROLE_DEFINITIONS = {
    art_lover: {
        id: 'art_lover',
        label: 'Sanat Sever',
        emoji: '🎨',
        description: 'Etkinliklere katılır, içerik keşfeder ve analizleri görüntüler.',
    },
    corporate: {
        id: 'corporate',
        label: 'Kurumsal',
        emoji: '🏢',
        description: 'Etkinlikler düzenler, ilan açar ve gelişmiş analizlere erişir.',
    },
    collector: {
        id: 'collector',
        label: 'Koleksiyoner',
        emoji: '🗝️',
        description: 'Koleksiyon yönetimi ve etkinlik organizasyonu yapar.',
    },
    artist: {
        id: 'artist',
        label: 'Sanatçı',
        emoji: '🖌️',
        description: 'Portföyünü yönetir, ilan açar ve etkinlikler planlar.',
    },
};
exports.ROLE_FEATURE_MATRIX = {
    art_lover: {
        canCreateEvents: false,
        canAccessMyEvents: false,
        canAccessCollections: true,
        canManageCollections: true,
        canAccessAnalytics: true,
        canCreateListings: false,
        canCreateArtworks: true,
    },
    corporate: {
        canCreateEvents: true,
        canAccessMyEvents: true,
        canAccessCollections: true,
        canManageCollections: true,
        canAccessAnalytics: true,
        canCreateListings: true,
        canCreateArtworks: false,
    },
    collector: {
        canCreateEvents: true,
        canAccessMyEvents: true,
        canAccessCollections: true,
        canManageCollections: true,
        canAccessAnalytics: true,
        canCreateListings: true,
        canCreateArtworks: true,
    },
    artist: {
        canCreateEvents: true,
        canAccessMyEvents: true,
        canAccessCollections: true,
        canManageCollections: true,
        canAccessAnalytics: true,
        canCreateListings: false,
        canCreateArtworks: true,
    },
};
exports.ROLE_LIMITS = {
    art_lover: {
        plans: {
            FREE: {
                eventCooldownMonths: 6,
                eventLimitMonthly: null,
            },
            PRO: {
                eventLimitMonthly: 1000,
                eventCooldownMonths: null,
            },
        },
    },
    corporate: {
        plans: {
            FREE: {
                eventLimitMonthly: 30,
            },
            PRO: {
                eventLimitMonthly: 1000,
            },
        },
    },
    collector: {
        plans: {
            FREE: {
                artworkLimitMonthly: 5,
            },
            PRO: {
                artworkLimitMonthly: 1000,
            },
            ORI: {
                artworkLimitMonthly: 1000,
            },
        },
    },
    artist: {
        plans: {
            FREE: {
                eventLimitMonthly: 5,
            },
            PRO: {
                eventLimitMonthly: 1000,
            },
        },
    },
};
exports.ROLE_SIDEBAR_CONFIG = {
    art_lover: {
        home: true,
        explore: true,
        messages: true,
        profile: true,
        createEvent: false,
        myEvents: false,
        collections: true,
        manageCollections: true,
        analytics: true,
        listings: true,
        badges: true,
    },
    corporate: {
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
    },
    collector: {
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
    },
    artist: {
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
    },
};
exports.ROLE_COMBINATIONS = [
    {
        id: 'art_lover+corporate',
        roles: ['art_lover', 'corporate'],
        summary: 'Kurumsal etkinlik özellikleri + Analizler',
        features: ['Kurumsal etkinlik yönetimi', 'Gelişmiş analizler', 'Kurumsal doğrulama süreci'],
    },
    {
        id: 'corporate+collector',
        roles: ['corporate', 'collector'],
        summary: 'Etkinlikler, Koleksiyon Yönetimi, Analizler',
        features: ['Sınırsız etkinlik yönetimi', 'Koleksiyon modülleri', 'Dinamik panel'],
    },
    {
        id: 'collector+artist',
        roles: ['collector', 'artist'],
        summary: 'Koleksiyon, Portföy, İlan Açma, Analiz',
        features: ['Koleksiyon yönetimi', 'Portföy & ilan paneli', 'Analitik kılavuzlar'],
    },
    {
        id: 'art_lover+artist',
        roles: ['art_lover', 'artist'],
        summary: 'Etkinliklere katılım, İlan açma, Analiz',
        features: ['Etkinlik katılım modülü', 'İlan yönetimi', 'Analiz panosu'],
    },
    {
        id: 'corporate+artist',
        roles: ['corporate', 'artist'],
        summary: 'Etkinlik oluşturma, Bilet yönetimi, İlan açma',
        features: ['Kurumsal etkinlik akışı', 'Bilet & katılım araçları', 'İlan yayınlama modülü'],
    },
    {
        id: 'all_roles',
        roles: ['corporate', 'collector', 'art_lover', 'artist'],
        summary: 'Tüm özel modüller aktif, Feellink Premium',
        features: ['Feellink Premium görünümü', 'Tam erişim', 'Özel rozet & kombinasyonlar'],
    },
];
exports.PRO_BADGE_PLAN = 'PRO';
exports.PLAN_DEFINITIONS = [
    {
        code: 'FREE',
        label: 'Free',
        description: 'Koleksiyon ve etkinlik deneyimini başlatmak için temel özellikler.',
        perks: [
            'Analiz panosuna erişim',
            'Aylık limitli etkinlik oluşturma',
            'Rol kombinasyonlarını keşfetme',
        ],
    },
    {
        code: 'PRO',
        label: 'Pro',
        description: 'Sınırsız etkinlik, özel badge ve tüm modüllerin kilidi.',
        perks: [
            'Sınırsız etkinlik oluşturma',
            'Feellink Pro rozeti',
            'Premium kombinasyon görünümü',
        ],
        badge: 'pro',
    },
];
exports.BADGE_DEFINITIONS = [
    {
        key: 'pro',
        label: 'Pro Rozeti',
        emoji: '🟤',
        description: 'Pro plana yükselen kullanıcılara otomatik olarak verilir.',
    },
    {
        key: 'corporate_verified',
        label: 'Kurumsal Onay Rozeti',
        emoji: '🟧',
        description: 'Kurumsal doğrulama sürecini tamamlayan işletmelere atanır.',
    },
    {
        key: 'premium',
        label: 'Feellink Premium',
        emoji: '🌟',
        description: 'Tüm roller aktif olduğunda panelde özel görünüm ve kombinasyonlar açılır.',
    },
];
//# sourceMappingURL=roles.constants.js.map