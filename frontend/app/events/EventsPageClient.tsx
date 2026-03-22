"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Ticket, Loader2, Edit3, Eye, Trash2, Users } from "lucide-react";
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

    const roles = capabilities.roles || user.roles || [];
    const plan = capabilities.plan || user.plan || "FREE";
    const primaryRole = roles[0] || "art_lover";

    // Sanatçı Pro: Sınırsız - direkt aç
    if (primaryRole === "artist" && plan === "PRO") {
      setShowCreateModal(true);
      return;
    }

    // Diğer roller için limit kontrolü
    const now = new Date();
    let canCreate = true;
    let errorMessage = "";

    // Sanatsever Free: 6 ayda 1
    if (primaryRole === "art_lover" && plan === "FREE") {
      if (myEvents.length > 0) {
        const sortedEvents = [...myEvents].sort(
          (a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        );
        const lastEvent = sortedEvents[0];
        if (lastEvent && lastEvent.createdAt) {
          const lastEventDate = new Date(lastEvent.createdAt);
          const yearDiff = now.getFullYear() - lastEventDate.getFullYear();
          const monthDiff = now.getMonth() - lastEventDate.getMonth();
          const totalMonths = yearDiff * 12 + monthDiff;
          if (totalMonths < 6) {
            canCreate = false;
            errorMessage = `6 ayda bir etkinlik oluşturabilirsiniz. Son etkinliğinizden ${6 - totalMonths} ay sonra tekrar deneyebilirsiniz.`;
          }
        }
      }
    }
    // Kurumsal Free: Ayda 30
    else if (primaryRole === "corporate" && plan === "FREE") {
      const thisMonthEvents = myEvents.filter((e) => {
        if (!e.createdAt) return false;
        const eventDate = new Date(e.createdAt);
        return (
          eventDate.getFullYear() === now.getFullYear() &&
          eventDate.getMonth() === now.getMonth()
        );
      });
      if (thisMonthEvents.length >= 30) {
        canCreate = false;
        errorMessage = "Bu ay 30 etkinlik oluşturma limitinize ulaştınız. Gelecek ay tekrar deneyebilirsiniz.";
      }
    }
    // Koleksiyoner Free ve Sanatçı Free: Ayda 5
    else if ((primaryRole === "collector" || primaryRole === "artist") && plan === "FREE") {
      const thisMonthEvents = myEvents.filter((e) => {
        if (!e.createdAt) return false;
        const eventDate = new Date(e.createdAt);
        return (
          eventDate.getFullYear() === now.getFullYear() &&
          eventDate.getMonth() === now.getMonth()
        );
      });
      if (thisMonthEvents.length >= 5) {
        canCreate = false;
        errorMessage = "Bu ay 5 etkinlik oluşturma limitinize ulaştınız. Gelecek ay tekrar deneyebilirsiniz.";
      }
    }

    if (canCreate) {
      setShowCreateModal(true);
    } else {
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] py-16">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-6 pt-6">
      {/* Orta içerik */}
      <div className="w-full xl:mr-[420px]">
        {/* Başlık ve Buton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-brand-orange">
            Etkinlikler
          </h1>
          {user && (
            <button
              onClick={handleCreateClick}
              className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange/90 text-white font-medium transition shadow-md whitespace-nowrap ml-auto md:ml-0"
            >
              + Etkinlik Oluştur
            </button>
          )}
        </div>

        {fetchError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          >
            {fetchError}
          </div>
        )}

        {/* TAB BAR */}
        <div className="flex gap-4 md:gap-6 border-b border-gray-200 dark:border-gray-700 pb-3 mb-6 overflow-x-auto">
          <button
            className={`text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "all"
              ? "text-brand-orange border-b-2 border-brand-orange pb-3 -mb-3"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            onClick={() => navigateTab("all")}
          >
            Etkinlikler
          </button>
          {user && (
            <>
              <button
                className={`text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "mine"
                  ? "text-brand-orange border-b-2 border-brand-orange pb-3 -mb-3"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                onClick={() => navigateTab("mine")}
              >
                Etkinliklerim
              </button>
              <button
                className={`text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "requested"
                  ? "text-brand-orange border-b-2 border-brand-orange pb-3 -mb-3"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                onClick={() => navigateTab("requested")}
              >
                Talep Oluşturduklarım
              </button>
              <button
                className={`text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "approved"
                  ? "text-brand-orange border-b-2 border-brand-orange pb-3 -mb-3"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                onClick={() => navigateTab("approved")}
              >
                Onaylanan Etkinlikler
              </button>
            </>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-gray-200/80 dark:border-gray-700/60 bg-gray-50/80 dark:bg-[#141414]/80 px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <p className="max-w-3xl">
            Ücretli etkinliklerde katılım, ücret ve süreç detayları etkinlik sahibi tarafından paylaşılır. Başvuru sonrası gerekli bilgilendirmeler size doğrudan iletilir.
          </p>
        </div>

        {/* Filtre Çubuğu - Sadece "Etkinlikler" sekmesinde göster */}
        {activeTab === "all" && filtered.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { key: "all", label: "Tümü" },
              { key: "upcoming", label: "Yaklaşan" },
              { key: "past", label: "Geçmiş" },
              { key: "free", label: "Ücretsiz" },
              { key: "paid", label: "Ücretli" },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => applyFilter(btn.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filter === btn.key
                  ? "bg-brand-orange text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 hover:text-brand-orange"
                  }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center mt-20 text-gray-500 dark:text-gray-400 text-lg">
            {fetchError
              ? "Etkinlikler şu an gösterilemiyor."
              : activeTab === "all"
                ? events.length === 0 && filter === "all"
                  ? "Henüz etkinlik bulunmuyor."
                  : "Filtreye uygun etkinlik bulunamadı."
                : activeTab === "mine"
                  ? "Henüz etkinlik oluşturmadınız."
                  : activeTab === "requested"
                    ? "Henüz talep oluşturduğun bir etkinlik yok."
                    : activeTab === "approved"
                      ? "Henüz onaylanan bir etkinliğin bulunmuyor."
                      : "Etkinlik bulunamadı."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {(filtered ?? []).map((ev) => {
              // "Etkinliklerim" sekmesinde düzenleme/silme butonları göster
              if (activeTab === "mine") {
                return (
                  <div
                    key={ev.id}
                    className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all w-full"
                    style={{ maxWidth: 'none' }}
                  >
                    <div className="h-[200px] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <img
                        src={ev.coverImage ? resolveImageUrl(ev.coverImage) : "/placeholder.png"}
                        alt={ev.title}
                        className="w-full h-full object-cover rounded-t-2xl"
                      />
                    </div>

                    <div className="p-4 px-5 pb-5">
                      {/* Başlık & Etkinlik Sahibi */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
                          {ev.title}
                        </h2>
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
                                className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png';
                                }}
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-brand-orange/20 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-semibold text-brand-orange">
                                  {(ev.owner.fullName || ev.owner.username)?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium hidden sm:inline">
                              {ev.owner.fullName || ev.owner.username}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                        {ev.description || "Açıklama bulunmuyor."}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <Calendar size={14} />
                        {new Date(ev.date).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <Users size={14} /> {participantLine(ev)}
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <button
                          onClick={() => window.location.href = `/events/${ev.id}`}
                          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-brand-orange transition-colors text-sm"
                        >
                          <Eye size={16} /> Gör
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-brand-orange transition-colors text-sm">
                          <Edit3 size={16} /> Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteClick(ev.id)}
                          className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors text-sm"
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
                  className="bg-white dark:bg-[#1a1a1a]/70 border border-gray-200 dark:border-gray-700/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group no-underline hover:no-underline w-full"
                  style={{ maxWidth: 'none' }}
                >
                  <div className="h-[200px] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <img
                      src={ev.coverImage ? resolveImageUrl(ev.coverImage) : "/placeholder.png"}
                      alt={ev.title}
                      className="w-full h-full object-cover rounded-t-2xl group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="p-4 px-5 pb-5 flex flex-col justify-between min-h-[160px]">
                    <div>
                      {/* Başlık & Etkinlik Sahibi */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
                          {ev.title}
                        </h2>
                        {ev.owner && (
                          <div
                            onClick={(e) => {
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
                                className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/avatar-placeholder.png';
                                }}
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-brand-orange/20 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-semibold text-brand-orange">
                                  {(ev.owner.fullName || ev.owner.username)?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium hidden sm:inline">
                              {ev.owner.fullName || ev.owner.username}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                        {ev.description || "Açıklama bulunmuyor."}
                      </p>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <Calendar size={14} />
                        {new Date(ev.date).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <Users size={14} /> {participantLine(ev)}
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
                              <span className="text-sm text-gray-500 dark:text-gray-400 cursor-default select-none flex items-center gap-1">
                                <Ticket size={14} /> Kontenjan doldu
                              </span>
                            );
                          }

                          return (
                            <span className="text-sm text-brand-orange cursor-default select-none flex items-center gap-1">
                              <Ticket size={14} /> {talepOlusturLabel(ev)}
                            </span>
                          );
                        })()}
                        {user?.id === ev.ownerId && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Senin etkinliğin
                          </span>
                        )}
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
