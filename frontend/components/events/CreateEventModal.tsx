"use client";
import { useState, useEffect, useRef } from "react";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
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

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-[100] transition-all"
    >
      <div 
        className="bg-white dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg p-6 relative border border-gray-200 dark:border-gray-700/40 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-[#ff7b00] transition-colors"
        >
          <X size={22} />
        </button>

        <h2 className="text-2xl font-semibold text-[#ff7b00] mb-4">
          🎟️ Yeni Etkinlik Oluştur
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Kapak Görseli
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center justify-center w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                {coverImage ? (
                  <img
                    src={URL.createObjectURL(coverImage)}
                    alt="preview"
                    className="object-cover w-full h-full rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <ImageIcon size={24} />
                    <span className="text-xs">Yükle</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {coverImage && (
                <span className="text-xs text-gray-500 line-clamp-1 max-w-32">
                  {coverImage.name}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Etkinlik Adı *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Etkinlik başlığı..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Tarih *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Saat
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Konum
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Etkinlik konumu..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Etkinliğin içeriği hakkında kısa bilgi..."
            ></textarea>
          </div>

          {/* Ücret Bilgisi */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
              Ücret Bilgisi
            </label>
            
            <div className="flex items-center gap-3 mb-3">
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
                className="w-4 h-4 accent-[#ff7b00] cursor-pointer"
                id="isPaidCheckbox"
              />
              <label htmlFor="isPaidCheckbox" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                Ücretli Etkinlik
              </label>
            </div>

            {!isFree && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
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
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
                  placeholder="Ör: 150"
                  required={!isFree}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 1 ₺
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
              Kontenjan (kişi sayısı)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={maxParticipantsCap}
              onChange={(e) => setMaxParticipantsCap(e.target.value.replace(/[^\d]/g, ""))}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] dark:bg-gray-800 dark:text-white transition"
              placeholder="Boş bırakılırsa sınırsız"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Onaylanan katılımcı sayısı bu üst sınırı aşamaz.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !title.trim() ||
              !date.trim() ||
              (!isFree && (!price || price < 1))
            }
            className="bg-[#ff7b00] hover:bg-[#e36f00] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-xl mt-3 transition flex justify-center items-center font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Kaydediliyor...
              </>
            ) : (
              "Kaydet"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

