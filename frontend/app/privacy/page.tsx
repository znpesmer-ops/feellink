'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Scale, ShieldCheck, Sparkles } from 'lucide-react'
import {
  kvkkSections,
  legalContactEmail,
  legalQuickSummary,
  legalUpdatedAt,
  termsSections,
  type LegalSection,
} from '@/lib/legal-content'

function LegalBlock({ section }: { section: LegalSection }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/75 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.045]">
      <h3 className="text-lg font-bold text-slate-950 dark:text-white">{section.title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-gray-300">
        {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {section.items && (
          <ul className="space-y-2">
            {section.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff8a1f]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#050711] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,122,0,0.16),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(58,125,255,0.14),transparent_32%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(255,122,0,0.18),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(58,125,255,0.18),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-xl transition hover:border-[#ff8a1f]/40 hover:text-[#ff7a00] dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Kayıt sayfasına dön
        </Link>

        <section className="relative mt-6 overflow-hidden rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a1f]/70 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ff8a1f]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#2f7dff]/12 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              Feellink hukuk alanı
            </span>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  Kullanıcı Sözleşmesi ve KVKK Aydınlatma Metni
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-gray-300">
                  Bu sayfa, Feellink hesabı oluştururken kabul edilen kullanım şartlarını ve 6698
                  sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki aydınlatma metnini tek
                  yerde açıklar. Metin, kullanıcıyı gereksiz hukuk diliyle yormadan Türkiye
                  mevzuatına uygun, şeffaf ve dengeli bir bilgilendirme sunmak için hazırlanmıştır.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ['Güncelleme', legalUpdatedAt],
                  ['İletişim', legalContactEmail],
                  ['Kapsam', 'Türkiye / KVKK'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.045]"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-gray-500">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-[#ff8a1f]" />
                Kısa Özet
              </h2>
              <div className="mt-4 space-y-3">
                {legalQuickSummary.map((item) => (
                  <p
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.035] dark:text-gray-300"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-orange-200 bg-orange-50/80 p-5 text-sm leading-7 text-orange-950 shadow-[0_18px_45px_rgba(255,122,0,0.08)] dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-100">
              Bu metin genel bilgilendirme ve uygulama akışı için hazırlanmıştır. Şirket/marka
              bilgileri, veri sorumlusu bilgileri ve ticari süreçler netleştiğinde son kontrolün
              bir hukuk uzmanı tarafından yapılması önerilir.
            </div>
          </aside>

          <main className="space-y-8">
            <section id="kullanici-sozlesmesi" className="scroll-mt-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-[#ff7a00] dark:border-orange-400/20 dark:bg-orange-400/10">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    Kullanıcı Sözleşmesi
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Platform kullanım şartları ve kullanıcı sorumlulukları.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {termsSections.map((section) => (
                  <LegalBlock key={section.title} section={section} />
                ))}
              </div>
            </section>

            <section id="kvkk" className="scroll-mt-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-[#2f7dff] dark:border-blue-400/20 dark:bg-blue-400/10">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    KVKK Aydınlatma Metni
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Kişisel veri işleme faaliyetleri, hukuki sebepler ve ilgili kişi hakları.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {kvkkSections.map((section) => (
                  <LegalBlock key={section.title} section={section} />
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
