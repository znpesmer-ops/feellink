"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  Activity,
  Award,
  BarChart3,
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Loader2,
  MessageCircle,
  Palette,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import api from "@/lib/api";
// RightSidebar artık sadece ana sayfada görünüyor, burada gerek yok
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import { initSocket, getSocket } from "@/lib/socket";
import dynamic from "next/dynamic";
import { ColorMatchesCard } from "@/components/analytics/ColorMatchesCard";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionPlanCode, UserRoleCode } from "@/types/capabilities";

// Dynamic import for TicketChart (SSR disabled for Chart.js)
const TicketChart = dynamic(() => import("@/components/analytics/TicketChart"), {
  ssr: false,
});

// Dynamic import for TopEventsChart
const TopEventsChart = dynamic(() => import("@/components/analytics/TopEventsChart"), {
  ssr: false,
});

// Dynamic import for KeywordsChart (SSR disabled for Recharts)
const KeywordsChart = dynamic(() => import("@/components/analytics/KeywordsChart"), {
  ssr: false,
});

const DEFAULT_ANALYTICS_AVATAR =
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface VisitData {
  date: string;
  count: number;
}

interface WordData {
  word: string;
  count: number;
}

interface TopUser {
  username: string;
  avatar?: string;
  fullName?: string;
  activityCount: number;
}

interface EventStat {
  id: string;
  title: string;
  ticketCount: number;
  totalCapacity: number;
  commentCount: number;
  recentTickets: Array<{
    username: string;
    fullName?: string;
    avatar?: string;
    createdAt: string;
  }>;
}

interface ColorPaletteItem {
  hex: string;
  frequency?: number;
}

// Plan kontrolü kaldırıldı - artık herkes erişebilir
function isProPlan(
  user?: { plan?: SubscriptionPlanCode; roles?: UserRoleCode[]; isAdmin?: boolean; superAdmin?: boolean } | null,
  capabilities?: { plan?: SubscriptionPlanCode; roles?: UserRoleCode[] } | null
) {
  // Plan kontrolü kaldırıldı - her zaman true döndür
  return true;
}

// Blur / Overlay için koruma komponenti
type BlurGuardProps = {
  isPro: boolean;
  children: React.ReactNode;
};

function BlurGuard({ isPro, children }: BlurGuardProps) {
  const router = useRouter();

  if (isPro) {
    // Pro ise hiç dokunma, olduğu gibi göster
    return <>{children}</>;
  }

  // Dark mode kontrolü
  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="relative">
      {/* Mode'a göre farklı blur değerleri */}
      <div
        className={`pointer-events-none select-none transition-all duration-300 ${
          isDarkMode
            ? 'blur-[4px] opacity-75' // Dark mode: daha hafif blur, içerik daha belirgin
            : 'blur-[6px] opacity-65' // Light mode: hafif bulanık, içerik seçilebilir
        }`}
      >
        {children}
      </div>

      {/* Premium glass overlay with vignette */}
      <div
        className={`pointer-events-auto absolute inset-0 flex flex-col items-center justify-center rounded-2xl px-6 transition-all duration-300 ${
          isDarkMode
            ? 'backdrop-blur-[4px] bg-black/25' // Dark mode: daha hafif overlay
            : 'backdrop-blur-[6px] bg-white/35' // Light mode: hafif overlay
        }`}
      >
        {/* Vignette efekti (çok hafif kararma – profesyonel görünüm) */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black/10 dark:from-transparent dark:to-black/30 rounded-2xl" />

        {/* Plan kontrolü kaldırıldı - artık herkes erişebilir */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3">
          <p className="text-center text-sm text-gray-600 dark:text-gray-300 max-w-xs leading-relaxed">
            Bu özellik tüm kullanıcılara açıktır.
          </p>
        </div>
      </div>
    </div>
  );
}

const analyticsPanelClass =
  "relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111824]/84 dark:shadow-black/24 sm:p-6";

const analyticsSubPanelClass =
  "rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 text-slate-800 transition hover:border-orange-300/45 hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-200 dark:hover:border-orange-300/30 dark:hover:bg-white/[0.07]";

function AnalyticsCard({
  title,
  subtitle,
  icon: Icon,
  children,
  accent = "orange",
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: typeof TrendingUp;
  children: React.ReactNode;
  accent?: "orange" | "blue" | "green";
  className?: string;
}) {
  const accentClass =
    accent === "blue"
      ? "border-blue-300/30 bg-blue-500/10 text-blue-600 dark:text-blue-200"
      : accent === "green"
      ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200"
      : "border-orange-300/30 bg-orange-500/10 text-orange-600 dark:text-orange-200";

  return (
    <section className={`${analyticsPanelClass} ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.12),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.10),transparent_30%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.14),transparent_30%)]" />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${accentClass}`}>
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-black text-slate-950 dark:text-white">{title}</h3>
            </div>
            {subtitle && (
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "orange",
}: {
  label: string;
  value: string | number;
  icon: typeof TrendingUp;
  tone?: "orange" | "blue" | "green" | "slate";
}) {
  const toneClass =
    tone === "blue"
      ? "from-blue-500/18 to-sky-400/5 text-blue-600 dark:text-blue-200"
      : tone === "green"
      ? "from-emerald-500/16 to-teal-400/5 text-emerald-600 dark:text-emerald-200"
      : tone === "slate"
      ? "from-slate-500/12 to-slate-400/5 text-slate-700 dark:text-slate-200"
      : "from-orange-500/18 to-amber-400/5 text-orange-600 dark:text-orange-200";

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/86 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-white/[0.055]">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneClass}`} />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-current/15 bg-white/65 dark:bg-slate-950/35">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof TrendingUp;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300/80 bg-slate-50/60 px-6 py-10 text-center dark:border-white/12 dark:bg-white/[0.035]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-300/25 bg-orange-500/10 text-orange-600 dark:text-orange-200">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, capabilities, accessToken } = useAuthStore();
  const pro = isProPlan(user, capabilities);
  const [visits, setVisits] = useState<VisitData[]>([]);
  const [words, setWords] = useState<WordData[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [colorPalette, setColorPalette] = useState<ColorPaletteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('30d');
  const [topPerforming, setTopPerforming] = useState<any>(null);
  const [saveAnalytics, setSaveAnalytics] = useState<any>(null);
  const [sourceDistribution, setSourceDistribution] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [lowEngagement, setLowEngagement] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const resolveAvatarUrl = (avatar?: string | null) => {
    if (!avatar || avatar.trim() === "") {
      return DEFAULT_ANALYTICS_AVATAR;
    }
    if (avatar.startsWith("http")) {
      if (avatar.includes("localhost:3000")) {
        return DEFAULT_ANALYTICS_AVATAR;
      }
      return avatar;
    }
    return DEFAULT_ANALYTICS_AVATAR;
  };

  // Get user posts with colorPalette data
  const { data: posts } = useQuery({
    queryKey: ["userPosts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await api.get(`/posts/user/${user.id}`);
        return response.data || [];
      } catch (error) {
        console.error("Gönderiler alınamadı:", error);
        return [];
      }
    },
    enabled: !!user?.id && !!accessToken,
  });

  // Get top 5 color matches
  const { data: colorMatches, isLoading: isLoadingColorMatches, error: colorMatchesError } = useQuery({
    queryKey: ["color-match", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const response = await api.get("/analytics/color-match/top5");
        return response.data || [];
      } catch (error: any) {
        console.error("Renk eşleşmeleri alınamadı:", error);
        // Hata durumunda boş array döndür (kullanıcı deneyimini bozmamak için)
        // Backend zaten hata durumunda boş array döndürüyor
        return [];
      }
    },
    enabled: !!user?.id && !!accessToken,
    retry: 1, // Sadece 1 kez tekrar dene
    retryDelay: 1000, // 1 saniye bekle
  });

  // Wait for Zustand hydration to complete
  useEffect(() => {
    // Zustand persist middleware'inin hydration'ını bekle
    // İlk render'da user ve accessToken localStorage'dan yüklenene kadar bekle
    
    // Hemen kontrol et - eğer zaten yüklendiyse direkt geç
    const store = useAuthStore.getState();
    if (store.user !== null || store.accessToken !== null) {
      // En az biri yüklendiyse hydration başlamış demektir
      setIsHydrated(true);
      return;
    }

    // Store değişikliklerini dinle - hydration tamamlandığında user/accessToken set edilecek
    const unsubscribe = useAuthStore.subscribe((state) => {
      // Eğer user veya accessToken yüklendiyse hydration tamamlanmıştır
      if (state.user !== null || state.accessToken !== null) {
        setIsHydrated(true);
      }
    });

    // Fallback: Eğer 1 saniye içinde hydration tamamlanmazsa yine de devam et
    const timeout = setTimeout(() => {
      setIsHydrated(true);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      if (typeof window !== "undefined") {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
      }
    };

    syncTheme();

    if (typeof window === "undefined") return;

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Debug: Log user role
  useEffect(() => {
    if (isHydrated && user && capabilities) {
      console.log('🔍 Analytics Page - Roles:', capabilities.roles, 'Pro Plan:', pro, 'AccessToken:', !!accessToken);
    }
  }, [user, capabilities, pro, isHydrated, accessToken]);

  useEffect(() => {
    if (!isHydrated || !user || !capabilities) {
      return;
    }

    async function fetchAnalytics() {
      try {
        setLoading(true);
        
        // 🔒 KRİTİK: Auth token kontrolü
        if (!accessToken) {
          const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
          if (!tokenFromStorage) {
            console.error('[Analytics] No access token - redirecting to login');
            useAuthStore.getState().clearAuth();
            router.push('/login');
            return;
          }
        }
        
        console.log('[Analytics] 🔄 Fetching analytics data...', { 
          hasToken: !!accessToken,
          dateRange,
          userId: user?.id 
        });
        
        // 401: logout yapma; sadece reject et (auth sadece interceptor'da yönetilir, hesap-özel logout önlenir)
        const handle401 = (err: any) => {
          if (err?.response?.status === 401) {
            console.warn('[Analytics] Unauthorized - auth interceptor handles logout if needed');
            throw err;
          }
          return err;
        };
        
        const [visitsRes, wordsRes, usersRes, eventsRes, colorPaletteRes, topPerformingRes, saveAnalyticsRes, sourceRes, comparisonRes, lowEngagementRes] = await Promise.all([
          api.get(`/analytics/visits?range=${dateRange}`).catch(handle401),
          api.get("/analytics/words").catch(handle401),
          api.get("/analytics/top-users?range=7d").catch(handle401),
          api.get("/analytics/event-stats").catch(handle401),
          api.get("/analytics/color-palette").catch(() => ({ data: [] })), // Renk paleti yoksa boş array
          api.get(`/analytics/top-performing?range=${dateRange}`).catch(() => ({ data: null })),
          api.get(`/analytics/saves?range=${dateRange}`).catch(() => ({ data: null })),
          api.get(`/analytics/sources?range=${dateRange}`).catch(handle401),
          api.get(`/analytics/comparison?range=${dateRange}`).catch(() => ({ data: null })),
          api.get("/analytics/low-engagement").catch(() => ({ data: null })),
        ]);

        // 🔒 KRİTİK: Console log - gerçek data'yı gör
        console.log('[Analytics] ✅ API Response:', {
          visits: visitsRes?.data,
          words: wordsRes?.data,
          users: usersRes?.data,
          events: eventsRes?.data,
        });

        // 🔒 GÜVENLİ ARRAY NORMALİZASYONU - Backend response format'larını handle et
        // Visits: Array veya { visits: [] } formatında gelebilir
        // State set ederken her zaman array olduğundan emin ol
        const safeVisitsForState: VisitData[] = Array.isArray(visitsRes?.data)
          ? visitsRes.data
          : (visitsRes?.data?.visits && Array.isArray(visitsRes.data.visits))
          ? visitsRes.data.visits
          : [];
        setVisits(safeVisitsForState);
        
        // Words: Array veya { words: [] } formatında gelebilir
        const safeWords = Array.isArray(wordsRes?.data)
          ? wordsRes.data
          : (wordsRes?.data?.words && Array.isArray(wordsRes.data.words))
          ? wordsRes.data.words
          : [];
        setWords(safeWords);
        
        // 🚫 Yedek güvenlik katmanı: Kendini listeye dahil etme
        // Users: Array veya { users: [] } formatında gelebilir
        const usersData = Array.isArray(usersRes?.data)
          ? usersRes.data
          : (usersRes?.data?.users && Array.isArray(usersRes.data.users))
          ? usersRes.data.users
          : [];
        const filteredUsers = Array.isArray(usersData)
          ? usersData.filter((u: TopUser) => u.username !== user?.username)
          : [];
        setTopUsers(filteredUsers);
        
        // EventStats: Array veya { events: [] } formatında gelebilir
        const safeEventStats = Array.isArray(eventsRes?.data)
          ? eventsRes.data
          : (eventsRes?.data?.events && Array.isArray(eventsRes.data.events))
          ? eventsRes.data.events
          : [];
        setEventStats(safeEventStats);
        setColorPalette(Array.isArray(colorPaletteRes?.data) ? colorPaletteRes.data : []);
        setTopPerforming(topPerformingRes?.data || null);
        setSaveAnalytics(saveAnalyticsRes?.data || null);
        setSourceDistribution(sourceRes?.data || null);
        setComparison(comparisonRes?.data || null);
        setLowEngagement(lowEngagementRes?.data || null);
        
        console.log('[Analytics] ✅ Data set successfully');
      } catch (err: any) {
        console.error("[Analytics] ❌ Analiz verileri alınamadı:", err);

        toast.error(err.response?.data?.message || "Analiz verileri yüklenemedi");
      } finally {
        // 🔒 KRİTİK: finally bloğu - loading'i GARANTİ kapat
        console.log('[Analytics] 🔒 Setting loading to false');
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [user, capabilities, pro, isHydrated, dateRange, router]);

  // 🎟️ Gerçek zamanlı bilet güncellemeleri için socket bağlantısı
  useEffect(() => {
    if (!user || !accessToken || eventStats.length === 0) {
      return;
    }

    const socket = initSocket(accessToken);

    // Her etkinlik için listener ekle
    const listeners: Array<() => void> = [];
    
    eventStats.forEach((event) => {
      const handler = (ticketData: any) => {
        setEventStats((prev) =>
          prev.map((e) => {
            if (e.id === ticketData.eventId) {
              // Yeni bilet listesinin başına ekle ve son 5'i tut
              const updatedRecentTickets = [
                {
                  username: ticketData.username,
                  fullName: ticketData.fullName,
                  avatar: ticketData.avatar,
                  createdAt: ticketData.createdAt,
                },
                ...e.recentTickets,
              ].slice(0, 5);

              return {
                ...e,
                ticketCount: ticketData.ticketCount || e.ticketCount + 1,
                recentTickets: updatedRecentTickets,
              };
            }
            return e;
          })
        );
      };

      socket.on(`ticket_update:${event.id}`, handler);
      listeners.push(() => socket.off(`ticket_update:${event.id}`, handler));
    });

    return () => {
      listeners.forEach((cleanup) => cleanup());
    };
  }, [user, eventStats]);

  // 🏆 Gerçek zamanlı ziyaretçi güncellemeleri için socket bağlantısı
  useEffect(() => {
    if (!user || !accessToken || !user.id) {
      return;
    }

    const socket = initSocket(accessToken);

    // Ziyaretçi güncelleme event'ini dinle
    const handler = async () => {
      try {
        const response = await api.get('/analytics/top-users?range=7d');
        const visitorsData = response?.data;
        const safeVisitorsData = Array.isArray(visitorsData)
          ? visitorsData
          : visitorsData?.users ?? [];
        const filteredVisitors = safeVisitorsData.filter(
          (v: TopUser) => v.username !== user?.username
        );
        setTopUsers(filteredVisitors);
      } catch {
        // İlk yüklenen güvenilir listeyi koru.
      }
    };

    socket.on(`visitor:update:${user.id}`, handler);

    return () => {
      socket.off(`visitor:update:${user.id}`, handler);
    };
  }, [user, user?.id]);

  // 🔥 KRİTİK: Token yoksa veya geçersizse login'e yönlendir - HOOK'LAR ÖNCE!
  useEffect(() => {
    if (!accessToken) {
      const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!tokenFromStorage) {
        router.push('/login');
      }
    }
  }, [accessToken, router]);

  // 🔒 GÜVENLİ VISITS NORMALİZASYONU - useMemo ile optimize et
  // ⚠️ ÖNEMLİ: Hook'lar conditional return'lerden ÖNCE çağrılmalı (Rules of Hooks)
  // Backend ne dönerse dönsün, UI asla patlamaz
  const safeVisits = useMemo((): VisitData[] => {
    // Array ise direkt döndür
    if (Array.isArray(visits)) return visits;
    
    // Backend { visits: [] } formatında dönebilir
    const visitsObj = visits as any;
    if (visitsObj?.visits && Array.isArray(visitsObj.visits)) {
      return visitsObj.visits;
    }
    
    // Hiçbiri değilse boş array döndür
    return [];
  }, [visits]);
  
  // 🔒 İlk render crash'ini tamamen kapat - guard
  // Eğer safeVisits hala array değilse (çok nadir edge case), boş array kullan
  const finalSafeVisits = Array.isArray(safeVisits) ? safeVisits : [];

  // Wait for hydration before checking role - ÖNEMLİ: Sidebar görünür kalması için min-h-screen KULLANMAYALIM
  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00]" />
      </div>
    );
  }

  // Eğer user yoksa veya capabilities yoksa (hydration tamamlandıktan sonra kontrol)
  if (!user || !capabilities) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Giriş Gerekli
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Bu sayfaya erişmek için lütfen giriş yapın.
          </p>
        </div>
      </div>
    );
  }
  
  if (!accessToken) {
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!tokenFromStorage) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00] mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
          </div>
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF8A00]" />
      </div>
    );
  }

  const isDark = isDarkMode;

  // Chart color constants - Feellink corporate colors
  const chartColorPrimary = "#1E88E5"; // Mavi - ana renk
  const chartAccent = "#FF8A00"; // Turuncu - vurgu rengi

  // Chart configurations
  // 🔒 Tüm .map kullanımlarında finalSafeVisits kullan
  const visitsChartData = {
    labels: finalSafeVisits.map((v: VisitData) => {
      const date = new Date(v.date);
      return date.toLocaleDateString("tr-TR", { month: "short", day: "numeric" });
    }),
    datasets: [
      {
        label: "Etkileşim Sayısı",
        data: finalSafeVisits.map((v: VisitData) => v.count),
        borderColor: chartColorPrimary, // Mavi ana çizgi
        backgroundColor: isDark 
          ? "rgba(30, 136, 229, 0.15)" 
          : "rgba(30, 136, 229, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: chartAccent, // Turuncu noktalar
        pointBorderColor: isDark ? "#1a1a1a" : "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark 
          ? "rgba(26, 26, 26, 0.95)" 
          : "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleColor: isDark ? "#fff" : "#fff",
        bodyColor: isDark ? "#fff" : "#fff",
        borderColor: chartAccent, // Turuncu border
        borderWidth: 1,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDark ? "#9ca3af" : "#6b7280",
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: isDark 
            ? "rgba(255, 255, 255, 0.05)" 
            : "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: isDark ? "#9ca3af" : "#6b7280",
          font: {
            size: 11,
          },
          beginAtZero: true,
        },
      },
    },
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        grid: {
          color: isDark 
            ? "rgba(30, 136, 229, 0.15)" 
            : "rgba(30, 136, 229, 0.1)", // Mavi grid
        },
      },
    },
  };

  const periodLabel =
    dateRange === "today" ? "Bugün" : dateRange === "7d" ? "Son 7 gün" : "Son 30 gün";

  const totalInteractions = finalSafeVisits.reduce((sum, visit) => sum + (Number(visit.count) || 0), 0);
  const peakInteraction = finalSafeVisits.reduce(
    (max, visit) => Math.max(max, Number(visit.count) || 0),
    0
  );
  const totalTickets = eventStats.reduce((sum, event) => sum + (Number(event.ticketCount) || 0), 0);
  const totalComments = eventStats.reduce((sum, event) => sum + (Number(event.commentCount) || 0), 0);
  const activeVisitorsCount = Array.isArray(topUsers) ? topUsers.length : 0;
  const totalSaves = saveAnalytics?.totalSaves ?? 0;

  return (
    <div className="w-full px-4 py-6 text-slate-900 dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <section className="relative overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/94 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#101723]/88 dark:shadow-black/30 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(59,130,246,0.13),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.78),transparent_44%)] dark:bg-[radial-gradient(circle_at_8%_0%,rgba(249,115,22,0.22),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(59,130,246,0.17),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_44%)]" />
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/65 to-transparent" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">
                <Sparkles className="h-3.5 w-3.5" />
                İçerik performans laboratuvarı
              </div>
              <h1 className="mt-4 flex items-center gap-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                <TrendingUp className="h-9 w-9 text-brand-orange" />
                Analizlerim
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                İçeriklerin etkileşimini, renk hafızasını, ziyaretçi hareketini ve kaydedilme etkisini tek ekranda takip et.
              </p>
            </div>

            <div className="flex w-full items-center rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-1 shadow-inner shadow-white/60 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-black/20 sm:w-auto">
              {(["today", "7d", "30d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`h-10 flex-1 rounded-[18px] px-4 text-sm font-black transition sm:flex-none ${
                    dateRange === range
                      ? "bg-brand-orange text-white shadow-lg shadow-orange-500/22"
                      : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                >
                  {range === "today" ? "Bugün" : range === "7d" ? "7g" : "30g"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Etkileşim" value={totalInteractions} icon={Activity} tone="blue" />
          <MetricCard label="Zirve Nokta" value={peakInteraction} icon={BarChart3} tone="orange" />
          <MetricCard label="7 Günlük Ziyaretçi" value={activeVisitorsCount} icon={Users} tone="green" />
          <MetricCard label="Kaydedilme" value={totalSaves} icon={Bookmark} tone="slate" />
          <MetricCard label="Bilet" value={totalTickets} icon={Ticket} tone="blue" />
          <MetricCard label="Yorum" value={totalComments} icon={MessageCircle} tone="orange" />
        </div>

        <BlurGuard isPro={pro}>
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AnalyticsCard
              title="Etkileşim Trendi"
              subtitle={`${periodLabel} boyunca gelen etkileşimlerin yumuşak hareketi.`}
              icon={Activity}
              accent="blue"
              className="lg:col-span-2"
            >
              <div className="h-[320px] rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-950/25">
                <Line data={visitsChartData} options={lineChartOptions} />
              </div>
              {comparison && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.045]">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    {comparison.likes.change > 0 ? "Yükseliş" : comparison.likes.change < 0 ? "Düşüş" : "Denge"}:
                    {" "}Beğeni {comparison.likes.change > 0 ? "+" : ""}{comparison.likes.change}% önceki döneme göre.
                  </p>
                </div>
              )}
            </AnalyticsCard>

            <AnalyticsCard
              title="Kelime Haritası"
              subtitle="Paylaşımlarında öne çıkan kavramların yoğunluk çizgisi."
              icon={BarChart3}
            >
              <KeywordsChart data={words} />
            </AnalyticsCard>

            <AnalyticsCard
              title="Son 7 Gün Profil Ziyaretçileri"
              subtitle="Profilini son 7 günde ziyaret eden hesaplar."
              icon={Users}
              accent="blue"
            >
              <div className="space-y-3">
                {!Array.isArray(topUsers) || topUsers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Son 7 günde ziyaretçi yok"
                    description="Yeni profil ziyaretleri burada görünecek."
                  />
                ) : (
                  topUsers.map((visitor, index) => (
                    <Link
                      key={visitor.username}
                      href={`/profile/${visitor.username}`}
                      className={analyticsSubPanelClass}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-sm font-black text-orange-700 dark:text-orange-200">
                          {index + 1}
                        </div>
                        <img
                          src={resolveAvatarUrl(visitor.avatar)}
                          alt={visitor.username}
                          className="h-11 w-11 rounded-2xl border border-slate-200 object-cover dark:border-white/10"
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = DEFAULT_ANALYTICS_AVATAR;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                            {visitor.fullName || visitor.username}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">@{visitor.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-blue-600 dark:text-blue-300">{visitor.activityCount}</p>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500">ziyaret</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </AnalyticsCard>

            <AnalyticsCard
              title="Etkinlik Özeti"
              subtitle="Bilet satışları ve yorum yoğunluğu için hızlı kontrol."
              icon={CalendarDays}
              accent="green"
            >
              {eventStats.length > 0 ? (
                <div className="space-y-3">
                  {eventStats.slice(0, 3).map((event) => (
                    <div key={event.id} className={analyticsSubPanelClass}>
                      <h4 className="truncate text-sm font-black text-slate-950 dark:text-white">{event.title}</h4>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Bilet</p>
                          <p className="font-black text-blue-600 dark:text-blue-300">{event.ticketCount} / {event.totalCapacity}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Yorum</p>
                          <p className="font-black text-orange-600 dark:text-orange-200">{event.commentCount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Ticket}
                  title="Etkinlik verisi bekleniyor"
                  description="Etkinlik ve bilet hareketi başladığında burada net bir özet oluşacak."
                />
              )}
            </AnalyticsCard>

            {user?.id && <ColorMatchesCard userId={user.id} />}

            <AnalyticsCard
              title="Renk Yakınlıkları"
              subtitle="Paletine en yakın kullanıcılar ve ortak renk ipuçları."
              icon={Palette}
            >
              {isLoadingColorMatches ? (
                <div className="flex min-h-[220px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-brand-orange" />
                </div>
              ) : colorMatchesError ? (
                <EmptyState
                  icon={Palette}
                  title="Renk eşleşmeleri yüklenemedi"
                  description="Bu bölüm daha sonra yeniden denenebilir; diğer analizler etkilenmez."
                />
              ) : !colorMatches || colorMatches.length === 0 ? (
                <EmptyState
                  icon={Palette}
                  title="Yeterli renk verisi yok"
                  description="Renk paleti oluşan eserler arttıkça benzer profiller burada görünecek."
                />
              ) : (
                <div className="space-y-3">
                  {Array.isArray(colorMatches) && colorMatches.map((match: any) => (
                    <div key={match.userId} className={analyticsSubPanelClass}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={resolveAvatarUrl(match.avatar)}
                            alt={match.username}
                            className="h-11 w-11 rounded-2xl border border-slate-200 object-cover dark:border-white/10"
                            onError={(event) => {
                              (event.target as HTMLImageElement).src = DEFAULT_ANALYTICS_AVATAR;
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">@{match.username}</p>
                            {match.commonColors && match.commonColors.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {match.commonColors.slice(0, 4).map((color: string, index: number) => (
                                  <span
                                    key={`${color}-${index}`}
                                    className="h-4 w-4 rounded-full border border-white shadow-sm"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-black text-blue-600 dark:text-blue-300">%{match.similarity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnalyticsCard>

            {topPerforming && (
              <AnalyticsCard
                title="Bu Dönemin Öne Çıkanları"
                subtitle="En çok iz bırakan içeriklerini hızlıca gör."
                icon={Award}
              >
                <div className="space-y-3">
                  {[
                    { item: topPerforming.mostViewed, label: "En çok görüntülenen", icon: Eye },
                    { item: topPerforming.mostCommented, label: "En çok yorum alan", icon: MessageCircle },
                    { item: topPerforming.mostSaved, label: "En çok kaydedilen", icon: Bookmark },
                  ].map(({ item, label, icon: ItemIcon }) => item && (
                    <div key={label} className={analyticsSubPanelClass}>
                      <div className="flex items-center gap-3">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.title} className="h-16 w-16 rounded-2xl object-cover" />
                        ) : (
                          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-200">
                            <ItemIcon className="h-5 w-5" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.title}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AnalyticsCard>
            )}

            {saveAnalytics && (
              <AnalyticsCard
                title="Kaydedilme Etkisi"
                subtitle="İçeriklerinin uzun vadeli etkisini gösterir."
                icon={Bookmark}
                accent="blue"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className={analyticsSubPanelClass}>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-300">{saveAnalytics.totalSaves}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Toplam kaydedilme</p>
                  </div>
                  <div className={analyticsSubPanelClass}>
                    <p className="text-3xl font-black text-orange-600 dark:text-orange-200">%{saveAnalytics.saveRate}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Kaydetme oranı</p>
                  </div>
                </div>
                {saveAnalytics.mostSaved && (
                  <div className={`mt-3 ${analyticsSubPanelClass}`}>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">En çok kaydedilen</p>
                    <div className="mt-3 flex items-center gap-3">
                      {saveAnalytics.mostSaved.thumbnail && (
                        <img src={saveAnalytics.mostSaved.thumbnail} alt={saveAnalytics.mostSaved.title} className="h-12 w-12 rounded-2xl object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950 dark:text-white">{saveAnalytics.mostSaved.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{saveAnalytics.mostSaved.saves} kaydetme</p>
                      </div>
                    </div>
                  </div>
                )}
              </AnalyticsCard>
            )}

            {sourceDistribution && (
              <AnalyticsCard
                title="Keşfet Kaynak Dağılımı"
                subtitle="Kitleye hangi kapıdan ulaştığını gösterir."
                icon={Compass}
                accent="green"
              >
                <div className="space-y-4">
                  {[
                    { key: "explore", label: "Keşfet", color: "bg-blue-500" },
                    { key: "profile", label: "Profil", color: "bg-brand-orange" },
                    { key: "home", label: "Ana Sayfa", color: "bg-slate-500" },
                  ].map((source) => {
                    const value = Number(sourceDistribution?.[source.key] ?? 0);
                    return (
                      <div key={source.key}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{source.label}</span>
                          <span className="font-black text-slate-950 dark:text-white">%{value}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-200 dark:bg-white/10">
                          <div className={`h-2.5 rounded-full ${source.color}`} style={{ width: `${Math.min(100, value)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AnalyticsCard>
            )}

            {lowEngagement && lowEngagement.hasWarning && (
              <div className="lg:col-span-2 rounded-[24px] border border-amber-300/30 bg-amber-50/90 p-4 text-sm font-bold text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                Son 14 günde daha az etkileşim alan {lowEngagement.count} içerik var. Küçük bir başlık ya da görsel yenileme iyi çalışabilir.
              </div>
            )}

            {(() => {
              const colorCount: Record<string, number> = {};
              const postsWithColors = (posts || []).filter((post: any) => post.colorPalette && Array.isArray(post.colorPalette) && post.colorPalette.length > 0);

              postsWithColors.forEach((post: any) => {
                post.colorPalette.forEach((hex: string) => {
                  if (hex && typeof hex === "string") {
                    colorCount[hex] = (colorCount[hex] || 0) + 1;
                  }
                });
              });

              if (Object.keys(colorCount).length === 0 && colorPalette.length > 0) {
                colorPalette.forEach((item) => {
                  if (item.hex) {
                    colorCount[item.hex] = (colorCount[item.hex] || 0) + (item.frequency || 1);
                  }
                });
              }

              const totalColorUsages = Object.values(colorCount).reduce((sum, count) => sum + count, 0);
              const topColors = Object.entries(colorCount)
                .map(([color, count]) => ({
                  color,
                  count,
                  percent: totalColorUsages > 0 ? (count / totalColorUsages) * 100 : 0,
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 12);

              return (
                <AnalyticsCard
                  title="Renk Analizi"
                  subtitle="Eserlerinde tekrar eden paletleri ve ağırlıklarını gösterir."
                  icon={Palette}
                  accent="blue"
                >
                  {topColors.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {topColors.map((colorItem) => (
                        <div key={colorItem.color} className="rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.045]">
                          <div
                            className="h-14 rounded-xl shadow-inner"
                            style={{ backgroundColor: colorItem.color }}
                            title={colorItem.color}
                          />
                          <p className="mt-2 text-xs font-black text-slate-900 dark:text-white">{Math.round(colorItem.percent)}%</p>
                          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-500">{colorItem.color}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Palette}
                      title="Renk analizi için veri yok"
                      description="Renk paleti çıkarılan eserlerin arttıkça bu alan kendini dolduracak."
                    />
                  )}
                </AnalyticsCard>
              );
            })()}
          </div>

          <AnalyticsCard
            title="Etkinlik Katılım Analizi"
            subtitle="Bilet hareketleri, son katılımcılar ve canlı satış grafikleri."
            icon={Ticket}
            className="mt-6"
          >
            {Array.isArray(eventStats) && eventStats.length > 0 ? (
              <div className="space-y-3">
                {eventStats.map((event) => (
                  <div
                    key={event.id}
                    className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/72 dark:border-white/10 dark:bg-white/[0.045]"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenEvent(openEvent === event.id ? null : event.id)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-950 dark:text-white">{event.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-bold text-slate-600 dark:text-slate-400">
                            <span className="text-blue-600 dark:text-blue-300">{event.ticketCount}</span> / {event.totalCapacity} bilet
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                            <MessageCircle className="h-4 w-4" />
                            {event.commentCount} yorum
                          </span>
                        </div>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-brand-orange dark:border-white/10 dark:bg-slate-950/35">
                        {openEvent === event.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </span>
                    </button>

                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openEvent === event.id ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                      <div className="border-t border-slate-200/80 p-4 dark:border-white/10">
                        {event.recentTickets.length > 0 ? (
                          <div>
                            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Son alınan biletler</p>
                            <div className="space-y-2">
                              {event.recentTickets.map((ticket, index) => (
                                <div key={`${ticket.username}-${index}`} className={analyticsSubPanelClass}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      {ticket.avatar ? (
                                        <img
                                          src={resolveAvatarUrl(ticket.avatar)}
                                          alt={ticket.username}
                                          className="h-9 w-9 rounded-2xl object-cover"
                                          onError={(event) => {
                                            (event.target as HTMLImageElement).src = DEFAULT_ANALYTICS_AVATAR;
                                          }}
                                        />
                                      ) : (
                                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-500/10 text-xs font-black text-orange-700 dark:text-orange-200">
                                          {ticket.username.charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="truncate text-sm font-black text-slate-950 dark:text-white">{ticket.fullName || ticket.username}</span>
                                    </div>
                                    <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                                      {new Date(ticket.createdAt).toLocaleTimeString("tr-TR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "2-digit",
                                        month: "short",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                            Henüz bu etkinlik için bilet satışı gerçekleşmemiş.
                          </p>
                        )}

                        <TicketChart eventId={event.id} initialTicketCount={event.ticketCount} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Ticket}
                title="Etkinlik analizi henüz boş"
                description="Etkinlik oluşturulduğunda bilet satışları ve katılımcı hareketleri burada takip edilecek."
              />
            )}
          </AnalyticsCard>

          {Array.isArray(eventStats) && eventStats.length > 0 && (
            <div className="mt-6">
              <TopEventsChart
                events={eventStats.map((event) => ({
                  id: event.id,
                  title: event.title,
                  ticketCount: event.ticketCount,
                }))}
              />
            </div>
          )}
        </BlurGuard>
      </div>
    </div>
  );
}
