"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import RightSidebar from "@/components/right-sidebar";
import CreateEventModal from "@/components/events/CreateEventModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import toast from "react-hot-toast";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { formatTry } from "@/lib/formatCurrency";

interface Event {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  date: string;
  participantCount: number;
  approvedParticipantsCount?: number;
  capacity?: number | null;
  maxParticipants?: number | null;
  tickets?: { price: number }[];
  price?: number;
  isFree?: boolean;
  location?: string;
  createdAt?: string;
  ownerId?: string;
  owner?: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
  };
  participants?: {
    userId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  }[];
}

function getApprovedCount(ev: Event): number {
  return ev.approvedParticipantsCount ?? ev.participantCount ?? 0;
}

function getCapacity(ev: Event): number | null {
  const c = ev.capacity ?? ev.maxParticipants;
  if (c == null || c <= 0) return null;
  return c;
}

function participantLine(ev: Event): string {
  const a = getApprovedCount(ev);
  const cap = getCapacity(ev);
  if (cap != null) return `Katılımcı: ${a}/${cap}`;
  return `${a} · Sınırsız`;
}

function isEventFull(ev: Event): boolean {
  const cap = getCapacity(ev);
  if (cap == null) return false;
  return getApprovedCount(ev) >= cap;
}

function talepOlusturLabel(ev: Event): string {
  if (!ev.isFree && ev.price != null && ev.price > 0) {
    const p = formatTry(ev.price);
    return p ? `Talep Oluştur (${p})` : "Talep Oluştur";
  }
  return "Talep Oluştur";
}

function formatEventDate(date: string): string {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEventTime(date: string): string {
  return new Date(date).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOwnerName(ev: Event): string {
  return ev.owner?.fullName || ev.owner?.username || "Feellink";
}

function getOwnerInitial(ev: Event): string {
  return getOwnerName(ev).charAt(0).toUpperCase() || "F";
}

function getPriceLabel(ev: Event): string {
  if (ev.isFree || !ev.price || ev.price <= 0) return "Ücretsiz";
  return formatTry(ev.price) || "Ücretli";
}

export type EventsTab = "all" | "mine" | "requested" | "approved";

function resolveTabForUser(tab: EventsTab, hasUser: boolean): EventsTab {
  if (!hasUser && (tab === "mine" || tab === "requested" || tab === "approved")) return "all";
  return tab;
}

interface EventsPageClientProps {
  initialTab: EventsTab;
}

export default function EventsPageClient({ initialTab }: EventsPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EventsTab>(initialTab);
  const [events, setEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const { user, capabilities } = useAuthStore();

  useEffect(() => {
    setActiveTab(resolveTabForUser(initialTab, !!user));
  }, [initialTab, user]);

  const navigateTab = (tab: EventsTab) => {
    const resolved = resolveTabForUser(tab, !!user);
    setActiveTab(resolved);
    if (resolved === "all") {
      router.replace("/events", { scroll: false });
    } else {
      router.replace(`/events?tab=${resolved}`, { scroll: false });
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      setLoading(true);
      setFetchError(null);

      const normalizeList = (data: any): any[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.events && Array.isArray(data.events)) return data.events;
        if (data.data && Array.isArray(data.data)) return data.data;
        return [];
      };

      try {
        if (user) {
          const [allRes, myRes] = await Promise.all([
            api.get("/events/all").catch((e: any) => (e?.response?.status === 404 || e?.code === "ERR_NETWORK" ? api.get("/events") : Promise.reject(e))),
            api.get("/events/my").catch(() => ({ data: [] })),
          ]);
          if (cancelled) return;
          const safeEventsData = normalizeList(allRes?.data);
          const safeMyEventsData = normalizeList(myRes?.data);
          setEvents(safeEventsData);
          setFiltered(safeEventsData);
          setMyEvents(safeMyEventsData);
        } else {
          let res: { data: any };
          try {
            res = await api.get("/events/all");
          } catch (allErr: any) {
            if (allErr?.response?.status === 404 || allErr?.code === "ERR_NETWORK") {
              res = await api.get("/events");
            } else {
              throw allErr;
            }
          }
          if (cancelled) return;
          const safeEventsData = normalizeList(res?.data);
          setEvents(safeEventsData);
          setFiltered(safeEventsData);
        }
      } catch (err: any) {
        console.error("Etkinlikler alınamadı:", err);
        if (cancelled) return;

        setEvents([]);
        setFiltered([]);
        setMyEvents([]);
        setFetchError("Etkinlikler yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.");

        if (err?.code === "ERR_NETWORK" || err?.message?.includes("Network Error")) {
          toast.error("Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.");
        } else if (err?.response?.status === 401) {
          // 401: sessiz; interceptor / giriş akışı yönetir
        } else if (err?.response?.status && err?.response?.status >= 500) {
          // Sunucu hatası: kullanıcıya band + boş liste
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Tab değiştiğinde filtreyi uygula
  useEffect(() => {
    if (activeTab === "all") {
      // 🔒 "Tümü" sekmesinde filtreyi bypass et - tüm eventleri göster
      setFiltered(events);
      setFilter("all");
    } else if (activeTab === "mine") {
      setFiltered(myEvents);
    } else if (activeTab === "requested" && user) {
      // Talep oluşturduğum etkinlikler (PENDING)
      const requestedEvents = events.filter((e) =>
        user?.id && e.participants?.some(
          (p) => p.userId === user.id && p.status === "PENDING"
        )
      );
      setFiltered(requestedEvents);
    } else if (activeTab === "approved" && user) {
      // Onaylanan etkinlikler (APPROVED)
      const approvedEvents = events.filter((e) =>
        user?.id && e.participants?.some(
          (p) => p.userId === user.id && p.status === "APPROVED"
        )
      );
      setFiltered(approvedEvents);
    }
  }, [activeTab, events, myEvents, user]);

  const applyFilter = (type: string) => {
    setFilter(type);
    const now = new Date();
    const sourceData = activeTab === "all" ? events : myEvents;

    // 🔒 PROFESYONEL FİLTRELEME - "Tümü" filtresinde filtreyi bypass et
    if (type === "all") {
      setFiltered(sourceData);
      return;
    }

    let filteredData = [...sourceData];

    if (type === "upcoming") filteredData = sourceData.filter(e => new Date(e.date) >= now);
    if (type === "past") filteredData = sourceData.filter(e => new Date(e.date) < now);
    if (type === "free") filteredData = sourceData.filter(e => e.isFree || e.price === 0 || !e.price);
    if (type === "paid") filteredData = sourceData.filter(e => !e.isFree && e.price && e.price > 0);

    setFiltered(filteredData);
  };

  const handleDeleteClick = (id: string) => {
    setEventToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      await api.delete(`/events/${eventToDelete}`);
      setMyEvents(myEvents.filter((e) => e.id !== eventToDelete));
      toast.success("Etkinlik başarıyla silindi.");
      setEventToDelete(null);
    } catch (error) {
      console.error("Silme hatası:", error);
      toast.error("Etkinlik silinemedi.");
    }
  };

  const handleCreateClick = () => {
    if (!user || !capabilities) {
      toast.error("Kullanıcı bilgileri yükleniyor...");
      return;
    }
    if (!capabilities.permissions?.canCreateEvents) {
      toast.error("Bu hesap tipi ile etkinlik oluşturamazsınız.");
      return;
    }
    setShowCreateModal(true);
  };

  const now = new Date();
  const upcomingCount = events.filter((event) => new Date(event.date) >= now).length;
  const freeCount = events.filter((event) => event.isFree || event.price === 0 || !event.price).length;
  const approvedCount = user
    ? events.filter((event) =>
        event.participants?.some((participant) => participant.userId === user.id && participant.status === "APPROVED")
      ).length
    : 0;
  const tabOptions = [
    { key: "all" as EventsTab, label: "Etkinlikler", icon: CalendarDays, count: events.length },
    ...(user
      ? [
          { key: "mine" as EventsTab, label: "Etkinliklerim", icon: Sparkles, count: myEvents.length },
          {
            key: "requested" as EventsTab,
            label: "Taleplerim",
            icon: Clock3,
            count: events.filter((event) =>
              event.participants?.some((participant) => participant.userId === user.id && participant.status === "PENDING")
            ).length,
          },
          { key: "approved" as EventsTab, label: "Onaylanan", icon: CheckCircle2, count: approvedCount },
        ]
      : []),
  ];
  const eventFilterOptions = [
    { key: "all", label: "Tümü", icon: CalendarDays, count: events.length },
    { key: "upcoming", label: "Yaklaşan", icon: Clock3, count: upcomingCount },
    { key: "past", label: "Geçmiş", icon: Calendar, count: events.length - upcomingCount },
    { key: "free", label: "Ücretsiz", icon: Ticket, count: freeCount },
    { key: "paid", label: "Ücretli", icon: Ticket, count: events.length - freeCount },
  ];
  const emptyTitle = fetchError
    ? "Etkinlikler şu an gösterilemiyor"
    : activeTab === "all"
    ? events.length === 0 && filter === "all"
      ? "Henüz etkinlik bulunmuyor"
      : "Filtreye uygun etkinlik bulunamadı"
    : activeTab === "mine"
    ? "Henüz etkinlik oluşturmadınız"
    : activeTab === "requested"
    ? "Henüz talep oluşturduğun bir etkinlik yok"
    : activeTab === "approved"
    ? "Henüz onaylanan etkinliğin bulunmuyor"
    : "Etkinlik bulunamadı";
  const emptyDescription = fetchError
    ? "Bağlantınızı kontrol edip sayfayı yenileyin."
    : activeTab === "all"
    ? "Kurumlar ve yaratıcı ekipler yeni etkinlik yayınladığında burada premium bir vitrin halinde görünecek."
    : "Bu alan seçtiğin sekmeye göre otomatik güncellenecek.";

  if (loading) {
    return (
      <div className="w-full max-w-[1280px] mx-auto px-6 pt-6">
        <div className="w-full xl:mr-[420px]">
          <div className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/88 p-7 text-slate-900 shadow-[0_28px_100px_rgba(15,23,42,0.10)] dark:border-white/[0.12] dark:bg-[rgba(12,18,30,0.94)] dark:text-white dark:shadow-[0_28px_100px_rgba(0,0,0,0.42)]">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-orange/20 blur-3xl" />
            <div className="absolute -bottom-24 left-16 h-64 w-64 rounded-full bg-brand-blue/12 blur-3xl" />
            <div className="relative flex items-center gap-3 text-slate-900 dark:text-white">
              <Loader2 className="h-5 w-5 animate-spin text-brand-orange" />
              <span className="text-sm font-semibold">Etkinlikler hazırlanıyor...</span>
            </div>
            <div className="relative mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-64 animate-pulse rounded-[24px] bg-white/[0.06]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 pt-6 sm:px-6">
      {/* Orta içerik */}
      <div className="w-full xl:mr-[420px]">
        <section className="relative mb-7 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/90 p-5 text-slate-950 shadow-[0_28px_100px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[linear-gradient(135deg,rgba(6,10,18,0.98)_0%,rgba(14,21,34,0.94)_50%,rgba(76,36,13,0.76)_100%)] dark:text-white dark:shadow-[0_28px_100px_rgba(0,0,0,0.44)] sm:p-7">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-orange/18 blur-3xl dark:bg-brand-orange/24" />
            <div className="absolute -bottom-24 left-8 h-72 w-72 rounded-full bg-brand-blue/12 blur-3xl dark:bg-indigo-500/14" />
            <div className="absolute inset-0 hidden bg-[linear-gradient(115deg,rgba(255,255,255,0.08),transparent_36%,rgba(248,139,37,0.075)_100%)] dark:block" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/70 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/14 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffb06a]">
                <Sparkles className="h-3.5 w-3.5" />
                Feellink etkinlik sahnesi
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                Etkinlikler
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Sergi, buluşma, atölye ve özel davetleri tek bir şık akışta keşfet.
                Katılım taleplerini ve kendi etkinliklerini aynı yerden yönet.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1 text-center dark:border-white/[0.12] dark:bg-[rgba(2,6,14,0.52)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_38px_rgba(0,0,0,0.22)]">
                <div className="px-3 py-2">
                  <p className="text-base font-bold text-slate-950 dark:text-white">{events.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-orange-100/65">Yayında</p>
                </div>
                <div className="border-x border-white/10 px-3 py-2">
                  <p className="text-base font-bold text-slate-950 dark:text-white">{upcomingCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-orange-100/60">Yaklaşan</p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-base font-bold text-slate-950 dark:text-white">{myEvents.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-orange-100/60">Benim</p>
                </div>
              </div>

              {user && (
                <button
                  onClick={handleCreateClick}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-orange to-[#ff6b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(255,123,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(255,123,0,0.34)]"
                >
                  <Plus className="h-4 w-4" />
                  Etkinlik Oluştur
                </button>
              )}
            </div>
          </div>
        </section>

        {fetchError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-amber-300/45 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100"
          >
            {fetchError}
          </div>
        )}

        <div className="mb-5 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/86 p-1 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            {tabOptions.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-brand-orange to-[#ff6b2a] text-white shadow-[0_12px_28px_rgba(255,123,0,0.26)]"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
                  }`}
                  onClick={() => navigateTab(tab.key)}
                >
                  <TabIcon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? "bg-white/18 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/[0.08] dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/78 px-4 py-3 text-xs leading-relaxed text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-400 sm:text-sm">
          <p className="max-w-3xl">
            Ücretli etkinliklerde katılım, ücret ve süreç detayları etkinlik sahibi tarafından paylaşılır. Başvuru sonrası gerekli bilgilendirmeler size doğrudan iletilir.
          </p>
        </div>

        {/* Filtre Çubuğu - Sadece "Etkinlikler" sekmesinde göster */}
        {activeTab === "all" && filtered.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {eventFilterOptions.map((btn) => {
              const FilterIcon = btn.icon;
              return (
              <button
                key={btn.key}
                onClick={() => applyFilter(btn.key)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${filter === btn.key
                  ? "bg-brand-orange text-white shadow-[0_12px_28px_rgba(255,123,0,0.22)]"
                  : "border border-slate-200/80 bg-white/86 text-slate-600 hover:border-brand-orange/35 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-400 dark:hover:text-white"
                  }`}
              >
                <FilterIcon className="h-4 w-4" />
                {btn.label}
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{btn.count}</span>
              </button>
            )})}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="relative mt-8 overflow-hidden rounded-[28px] border border-dashed border-slate-300/80 bg-white/78 px-6 py-20 text-center shadow-[0_18px_70px_rgba(15,23,42,0.07)] dark:border-white/14 dark:bg-white/[0.035]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange/10 blur-3xl" />
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-orange/25 bg-brand-orange/10 text-brand-orange shadow-[0_18px_50px_rgba(255,123,0,0.14)]">
              <CalendarDays className="h-8 w-8" />
            </div>
            <h2 className="relative text-xl font-bold text-slate-950 dark:text-white">{emptyTitle}</h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">{emptyDescription}</p>
            {user && activeTab === "mine" && (
              <button
                onClick={handleCreateClick}
                className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-orange to-[#ff6b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(255,123,0,0.24)] transition hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Etkinlik Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {(filtered ?? []).map((ev) => {
              // "Etkinliklerim" sekmesinde düzenleme/silme butonları göster
              if (activeTab === "mine") {
                return (
                  <div
                    key={ev.id}
                    className="group relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/88 shadow-[0_24px_70px_rgba(15,23,42,0.10)] transition-all duration-500 hover:-translate-y-1 hover:border-brand-orange/35 hover:shadow-[0_28px_80px_rgba(255,123,0,0.14)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                      <img
                        src={ev.coverImage ? resolveImageUrl(ev.coverImage) : "/placeholder.png"}
                        alt={ev.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent" />
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/34 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-xl">
                        <CalendarDays className="h-3.5 w-3.5 text-[#ffb36a]" />
                        {new Date(ev.date) >= now ? "Yaklaşan" : "Geçmiş"}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="line-clamp-2 text-2xl font-black tracking-tight text-white">{ev.title}</h2>
                        <p className="mt-1 text-xs font-semibold text-white/70">{formatEventDate(ev.date)} · {formatEventTime(ev.date)}</p>
                      </div>
                    </div>

                    <div className="flex min-h-[220px] flex-col gap-4 p-4">
                      {/* Başlık & Etkinlik Sahibi */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="rounded-full border border-brand-orange/20 bg-brand-orange/10 px-3 py-1 text-xs font-bold text-brand-orange">
                          {getPriceLabel(ev)}
                        </p>
                        {ev.owner && (
                          <div
                            onClick={() => router.push(`/profile/${ev.owner?.username || ''}`)}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-shrink-0 cursor-pointer"
                          >
                            {/* Avatar logic kept same */}
                            {ev.owner.avatar ? (
                              <img
                                src={resolveImageUrl(ev.owner.avatar)}
                                alt={ev.owner.username}
                                className="w-6 h-6 rounded-full object-cover border border-white/20"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png';
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-brand-orange/20 flex items-center justify-center border border-white/10">
                                <span className="text-[10px] font-semibold text-brand-orange">
                                  {getOwnerInitial(ev)}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-slate-600 font-medium hidden dark:text-slate-300 sm:inline">
                              {getOwnerName(ev)}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 dark:text-slate-400">
                        {ev.description || "Açıklama bulunmuyor."}
                      </p>

                      <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
                          <MapPin size={14} className="text-brand-orange" />
                          <span className="truncate">{ev.location || "Konum belirtilmedi"}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
                          <Users size={14} className="text-brand-blue" />
                          <span>{participantLine(ev)}</span>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <button
                          onClick={() => window.location.href = `/events/${ev.id}`}
                          className="flex items-center gap-1 rounded-xl bg-slate-100/80 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-orange dark:bg-white/[0.06] dark:text-slate-300"
                        >
                          <Eye size={16} /> Gör
                        </button>
                        <button className="flex items-center gap-1 rounded-xl bg-slate-100/80 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-orange dark:bg-white/[0.06] dark:text-slate-300">
                          <Edit3 size={16} /> Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteClick(ev.id)}
                          className="flex items-center gap-1 rounded-xl bg-slate-100/80 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-red-500 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:text-red-400"
                        >
                          <Trash2 size={16} /> Sil
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // "Etkinlikler" sekmesinde bilet alma butonu göster
              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="group relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/88 shadow-[0_24px_70px_rgba(15,23,42,0.10)] transition-all duration-500 hover:-translate-y-1 hover:border-brand-orange/35 hover:shadow-[0_28px_80px_rgba(255,123,0,0.14)] no-underline hover:no-underline dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                    <img
                      src={ev.coverImage ? resolveImageUrl(ev.coverImage) : "/placeholder.png"}
                      alt={ev.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/20 to-transparent" />
                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/34 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-xl">
                      <CalendarDays className="h-3.5 w-3.5 text-[#ffb36a]" />
                      {new Date(ev.date) >= now ? "Yaklaşan" : "Geçmiş"}
                    </div>
                    <div className="absolute right-4 top-4 rounded-full border border-white/18 bg-black/34 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-xl">
                      {getPriceLabel(ev)}
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="line-clamp-2 text-2xl font-black tracking-tight text-white">{ev.title}</h2>
                      <p className="mt-1 text-xs font-semibold text-white/70">{formatEventDate(ev.date)} · {formatEventTime(ev.date)}</p>
                    </div>
                  </div>

                  <div className="flex min-h-[220px] flex-col justify-between gap-4 p-4">
                    <div>
                      {/* Başlık & Etkinlik Sahibi */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <p className="rounded-full border border-slate-200/80 bg-white/72 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/8 dark:bg-white/[0.035] dark:text-slate-300">
                          {participantLine(ev)}
                        </p>
                        {ev.owner && (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (ev.owner) router.push(`/profile/${ev.owner.username}`);
                            }}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity flex-shrink-0 cursor-pointer"
                          >
                            {/* Avatar logic same as above */}
                            {ev.owner.avatar ? (
                              <img
                                src={resolveImageUrl(ev.owner.avatar)}
                                alt={ev.owner.username}
                                className="w-6 h-6 rounded-full object-cover border border-white/20"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png';
                                }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-brand-orange/20 flex items-center justify-center border border-white/10">
                                <span className="text-[10px] font-semibold text-brand-orange">
                                  {getOwnerInitial(ev)}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-slate-600 font-medium hidden dark:text-slate-300 sm:inline">
                              {getOwnerName(ev)}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 dark:text-slate-400">
                        {ev.description || "Açıklama bulunmuyor."}
                      </p>
                    </div>

                    <div className="mt-auto">
                      <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
                          <MapPin size={14} className="text-brand-orange" />
                          <span className="truncate">{ev.location || "Konum belirtilmedi"}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        {/* Feed'de fiyat gösterilmiyor - sadeleştirme */}
                        {/* Sadece başkalarının etkinliklerinde "Talep Oluştur" etiketi göster (tıklanamaz) */}
                        {user?.id !== ev.ownerId && (() => {
                          // Onaylanan Etkinlikler sekmesinde hiç gösterme
                          if (activeTab === "approved") {
                            return null;
                          }

                          // Diğer sekmelerde bilgilendirici etiket (tıklanamaz)
                          const isApproved = user?.id && ev.participants?.some(
                            (p) => p.userId === user.id && p.status === "APPROVED"
                          );

                          if (isApproved) {
                            return null; // Onaylanmış etkinliklerde gösterme
                          }

                          if (isEventFull(ev)) {
                            return (
                              <span className="text-sm text-slate-500 cursor-default select-none flex items-center gap-1 dark:text-slate-400">
                                <Ticket size={14} /> Kontenjan doldu
                              </span>
                            );
                          }

                          return (
                            <span className="text-sm text-brand-orange cursor-default select-none flex items-center gap-1 font-semibold">
                              <Ticket size={14} /> {talepOlusturLabel(ev)}
                            </span>
                          );
                        })()}
                        {user?.id === ev.ownerId && (
                          <span className="text-xs text-slate-500 italic dark:text-slate-400">
                            Senin etkinliğin
                          </span>
                        )}
                        <span className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/12 text-brand-orange transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Sağ sidebar */}
      <RightSidebar />

      {/* Etkinlik Oluşturma Modal */}
      {user && (
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            // Etkinlik listesini yenile
            try {
              const res = await api.get("/events/my");

              // 🔒 GÜVENLİ VERİ NORMALİZASYONU
              const safeMyEventsData = (() => {
                if (!res.data) return [];
                if (Array.isArray(res.data)) return res.data;
                if (res.data.events && Array.isArray(res.data.events)) return res.data.events;
                if (res.data.data && Array.isArray(res.data.data)) return res.data.data;
                return [];
              })();

              setMyEvents(safeMyEventsData);
            } catch (error: any) {
              console.error("Etkinlikler alınamadı:", error);
              // 500 hatası durumunda sessizce devam et
              if (error?.response?.status !== 500) {
                toast.error("Etkinlikler yenilenemedi.");
              }
            }
          }}
        />
      )}

      {/* Silme Onay Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEventToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Etkinliği Silmek Üzeresiniz"
        message="Bu etkinliği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
      />
    </div>
  );
}
