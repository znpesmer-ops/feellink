"use client";
import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock3,
  ImageIcon,
  Layers3,
  Palette,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UserCircle2,
  Users,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import CreateCollectionModal from "@/components/collections/CreateCollectionModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { ProRoleBadge } from "@/components/ProRoleBadge";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import toast from "react-hot-toast";

interface Collection {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  createdAt: string;
  owner?: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatar: string | null;
    roles: string[] | null;
  };
}

type FilterType = "Tümü" | "Kurumsal" | "Sanatçı" | "Popüler" | "Yeni" | "Koleksiyonlarım";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [myCollections, setMyCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalCollectionId, setDeleteModalCollectionId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("Tümü");
  const { user, capabilities, accessToken } = useAuthStore();

  // Rol bazlı kontrol: sadece corporate ve collector koleksiyon oluşturabilir
  const roles = capabilities?.roles ?? user?.roles ?? [];
  const canCreateCollection = roles.includes("corporate") || roles.includes("collector");
  const ownerCount = new Set(collections.map((collection) => collection.owner?.id).filter(Boolean)).size;
  const latestCollection = [...collections].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  const filterOptions = [
    { label: "Tümü" as FilterType, icon: Layers3, count: collections.length },
    {
      label: "Kurumsal" as FilterType,
      icon: Building2,
      count: collections.filter((col) => col.owner?.roles?.includes("corporate")).length,
    },
    {
      label: "Sanatçı" as FilterType,
      icon: Palette,
      count: collections.filter((col) => col.owner?.roles?.includes("artist")).length,
    },
    { label: "Popüler" as FilterType, icon: Star, count: collections.length },
    { label: "Yeni" as FilterType, icon: Clock3, count: collections.length },
    ...(canCreateCollection
      ? [{ label: "Koleksiyonlarım" as FilterType, icon: UserCircle2, count: myCollections.length }]
      : []),
  ];

  useEffect(() => {
    async function fetchCollections() {
      try {
        setLoading(true);
        console.log("🔄 Koleksiyonlar yükleniyor...");
        
        // Public endpoint - token gerektirmez
        const publicRes = await api.get<Collection[]>("/collections/public").catch((err) => {
          console.warn("⚠️ Public collections yüklenemedi:", err);
          return { data: [] };
        });
        
        // My collections - sadece token varsa ve yetki varsa
        const myRes = accessToken && canCreateCollection 
          ? await api.get<Collection[]>("/collections/my").catch((err) => {
              console.warn("⚠️ My collections yüklenemedi:", err);
              return { data: [] };
            })
          : Promise.resolve({ data: [] });
        
        const [myCollectionsData] = await Promise.all([myRes]);
        
        console.log("✅ Public collections:", publicRes.data);
        console.log("✅ My collections:", myCollectionsData.data);
        setCollections(publicRes.data || []);
        setMyCollections(myCollectionsData.data || []);
        setFilteredCollections(publicRes.data || []);
      } catch (error: any) {
        console.error("❌ Koleksiyonlar alınamadı:", error);
        console.error("Error response:", error?.response?.data);
        console.error("Error status:", error?.response?.status);
        // Hata durumunda boş array göster ama loading'i false yap
        setCollections([]);
        setMyCollections([]);
        setFilteredCollections([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCollections();
  }, [accessToken, canCreateCollection]);

  // Filtreleme mantığı
  useEffect(() => {
    let filtered: Collection[] = [];

    switch (activeFilter) {
      case "Koleksiyonlarım":
        filtered = myCollections;
        break;
      case "Kurumsal":
        filtered = collections.filter(
          (col) => col.owner?.roles && Array.isArray(col.owner.roles) && col.owner.roles.includes("corporate")
        );
        break;
      case "Sanatçı":
        filtered = collections.filter(
          (col) => col.owner?.roles && Array.isArray(col.owner.roles) && col.owner.roles.includes("artist")
        );
        break;
      case "Popüler":
        // Şimdilik en yeni olanları göster (ileride beğeni/yorum sayısına göre sıralanabilir)
        filtered = [...collections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "Yeni":
        filtered = [...collections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        filtered = collections;
    }

    setFilteredCollections(filtered);
  }, [activeFilter, collections, myCollections]);

  const handleRefresh = async () => {
    try {
      const [publicRes, myRes] = await Promise.all([
        api.get<Collection[]>("/collections/public"),
        accessToken && canCreateCollection ? api.get<Collection[]>("/collections/my") : Promise.resolve({ data: [] as Collection[] }),
      ]);
      setCollections(publicRes.data || []);
      setMyCollections((myRes?.data) || []);
      setFilteredCollections(publicRes.data || []);
    } catch (error) {
      console.error("Koleksiyonlar alınamadı:", error);
    }
  };

  const isOwnerOf = (col: Collection) => user?.id && col.owner?.id === user.id;
  const getOwnerName = (col: Collection) => col.owner?.fullName || col.owner?.username || "Bilinmeyen";
  const getOwnerInitial = (col: Collection) => getOwnerName(col).trim().charAt(0).toUpperCase() || "F";
  const formatMonth = (date: string) =>
    new Date(date).toLocaleDateString("tr-TR", {
      month: "short",
      year: "numeric",
    });
  const formatFullDate = (date: string) =>
    new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const handleDeleteCollection = async () => {
    const id = deleteModalCollectionId;
    if (!id) return;
    try {
      setDeleting(true);
      await api.delete(`/collections/${id}`);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      setMyCollections((prev) => prev.filter((c) => c.id !== id));
      setFilteredCollections((prev) => prev.filter((c) => c.id !== id));
      toast.success("Koleksiyon silindi");
      setDeleteModalCollectionId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Koleksiyon silinemedi. Lütfen tekrar deneyin.");
    } finally {
      setDeleting(false);
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <div className="w-full px-6 py-8">
        <div className="mx-auto max-w-[1180px] space-y-6">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#ff8a2a]/20 blur-3xl" />
            <div className="absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-[#3f7cff]/10 blur-3xl" />
            <div className="h-5 w-36 animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-5 h-10 w-72 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded-full bg-slate-200/80 dark:bg-white/10" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-[24px] border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/[0.045]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 md:py-8">
      <div className="mx-auto max-w-[1180px] text-gray-900 transition-all duration-300 dark:text-gray-100">
        <section className="relative mb-7 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/92 p-5 text-slate-950 shadow-[0_28px_100px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111722]/92 dark:text-white dark:shadow-[0_28px_100px_rgba(0,0,0,0.34)] sm:p-7">
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ff8a2a]/24 blur-3xl dark:bg-[#ff8a2a]/18" />
            <div className="absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-[#4c7dff]/16 blur-3xl dark:bg-[#437bff]/12" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a2a]/70 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff8a2a]/30 bg-[#ff8a2a]/14 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#c65d14] dark:text-[#ffb06a]">
                <Sparkles className="h-3.5 w-3.5" />
                Feellink koleksiyon alanı
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                Koleksiyonlar
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Topluluğun seçkilerini, kurum vitrinlerini ve sanatçı derlemelerini tek bir sakin
                galeri akışında keşfedin.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 p-1 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
                <div className="px-3 py-2">
                  <p className="text-base font-bold text-slate-950 dark:text-white">{collections.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Toplam
                  </p>
                </div>
                <div className="border-x border-slate-200/80 px-3 py-2 dark:border-white/10">
                  <p className="text-base font-bold text-slate-950 dark:text-white">{ownerCount}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Küratör
                  </p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-base font-bold text-slate-950 dark:text-white">{filteredCollections.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Görünen
                  </p>
                </div>
              </div>

              {canCreateCollection && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff8a2a] to-[#ff6b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(255,123,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(255,123,0,0.34)]"
                >
                  <Plus className="h-4 w-4" />
                  Koleksiyon Oluştur
                </button>
              )}
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-3">
            {latestCollection && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5 text-[#ff8a2a]" />
                Son eklenen: {formatFullDate(latestCollection.createdAt)}
              </div>
            )}
            {canCreateCollection && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
                <Users className="h-3.5 w-3.5 text-[#4c7dff]" />
                Kendi koleksiyonların: {myCollections.length}
              </div>
            )}
          </div>
        </section>

        <div className="mb-7 overflow-x-auto pb-1">
          <div className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-black/10 bg-white/70 p-1 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            {filterOptions.map((filter) => {
              const FilterIcon = filter.icon;
              const isActive = activeFilter === filter.label;
              return (
                <button
                  key={filter.label}
                  onClick={() => setActiveFilter(filter.label)}
                  className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#ff8a2a] to-[#ff6b2a] text-white shadow-[0_12px_28px_rgba(255,123,0,0.26)]"
                      : "text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
                  }`}
                >
                  <FilterIcon className="h-4 w-4" />
                  <span>{filter.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? "bg-white/18 text-white"
                        : "bg-black/[0.05] text-slate-500 dark:bg-white/[0.08] dark:text-slate-400"
                    }`}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Koleksiyon Grid */}
        {filteredCollections.length === 0 ? (
          <div className="relative overflow-hidden rounded-[28px] border border-dashed border-black/15 bg-white/55 px-6 py-20 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-white/14 dark:bg-white/[0.035]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff8a2a]/10 blur-3xl" />
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ff8a2a]/25 bg-[#ff8a2a]/10 text-[#ff8a2a] shadow-[0_18px_50px_rgba(255,123,0,0.14)]">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="relative text-xl font-bold text-slate-900 dark:text-white">
              {activeFilter === "Koleksiyonlarım" ? "Kişisel koleksiyon alanın boş" : "Henüz koleksiyon bulunmuyor"}
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {activeFilter === "Koleksiyonlarım"
                ? "İlk koleksiyonunu oluşturduğunda eserlerini düzenli bir vitrine dönüştürebilirsin."
                : activeFilter !== "Tümü"
                ? "Bu filtrede henüz bir seçki yok. Diğer filtrelere göz atabilir veya yeni bir koleksiyon başlatabilirsin."
                : "Topluluk koleksiyonları burada görünecek. İlk seçki için zarif bir başlangıç yapabilirsin."}
            </p>
            {canCreateCollection && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff8a2a] to-[#ff6b2a] px-5 py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(255,123,0,0.24)] transition hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Koleksiyon Oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.id}`}
                className="group relative overflow-hidden rounded-[26px] border border-black/10 bg-white/78 shadow-[0_20px_60px_rgba(15,23,42,0.10)] transition-all duration-500 hover:-translate-y-1 hover:border-[#ff8a2a]/35 hover:shadow-[0_28px_80px_rgba(255,123,0,0.16)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
              >
                <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a2a]/80 to-transparent" />
                  <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[#ff8a2a]/18 blur-3xl" />
                </div>

                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
                  {col.coverImage ? (
                    <img
                      src={resolveImageUrl(col.coverImage)}
                      alt={col.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_28%_20%,rgba(255,138,42,0.28),transparent_34%),linear-gradient(135deg,rgba(21,28,42,0.98),rgba(10,13,23,0.98))]">
                      <ImageIcon className="h-12 w-12 text-[#ff8a2a]/55" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/12 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/34 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-xl">
                    <Layers3 className="h-3.5 w-3.5 text-[#ffb36a]" />
                    Koleksiyon
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="line-clamp-2 text-2xl font-black tracking-tight text-white">
                      {col.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-white/65">{formatMonth(col.createdAt)}</p>
                  </div>
                  {isOwnerOf(col) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteModalCollectionId(col.id);
                      }}
                      className="absolute right-4 top-4 z-20 rounded-full border border-white/14 bg-black/40 p-2 text-white shadow-lg backdrop-blur-xl transition-colors hover:bg-red-500"
                      title="Koleksiyonu sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="relative z-20 flex min-h-[168px] flex-col gap-4 p-4">
                  <p className={`text-sm leading-6 text-slate-500 dark:text-slate-400 ${col.description ? "line-clamp-2" : ""}`}>
                    {col.description || "Bu koleksiyon için açıklama henüz eklenmedi."}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-black/[0.025] p-3 dark:border-white/8 dark:bg-white/[0.045]">
                    <div className="flex min-w-0 items-center gap-3">
                      {col.owner?.avatar ? (
                        <img
                          src={resolveImageUrl(col.owner.avatar)}
                          alt={col.owner.username || "Kullanıcı"}
                          className="h-10 w-10 rounded-full border border-white/30 object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ff8a2a]/20 bg-[#ff8a2a]/12 text-sm font-bold text-[#ff8a2a]">
                          {getOwnerInitial(col)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {getOwnerName(col)}
                          </p>
                          <ProRoleBadge roles={col.owner?.roles ?? []} plan={undefined} />
                        </div>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-500">
                          @{col.owner?.username || "bilinmeyen"}
                        </p>
                      </div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff8a2a]/12 text-[#ff8a2a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Yeni Koleksiyon Modal */}
        {canCreateCollection && (
          <CreateCollectionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={handleRefresh}
          />
        )}

        {/* Koleksiyon silme onay modal */}
        <DeleteConfirmModal
          open={deleteModalCollectionId !== null}
          onClose={() => !deleting && setDeleteModalCollectionId(null)}
          onConfirm={handleDeleteCollection}
          title="Koleksiyonu sil"
          message="Bu koleksiyon kalıcı olarak silinecek. Koleksiyon içindeki içerikler platformdan kaldırılmaz."
          confirmText="Koleksiyonu Sil"
          cancelText="İptal"
          loading={deleting}
        />
      </div>
    </div>
  );
}
