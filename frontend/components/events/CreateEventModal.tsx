"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { CalendarDays, Clock3, Image as ImageIcon, Loader2, MapPin, Ticket, Users, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorKind, getErrorMessage } from "@/lib/api";
import type { AxiosError } from "axios";

function debugEventModal(phase: string, extra?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_API_DEBUG !== "1" || typeof window === "undefined") return;
  console.debug("[CreateEventModal]", phase, extra ?? "");
}
interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

const GENERIC_SAVE_ERROR =
  "Etkinlik kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.";

/** Proxy gövde limiti için; same-origin upload + küçük dosya = stabil */
const MAX_COVER_UPLOAD_BYTES = 4 * 1024 * 1024;

async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 1920;
      let { width, height } = img;
      if (width > maxW) {
        height = Math.round((height * maxW) / width);
        width = maxW;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function CreateEventModal({ isOpen, onClose, onCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [maxParticipantsCap, setMaxParticipantsCap] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGeneration = useRef(0);
  const coverPreviewUrl = useMemo(
    () => (coverImage ? URL.createObjectURL(coverImage) : null),
    [coverImage],
  );

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [coverPreviewUrl]);

  // Modal kapanınca veya yeniden açılınca takılı "Kaydediliyor" kalmasın (parent'ta mount kalıyor)
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      submitGeneration.current += 1;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCoverImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date.trim()) {
      toast.error("Etkinlik adı ve tarihi gerekli.");
      return;
    }

    if (!isFree && (!price || price < 1)) {
      toast.error("Ücretli etkinlik için en az 1 ₺ girmelisiniz.");
      return;
    }

    const capTrim = maxParticipantsCap.trim();
    let capNum: number | undefined;
    if (capTrim !== "") {
      capNum = parseInt(capTrim, 10);
      if (!Number.isFinite(capNum) || capNum < 1) {
        toast.error("Kontenjan boş bırakılabilir veya 1 ve üzeri tam sayı girilmelidir.");
        return;
      }
    }

    const generation = ++submitGeneration.current;
    setIsSubmitting(true);

    try {
      let coverUrl: string | null = null;

      if (coverImage) {
        try {
          let fileToSend = await compressImageForUpload(coverImage);
          if (fileToSend.size > MAX_COVER_UPLOAD_BYTES) {
            toast.error(
              "Kapak görseli hâlâ çok büyük. Lütfen daha küçük bir fotoğraf seçin (yaklaşık 4 MB altı).",
            );
            return;
          }
          debugEventModal("upload:start", { name: fileToSend.name, size: fileToSend.size });
          const formData = new FormData();
          formData.append("file", fileToSend);
          const upload = await api.post("/media/upload?type=image", formData);
          debugEventModal("upload:ok");
          const raw = upload?.data as { url?: string; imageUrl?: string } | undefined;
          coverUrl = (raw?.url ?? raw?.imageUrl ?? "").trim() || null;
          if (!coverUrl) {
            throw new Error("empty_upload_url");
          }
        } catch {
          coverUrl = null;
          toast(
            "Kapak yüklenemedi; etkinlik kapaksız kaydediliyor.",
            { duration: 4000 },
          );
        }
      }

      const dateTime = time ? `${date}T${time}` : `${date}T00:00`;

      const payload: Record<string, unknown> = {
        title: title.trim(),
        date: dateTime,
        isFree: Boolean(isFree),
      };

      if (description.trim()) {
        payload.description = description.trim();
      }
      if (location.trim()) {
        payload.location = location.trim();
      }
      if (coverUrl) {
        payload.coverImage = coverUrl;
      }

      // Ücretsizde price gönderme (null bazı DTO/transform zincirlerinde sorun çıkarabiliyor)
      if (!isFree) {
        const p = Number(price);
        if (Number.isFinite(p) && p >= 1) {
          payload.price = p;
        }
      }

      if (capNum !== undefined) {
        payload.maxParticipants = capNum;
      }

      debugEventModal("create:start", { hasCover: Boolean(coverUrl) });
      const createRes = await api.post("/events", payload);
      debugEventModal("create:ok", { status: createRes.status });
      if (generation !== submitGeneration.current) return;

      if (createRes.status >= 200 && createRes.status < 300) {
        toast.success("Etkinlik oluşturuldu.");

        try {
          await Promise.resolve(onCreated?.());
        } catch (refreshErr) {
          console.error("Etkinlik listesi yenilenemedi:", refreshErr);
          toast.error(
            "Etkinlik oluşturuldu; liste güncellenemedi. Sayfayı yenileyebilirsiniz.",
          );
        }

        try {
          onClose();
        } catch (closeErr) {
          console.error("Modal kapatılırken hata:", closeErr);
        }

        setTitle("");
        setDescription("");
        setDate("");
        setTime("");
        setLocation("");
        setCoverImage(null);
        setIsFree(true);
        setPrice(0);
        setMaxParticipantsCap("");
      } else {
        toast.error(GENERIC_SAVE_ERROR);
      }
    } catch (err: unknown) {
      console.error("Etkinlik oluşturulamadı:", err);
      const ax = err as AxiosError;
      const reqPath = ax.config?.url || "";
      const kind = getApiErrorKind(err);
      let msg = getErrorMessage(err);

      if (reqPath.includes("/media/upload")) {
        if (kind === "payload_too_large") {
          msg = "Kapak görseli çok büyük. Lütfen daha küçük bir görsel seçin.";
        } else if (kind === "auth") {
          msg =
            "Oturum doğrulaması başarısız. Lütfen yeniden giriş yapıp tekrar deneyin.";
        } else if (kind === "network" || kind === "timeout") {
          msg =
            "Kapak yüklenemedi. İnternetinizi kontrol edin; sorun sürerse kapaksız kaydetmek için görseli kaldırıp tekrar deneyin.";
        }
        /* validation/forbidden: getErrorMessage; diğer: yukarıdaki veya getErrorMessage */
      } else if (reqPath.includes("/events") && kind === "validation") {
        if (!msg || msg.length < 3) {
          msg =
            "Etkinlik bilgileri geçersiz. Lütfen alanları kontrol edip tekrar deneyin.";
        }
      } else if (reqPath.includes("/events") && kind === "forbidden") {
        if (!msg || msg.length < 3) {
          msg =
            "Bu hesap türü ile etkinlik oluşturamazsınız veya yetkiniz yok.";
        }
      }

      toast.error(msg && msg.length >= 3 ? msg : GENERIC_SAVE_ERROR);
    } finally {
      if (generation === submitGeneration.current) {
        setIsSubmitting(false);
      }
    }
  };

  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";
  const inputClass =
    "w-full rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#ff8a2a]/60 focus:ring-4 focus:ring-[#ff8a2a]/12 dark:border-white/10 dark:bg-white/[0.075] dark:text-white dark:placeholder:text-slate-500";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-xl transition-all dark:bg-slate-950/72">
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/96 text-slate-950 shadow-[0_34px_120px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#101722]/96 dark:text-white dark:shadow-[0_34px_120px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#ff8a2a]/16 blur-3xl" />
          <div className="absolute -bottom-28 left-10 h-64 w-64 rounded-full bg-[#326cff]/12 blur-3xl" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a2a]/70 to-transparent" />
        </div>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 transition hover:border-[#ff8a2a]/40 hover:bg-[#ff8a2a]/15 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="relative border-b border-slate-200/80 px-6 pb-5 pt-7 dark:border-white/10 sm:px-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ff8a2a]/30 bg-[#ff8a2a]/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#ffb36f]">
            <Ticket className="h-3.5 w-3.5" />
            Yeni etkinlik
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Etkinlik oluştur
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Etkinliğin vitrinini, tarihini ve katılım detaylarını düzenle.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative flex max-h-[calc(92vh-132px)] flex-col gap-5 overflow-y-auto px-6 py-6 sm:px-7">
          <div>
            <label className={labelClass}>
              Kapak Görseli
            </label>
            <label className="group relative flex h-52 cursor-pointer items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-slate-200/80 bg-slate-50/85 transition hover:border-[#ff8a2a]/45 hover:bg-white dark:border-white/16 dark:bg-white/[0.045] dark:hover:bg-white/[0.065]">
              {coverPreviewUrl ? (
                <>
                  <img
                    src={coverPreviewUrl}
                    alt="preview"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/8 to-transparent" />
                  <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xl">
                    {coverImage?.name}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff8a2a]/25 bg-[#ff8a2a]/10 text-[#ff9b43]">
                    <ImageIcon size={24} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kapak yükle</span>
                  <span className="mt-1 text-xs text-slate-500">JPG, PNG veya WebP</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className={labelClass}>
              Etkinlik Adı *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Etkinlik başlığı..."
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                <CalendarDays className="mr-1.5 inline h-3.5 w-3.5 text-[#ff8a2a]" />
                Tarih *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                <Clock3 className="mr-1.5 inline h-3.5 w-3.5 text-[#ff8a2a]" />
                Saat
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-[#ff8a2a]" />
              Konum
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
              placeholder="Etkinlik konumu..."
            />
          </div>

          <div>
            <label className={labelClass}>
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} h-28 resize-none`}
              placeholder="Etkinliğin içeriği hakkında kısa bilgi..."
            ></textarea>
          </div>

          {/* Ücret Bilgisi */}
          <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.045]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-slate-950 dark:text-white">
                Ücret Bilgisi
              </label>
              <input
                type="checkbox"
                checked={!isFree}
                onChange={(e) => {
                  setIsFree(!e.target.checked);
                  if (e.target.checked) {
                    // Ücretli etkinlik seçildi, fiyat alanı görünecek
                  } else {
                    // Ücretsiz etkinlik seçildi, fiyatı sıfırla
                    setPrice(0);
                  }
                }}
                className="h-4 w-4 cursor-pointer accent-[#ff8a2a]"
                id="isPaidCheckbox"
              />
            </div>

            <label htmlFor="isPaidCheckbox" className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-300">
              <Ticket className="h-4 w-4 text-[#ff8a2a]" />
                Ücretli Etkinlik
            </label>

            {!isFree && (
              <div className="mt-4">
                <label className={labelClass}>
                  Etkinlik Ücreti (₺) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={price || ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? 0 : Number(e.target.value);
                    setPrice(value >= 0 ? value : 0);
                  }}
                  className={inputClass}
                  placeholder="Ör: 150"
                  required={!isFree}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Minimum 1 ₺
                </p>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>
              <Users className="mr-1.5 inline h-3.5 w-3.5 text-[#ff8a2a]" />
              Kontenjan (kişi sayısı)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={maxParticipantsCap}
              onChange={(e) => setMaxParticipantsCap(e.target.value.replace(/[^\d]/g, ""))}
              className={inputClass}
              placeholder="Boş bırakılırsa sınırsız"
            />
            <p className="mt-1 text-xs text-slate-500">
              Onaylanan katılımcı sayısı bu üst sınırı aşamaz.
            </p>
          </div>

          <div className="sticky bottom-0 -mx-6 -mb-6 mt-1 border-t border-slate-200/80 bg-white/92 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#101722]/92 sm:-mx-7 sm:px-7">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !title.trim() ||
                !date.trim() ||
                (!isFree && (!price || price < 1))
              }
              className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff8a2a] to-[#ff6b2a] py-3.5 text-sm font-black text-white shadow-[0_18px_48px_rgba(255,123,0,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_rgba(255,123,0,0.36)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Etkinliği Kaydet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
