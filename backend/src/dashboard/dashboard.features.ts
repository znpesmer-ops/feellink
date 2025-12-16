type DashboardPlanKey = 'standard' | 'pro';

type DashboardDefinition = {
  title: Record<DashboardPlanKey, string>;
  features: Record<DashboardPlanKey, string[]>;
};

export const DASHBOARD_FEATURES: Record<string, DashboardDefinition> = {
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

const PLAN_MAP: Record<string, DashboardPlanKey> = {
  free: 'standard',
  standard: 'standard',
  ücretsiz: 'standard',
  pro: 'pro',
};

const normalizePlan = (plan: string | null | undefined): DashboardPlanKey => {
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

const normalizeRole = (role: string | null | undefined): keyof typeof DASHBOARD_FEATURES => {
  if (!role) {
    return 'art_lover';
  }

  if (DASHBOARD_FEATURES[role]) {
    return role as keyof typeof DASHBOARD_FEATURES;
  }

  return 'art_lover';
};

export const getDashboardSnapshot = (role: string | null | undefined, plan: string | null | undefined) => {
  const roleKey = normalizeRole(role);
  // Plan kontrolü kaldırıldı - artık her zaman 'pro' özelliklerini göster
  const planKey: DashboardPlanKey = 'pro';
  const definition = DASHBOARD_FEATURES[roleKey];

  return {
    role: roleKey,
    plan: planKey,
    title: definition.title[planKey],
    features: definition.features[planKey],
  };
};

