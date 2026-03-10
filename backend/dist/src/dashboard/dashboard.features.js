"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSnapshot = exports.DASHBOARD_FEATURES = void 0;
exports.DASHBOARD_FEATURES = {
    artist: {
        title: {
            standard: 'Eserlerinizi paylaşın, kitleye ulaşın.',
            pro: 'Sanatınızı profesyonel bir vitrine taşıyın.',
        },
        features: {
            standard: ['10 eser paylaşımı', 'Temel istatistiklere erişim'],
            pro: [
                'Sınırsız eser paylaşımı',
                'Gelişmiş analizler ve takipçi içgörüleri',
                'Feellink Pro Rozeti',
            ],
        },
    },
    collector: {
        title: {
            standard: 'Koleksiyonunuzu keşfedin ve sergileyin.',
            pro: 'Koleksiyonunuzu profesyonelce vitrine çıkarın.',
        },
        features: {
            standard: ['5 koleksiyon ekleme', 'Temel görünürlük'],
            pro: [
                'Sınırsız koleksiyon & eser ekleme',
                'Ziyaretçi analitiği ve içgörü',
                'Feellink Pro Rozeti',
            ],
        },
    },
    corporate: {
        title: {
            standard: 'Etkinliklerinizi organize edin.',
            pro: 'Etkinliklerinizi analiz edin ve büyütün.',
        },
        features: {
            standard: ['2 etkinlik oluşturma', 'Katılımcı listesi erişimi'],
            pro: [
                'Sınırsız etkinlik yönetimi',
                'Ziyaretçi ve satış raporları',
                'Feellink Pro Rozeti',
            ],
        },
    },
    art_lover: {
        title: {
            standard: 'Sanatı keşfedin ve ilham alın.',
            pro: 'Kapsamlı sanat deneyimi yaşayın.',
        },
        features: {
            standard: ['Haftalık öneriler', 'Temel beğeni geçmişi'],
            pro: [
                'Sınırsız etkileşim',
                'Etkinliklere öncelikli erişim',
                'Feellink Pro Rozeti',
            ],
        },
    },
};
const PLAN_MAP = {
    free: 'standard',
    standard: 'standard',
    ücretsiz: 'standard',
    pro: 'pro',
};
const normalizePlan = (plan) => {
    if (!plan) {
        return 'standard';
    }
    const normalized = PLAN_MAP[plan.toLowerCase()];
    if (normalized) {
        return normalized;
    }
    if (plan.toUpperCase() === 'PRO') {
        return 'pro';
    }
    return 'standard';
};
const normalizeRole = (role) => {
    if (!role) {
        return 'art_lover';
    }
    if (exports.DASHBOARD_FEATURES[role]) {
        return role;
    }
    return 'art_lover';
};
const getDashboardSnapshot = (role, plan) => {
    const roleKey = normalizeRole(role);
    const planKey = 'pro';
    const definition = exports.DASHBOARD_FEATURES[roleKey];
    return {
        role: roleKey,
        plan: planKey,
        title: definition.title[planKey],
        features: definition.features[planKey],
    };
};
exports.getDashboardSnapshot = getDashboardSnapshot;
//# sourceMappingURL=dashboard.features.js.map