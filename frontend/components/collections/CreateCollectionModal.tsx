"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Image, Loader2, Sparkles, Upload, X } from "lucide-react";
import api from "@/lib/api";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCollectionModal({ isOpen, onClose, onCreated }: CreateCollectionModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const previewUrl = useMemo(() => (coverImage ? URL.createObjectURL(coverImage) : null), [coverImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCoverImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Koleksiyon başlığı gerekli.");
      return;
    }

    setLoading(true);
    try {
      let coverUrl = null;

      if (coverImage) {
        const formData = new FormData();
        formData.append("file", coverImage);
        const upload = await api.post("/media/upload?type=image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        coverUrl = upload.data.url;
      }

      console.log("🔄 Koleksiyon oluşturuluyor:", { title, description, coverImage: coverUrl });
      const response = await api.post("/collections", {
        title,
        description,
        coverImage: coverUrl,
      });
      console.log("✅ Koleksiyon oluşturuldu:", response.data);

      onCreated(); // Refresh list
      onClose(); // Close modal
      setTitle("");
      setDescription("");
      setCoverImage(null);
    } catch (err: any) {
      console.error("❌ Koleksiyon oluşturulamadı:", err);
      console.error("Error response:", err?.response?.data);
      console.error("Error status:", err?.response?.status);
      const errorMessage = err?.response?.data?.message || "Bir hata oluştu.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-xl transition-all">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-white/12 bg-white/92 shadow-[0_34px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl dark:bg-[#111722]/96">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#ff8a2a]/20 blur-3xl" />
          <div className="absolute -bottom-28 left-0 h-64 w-64 rounded-full bg-[#4c7dff]/13 blur-3xl" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a2a]/80 to-transparent" />
        </div>

        <button
          onClick={() => !loading && onClose()}
          disabled={loading}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/75 text-slate-500 shadow-sm transition hover:border-[#ff8a2a]/35 hover:text-[#ff8a2a] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300"
          aria-label="Kapat"
        >
          <X size={22} />
        </button>

        <div className="relative p-6 sm:p-7">
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ff8a2a]/24 bg-[#ff8a2a]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#c76517] dark:text-[#ffb06a]">
              <Sparkles className="h-3.5 w-3.5" />
              Yeni seçki
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Koleksiyon oluştur
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Eserleri tek bir kürasyon altında toplayacak başlığı, açıklamayı ve kapak atmosferini belirle.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Kapak Görseli
              </label>
              <label className="group relative block aspect-[16/9] cursor-pointer overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-slate-100 transition hover:border-[#ff8a2a]/55 dark:border-white/12 dark:bg-white/[0.045]">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Kapak önizlemesi"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_30%_20%,rgba(255,138,42,0.20),transparent_34%),radial-gradient(circle_at_70%_80%,rgba(76,125,255,0.12),transparent_30%)] text-slate-500 dark:text-slate-400">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff8a2a]/20 bg-[#ff8a2a]/10 text-[#ff8a2a]">
                      <Image className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Kapak görseli seç</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">JPG, PNG veya WebP</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl border border-white/16 bg-black/38 px-3 py-2 text-xs font-semibold text-white opacity-95 backdrop-blur-xl">
                  <span className="line-clamp-1">{coverImage ? coverImage.name : "Kürasyon kapağı"}</span>
                  <span className="inline-flex items-center gap-1 text-[#ffb36a]">
                    <Upload className="h-3.5 w-3.5" />
                    Yükle
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Başlık *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white/78 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#ff8a2a]/65 focus:ring-4 focus:ring-[#ff8a2a]/12 dark:border-white/10 dark:bg-white/[0.065] dark:text-white dark:placeholder:text-slate-500"
                placeholder="Koleksiyon başlığı..."
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-28 w-full resize-none rounded-2xl border border-slate-300 bg-white/78 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#ff8a2a]/65 focus:ring-4 focus:ring-[#ff8a2a]/12 dark:border-white/10 dark:bg-white/[0.065] dark:text-white dark:placeholder:text-slate-500"
                placeholder="Bu koleksiyonun içeriği hakkında kısa bilgi..."
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => !loading && onClose()}
                disabled={loading}
                className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-300 dark:hover:text-white"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff8a2a] to-[#ff6b2a] px-6 py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(255,123,0,0.24)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:from-white/10 dark:disabled:to-white/10 dark:disabled:text-slate-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
