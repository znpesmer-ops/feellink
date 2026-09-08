"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Palette, Loader2, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { FeellinkRoleBadge } from "@/components/FeellinkRoleBadge";

interface ColorMatch {
  user: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
    isVerified?: boolean;
    roles?: string[];
  };
  ortakRenkSayisi: number;
  ortakRenkler: string[];
  matchScore: number;
  similarityPercentage: number;
}

interface ColorMatchesCardProps {
  userId: string;
}

export function ColorMatchesCard({ userId }: ColorMatchesCardProps) {
  const router = useRouter();

  const { data: matches, isLoading } = useQuery<ColorMatch[]>({
    queryKey: ["color-matches", userId],
    queryFn: async () => {
      const response = await api.get(`/posts/color-matches/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  const { data: paletteData } = useQuery({
    queryKey: ["color-palette", userId],
    queryFn: async () => {
      const response = await api.get(`/posts/color-palette/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111824]/84">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff7b00]" />
        </div>
      </div>
    );
  }

  const userPalette = paletteData?.palette || [];
  const colorMatches = matches || [];

  if (colorMatches.length === 0 && userPalette.length === 0) {
    return null; // Renk analizi yapılmamış eserler varsa kartı gösterme
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#111824]/84 dark:shadow-black/24 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.12),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.10),transparent_30%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(249,115,22,0.18),transparent_34%),radial-gradient(circle_at_94%_12%,rgba(59,130,246,0.14),transparent_30%)]" />
      <div className="relative flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-300/30 bg-orange-500/10 text-orange-600 dark:text-orange-200">
          <Palette className="w-5 h-5 text-[#ff7b00]" />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">
            Renk Eşleşmeleri
          </h3>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
            Seninle benzer renk paleti kullanan sanatçılar
          </p>
        </div>
      </div>

      {/* Kullanıcının Renk Paleti */}
      {userPalette.length > 0 && (
        <div className="relative mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 dark:border-white/10 dark:bg-white/[0.045]">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Senin Renk Paletin
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {userPalette.slice(0, 10).map((color: string, index: number) => (
              <div
                key={index}
                className="h-12 w-12 rounded-2xl border-2 border-white shadow-[0_10px_26px_rgba(15,23,42,0.14)] dark:border-white/10"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Renk Eşleşmeleri Listesi */}
      {colorMatches.length > 0 ? (
        <div className="relative space-y-3">
          {colorMatches.slice(0, 5).map((match) => (
            <div
              key={match.user.id}
              className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 text-slate-800 transition hover:border-orange-300/45 hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-200 dark:hover:border-orange-300/30 dark:hover:bg-white/[0.07]"
              onClick={() => router.push(`/profile/${match.user.username}`)}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Profil Bilgisi */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={resolveImageUrl(match.user.avatar) || "/images/avatar-placeholder.png"}
                    alt={match.user.username}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-white/10 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/avatar-placeholder.png";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-950 dark:text-white truncate">
                        {match.user.fullName || match.user.username}
                      </p>
                      <FeellinkRoleBadge
                        roles={match.user.roles}
                        className="!ml-0 !text-[10px] !px-1.5 !py-0"
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      @{match.user.username}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-black text-orange-600 dark:text-orange-200">
                        Uyum Skoru: %{match.similarityPercentage}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {match.ortakRenkSayisi} ortak renk
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ortak Renk Paleti */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {match.ortakRenkler.map((color, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded-xl shadow-sm border border-white dark:border-white/10"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {match.ortakRenkler.length === 0 && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10" />
                  )}
                </div>

                {/* External Link Icon */}
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#ff7b00] transition-colors flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative text-center py-8">
          <Palette className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Henüz benzer renk paleti kullanan sanatçı bulunamadı.
          </p>
        </div>
      )}
    </div>
  );
}

















