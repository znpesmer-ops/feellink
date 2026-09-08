'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Edit,
  Eye,
  FileText,
  Hourglass,
  Inbox,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCircle2,
  Users,
  XCircle,
} from 'lucide-react'

import api from '@/lib/api'
import { isAdminUser } from '@/lib/admin-utils'
import { useAuthStore } from '@/lib/store'
import { ApplyModal } from '@/components/jobs/ApplyModal'
import { DeleteConfirmModal } from '@/components/jobs/DeleteConfirmModal'
import { JobDetailModal } from '@/components/jobs/JobDetailModal'
import toast from 'react-hot-toast'

interface PublicJobListing {
  id: string
  title: string
  description: string
  company?: string | null
  location?: string | null
  salary?: string | null
  tags: string[]
  createdAt: string
  createdBy?: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
  } | null
}

interface MyJobListing {
  id: string
  title: string
  description: string
  company?: string | null
  location?: string | null
  salary?: string | null
  tags: string[]
  createdAt: string
  _count?: {
    applications?: number
  }
  createdBy?: {
    id: string
    username: string | null
    fullName: string | null
    avatar: string | null
  } | null
}

interface JobApplication {
  id: string
  coverLetter?: string | null
  portfolioUrl?: string | null
  cvUrl?: string | null
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED' | 'INTERVIEW' | 'WAITING'
  createdAt: string
  expiresAt?: string | null // 30 günlük yanıt süresi
  jobListing: {
    id: string
    title: string
    company?: string | null
    location?: string | null
    createdBy: {
      id: string
      username: string | null
      fullName: string | null
      avatar: string | null
    }
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function LoadingPanel({ label = 'Yükleniyor' }: { label?: string }) {
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 p-8 text-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.045] dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/50 to-transparent" />
      <div className="grid gap-5 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-44 animate-pulse rounded-[22px] border border-slate-200/80 bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:border-white/10 dark:from-white/[0.09] dark:via-white/[0.045] dark:to-transparent"
          />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/25 backdrop-blur-[1px] dark:bg-[#070b13]/25">
        <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#0b101a]/80 dark:text-white">
          <Loader2 className="h-4 w-4 animate-spin text-brand-orange" />
          {label}
        </div>
      </div>
    </div>
  )
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-red-300/60 bg-red-50/90 px-6 py-10 text-center text-red-700 shadow-[0_24px_80px_rgba(127,29,29,0.08)] backdrop-blur-xl dark:border-red-400/25 dark:bg-red-500/[0.08] dark:text-red-100 dark:shadow-[0_24px_80px_rgba(127,29,29,0.16)]">
      <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-red-500/15 blur-3xl" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/50 bg-red-500/10 text-red-600 dark:border-red-300/20 dark:text-red-200">
          <RefreshCcw className="h-5 w-5" />
        </div>
        <p className="text-sm leading-6 text-red-700 dark:text-red-100/90">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(248,139,37,0.28)] transition hover:bg-brand-orange/90"
          >
            <RefreshCcw className="h-4 w-4" />
            Tekrar dene
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-dashed border-slate-300/80 bg-white/85 px-6 py-14 text-center text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/14 dark:bg-white/[0.04] dark:text-gray-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="absolute left-1/2 top-8 h-32 w-64 -translate-x-1/2 rounded-full bg-brand-orange/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-orange/20 bg-brand-orange/10 text-brand-orange shadow-[0_16px_44px_rgba(248,139,37,0.12)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_16px_44px_rgba(0,0,0,0.2)]">
          <Inbox className="h-5 w-5" />
        </div>
        <p className="text-lg font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}

function formatLongDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function MyApplicationsTab({
  applications,
  loading,
  error,
  onExploreClick,
  onRetry
}: {
  applications: JobApplication[]
  loading: boolean
  error?: string | null
  onExploreClick: () => void
  onRetry?: () => void
}) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return {
          badge: (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Olumlu Yanıt
            </span>
          ),
          description: 'Başvurunuz olumlu yanıtlandı. İlan sahibi ile iletişime geçildi.',
        }
      case 'REJECTED':
        return {
          badge: (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-300">
              <XCircle className="h-3.5 w-3.5" />
              Olumsuz Yanıt
            </span>
          ),
          description: 'Bu ilan için sürece devam edilmeyecektir.',
        }
      case 'REVIEWED':
        return {
          badge: (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-300">
              <Eye className="h-3.5 w-3.5" />
              İnceleniyor
            </span>
          ),
          description: 'Başvurunuz ilan sahibi tarafından incelenmektedir.',
        }
      case 'PENDING':
      case 'WAITING':
      default:
        return {
          badge: (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-300">
              <Hourglass className="h-3.5 w-3.5" />
              Beklemede
            </span>
          ),
          description: 'Başvurunuz ilan sahibi tarafından henüz incelenmedi.',
        }
    }
  }

  // Süre göstergesi hesaplama fonksiyonu
  const getResponseTimeIndicator = (application: JobApplication) => {
    // Yanıtlanmış durumlar için gösterme
    if (application.status !== 'PENDING' && application.status !== 'WAITING') {
      return {
        badge: (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Yanıtlandı
          </span>
        ),
        daysLeft: null,
      }
    }

    if (!application.expiresAt) {
      return null
    }

    const now = new Date()
    const expires = new Date(application.expiresAt)
    const diffTime = expires.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      // Süre doldu
      return {
        badge: (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-950/[0.035] px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300">
            <CircleDot className="h-3 w-3" />
            Süre doldu
          </span>
        ),
        daysLeft: 0,
      }
    } else if (diffDays <= 3) {
      // Son 3 gün
      return {
        badge: (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-300">
            <Clock3 className="h-3 w-3" />
            Son {diffDays} gün
          </span>
        ),
        daysLeft: diffDays,
      }
    } else {
      // Normal süre
      return {
        badge: (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/20 bg-orange-400/10 px-2.5 py-1 text-xs font-medium text-orange-300">
            <Clock3 className="h-3 w-3" />
            Yanıt için {diffDays} gün
          </span>
        ),
        daysLeft: diffDays,
      }
    }
  }

  if (loading) {
    return <LoadingPanel label="Başvurular yükleniyor" />
  }

  if (error) {
    return (
      <ErrorPanel message={error} onRetry={onRetry} />
    )
  }

  if (!applications || applications.length === 0) {
    return (
      <EmptyPanel
        title="Henüz yaptığınız bir başvuru yok."
        description="Size uygun ilanları keşfedin; başvurularınız burada düzenli bir akışta görünecek."
        action={
        <button
          onClick={onExploreClick}
          className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(248,139,37,0.28)] transition hover:bg-brand-orange/90"
        >
          <Search className="h-4 w-4" />
          İlanları keşfet
        </button>
        }
      />
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {applications.map((application) => (
        <div
          key={application.id}
          className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-5 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-brand-orange/35 hover:shadow-[0_28px_80px_rgba(248,139,37,0.12)] dark:border-white/10 dark:bg-gradient-to-br dark:from-white/[0.09] dark:via-white/[0.045] dark:to-white/[0.025] dark:text-white dark:shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-orange/10 blur-3xl transition group-hover:bg-brand-orange/20" />
          <div className="relative mb-4 flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                {application.jobListing.title}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                <Building2 className="h-3.5 w-3.5 text-brand-orange/80" />
                {application.jobListing.company || 'Şirket bilgisi yok'}
                {application.jobListing.location && (
                  <>
                    <span className="text-slate-300 dark:text-white/20">/</span>
                    <MapPin className="h-3.5 w-3.5 text-sky-300/80" />
                    {application.jobListing.location}
                  </>
                )}
              </p>
            </div>
            <div className="ml-3 flex flex-col items-end gap-1.5 text-right">
              {getStatusBadge(application.status).badge}
              {getResponseTimeIndicator(application)?.badge}
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-200/80 bg-slate-950/[0.035] px-3 py-3 dark:border-white/8 dark:bg-black/15">
            <p className="text-xs leading-5 text-slate-600 dark:text-gray-300">
              {getStatusBadge(application.status).description}
            </p>
          </div>

          {application.coverLetter && (
            <p className="relative mt-3 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-gray-300">
              {application.coverLetter}
            </p>
          )}

          <div className="relative mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-gray-500">
            <CalendarDays className="h-3.5 w-3.5" />
            Başvuru Tarihi: {formatLongDate(application.createdAt)}
          </div>

          <Link
            href={`/fellink/${application.jobListing.id}`}
            className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/12 px-4 py-2 text-sm font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
          >
            <Eye className="h-4 w-4" />
            İlanı Görüntüle
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ))}
    </div>
  )
}

function MyJobsTab({
  jobs,
  loading,
  error,
  onJobClick,
  onDeleteClick,
  onRetry,
  openMenuId,
  setOpenMenuId,
  user,
  router,
}: {
  jobs: MyJobListing[]
  loading: boolean
  error: string | null
  onJobClick: (job: MyJobListing) => void
  onDeleteClick: (jobId: string) => void
  onRetry?: () => void
  openMenuId: string | null
  setOpenMenuId: (id: string | null) => void
  user: any
  router: any
}) {
  const cleanText = (text: string) => {
    if (!text) return ''
    return text
      .replace(/\*\*/g, '')
      .replace(/[_#>-]/g, '')
      .trim()
  }

  if (loading) {
    return <LoadingPanel label="İlanlarınız yükleniyor" />
  }

  if (error) {
    return (
      <ErrorPanel message={error} onRetry={onRetry} />
    )
  }

  if (jobs.length === 0) {
    return (
      <EmptyPanel
        title="Henüz oluşturduğunuz bir ilan yok."
        description="Kurumunuz veya koleksiyonunuz için ilk fırsatı yayınladığınızda başvurular burada takip edilecek."
        action={
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(248,139,37,0.28)] transition hover:bg-brand-orange/90"
        >
          <Plus className="h-4 w-4" />
          İlk İlanınızı Oluşturun
        </Link>
        }
      />
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {jobs.map((job) => {
        const cleanedDescription = cleanText(job.description)
        const shortDescription = cleanedDescription.length > 100
          ? cleanedDescription.substring(0, 100) + '...'
          : cleanedDescription

        const companyLocation = [job.company, job.location].filter(Boolean).join(' · ')

        const dateText = new Date(job.createdAt).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })

        const applicationCount = job._count?.applications || 0

        return (
          <article
            key={job.id}
            onClick={() => onJobClick(job)}
            className="group relative flex min-h-[270px] cursor-pointer flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 px-5 py-5 text-slate-900 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-brand-orange/35 hover:shadow-[0_30px_90px_rgba(248,139,37,0.14)] dark:border-white/10 dark:bg-gradient-to-br dark:from-white/[0.09] dark:via-white/[0.045] dark:to-white/[0.02] dark:text-white dark:shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl transition group-hover:bg-brand-orange/16" />
            <div className="relative flex flex-1 flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/10 px-2.5 py-1 text-[11px] font-semibold text-brand-orange">
                    <BriefcaseBusiness className="h-3 w-3" />
                    Yayında
                  </span>
                  <h2 className="text-base font-semibold leading-tight text-slate-950 dark:text-white">
                    {job.title}
                  </h2>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === job.id ? null : job.id)
                  }}
                  className="rounded-full border border-slate-200/80 bg-slate-950/[0.035] p-2 text-slate-500 transition hover:border-brand-orange/35 hover:text-brand-orange dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:border-brand-orange/30"
                  title="Menü"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {companyLocation && (
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
                  <Building2 className="h-4 w-4 text-brand-orange/80" />
                  {companyLocation}
                </p>
              )}

              {shortDescription && (
                <p className="line-clamp-2 text-sm leading-6 text-slate-700 dark:text-gray-300">
                  {shortDescription}
                </p>
              )}

              {job.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {job.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-950/[0.035] px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/8 dark:bg-white/[0.06] dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                  {job.tags.length > 3 && (
                    <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-950/[0.035] px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-white/8 dark:bg-white/[0.06] dark:text-gray-400">
                      +{job.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="relative mt-5 border-t border-slate-200/80 pt-4 dark:border-white/8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-950/[0.035] px-3 py-1.5 dark:border-white/8 dark:bg-white/[0.05]">
                  <Users className="h-4 w-4 text-brand-orange" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-gray-100">
                    {applicationCount} Başvuru
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {dateText}
                </p>
              </div>

              {applicationCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/fellink/${job.id}?tab=applications`)
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-2 text-sm font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                  Başvuruları Gör
                </button>
              )}
            </div>

            <div className="absolute right-5 top-16" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                {openMenuId === job.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 top-0 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#111722]/95">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            router.push(`/jobs/new?edit=${job.id}`)
                            setOpenMenuId(null)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-950/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Düzenle
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            onDeleteClick(job.id)
                            setOpenMenuId(null)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                        >
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            İlanı Sil
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

// Dynamic export - prerender'i devre dışı bırak (useSearchParams kullanımı nedeniyle)
export const dynamic = 'force-dynamic';


function FellinkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, capabilities, accessToken } = useAuthStore()
  const [jobs, setJobs] = useState<PublicJobListing[]>([])
  const [myJobs, setMyJobs] = useState<MyJobListing[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [myJobsLoading, setMyJobsLoading] = useState(false)
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [applicationsError, setApplicationsError] = useState<string | null>(null)
  const [myJobsError, setMyJobsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [applicationsRetry, setApplicationsRetry] = useState(0)
  const [myJobsRetry, setMyJobsRetry] = useState(0)
  const [applyModalOpen, setApplyModalOpen] = useState<string | null>(null)
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set())
  const [applicationStatusByJobId, setApplicationStatusByJobId] = useState<Record<string, string>>({})

  // Tab state
  const tabFromUrl = searchParams?.get('tab')
  const [activeTab, setActiveTab] = useState<'explore' | 'applications' | 'my-jobs'>(
    tabFromUrl === 'applications' ? 'applications' : tabFromUrl === 'my-jobs' ? 'my-jobs' : 'explore'
  )

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'applications' || tab === 'my-jobs') {
      setActiveTab(tab)
    } else {
      setActiveTab('explore')
    }
  }, [searchParams])

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<PublicJobListing | MyJobListing | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const cleanText = (text: string) => {
    if (!text) return ''
    return text.replace(/\*\*/g, '').replace(/[_#>-]/g, '').replace(/\n/g, ' ').trim()
  }

  const handleJobClick = (job: PublicJobListing | MyJobListing) => {
    setSelectedJob(job)
    setDetailModalOpen(true)
  }

  const roles = capabilities?.roles ?? user?.roles ?? []
  const isAdmin = isAdminUser(user)
  const canCreateJob = roles.includes('corporate') || roles.includes('collector') || isAdmin
  const canApply = !!accessToken

  const handleDeleteJob = async () => {
    if (!selectedJobId) return

    try {
      await api.delete(`/jobs/${selectedJobId}`)
      setJobs((prev) => prev.filter((job) => job.id !== selectedJobId))
      setMyJobs((prev) => prev.filter((job) => job.id !== selectedJobId))
      setApplications((prev) => prev.filter((app) => app.jobListing.id !== selectedJobId))
      setDeleteModalOpen(false)
      setDetailModalOpen(false)
      setSelectedJob(null)
      setOpenMenuId(null)
      setSelectedJobId(null)
      toast.success('İlan başarıyla silindi')
    } catch (err: any) {
      console.error('İlan silinirken hata:', err)
      const message = err?.response?.data?.message ?? err?.message ?? 'İlan silinemedi'
      toast.error(message)
    }
  }

  const openDeleteModal = (jobId: string) => {
    setSelectedJobId(jobId)
    setDeleteModalOpen(true)
    setOpenMenuId(null)
  }

  const handleTabChange = (tab: 'explore' | 'applications' | 'my-jobs') => {
    setActiveTab(tab)
    if (tab === 'applications') {
      setApplicationsLoading(true)
      setApplicationsError(null)
    } else if (tab === 'my-jobs') {
      setMyJobsLoading(true)
      setMyJobsError(null)
    }
    if (tab === 'explore') {
      router.push('/fellink', { scroll: false })
    } else {
      router.push(`/fellink?tab=${tab}`, { scroll: false })
    }
  }

  const tabButtonClass = (selected: boolean) =>
    cx(
      'group relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition',
      selected
        ? 'bg-brand-orange text-white shadow-[0_16px_42px_rgba(248,139,37,0.28)]'
        : 'text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-950 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
    )

  useEffect(() => {
    let mounted = true

    async function fetchJobs() {
      try {
        setError(null)
        setLoading(true)
        const response = await api.get<PublicJobListing[]>('/jobs/public')
        if (mounted) {
          setJobs(response.data || [])
        }
      } catch (err: any) {
        if (mounted) {
          const isNetworkError = !err?.response || err?.code === 'ERR_NETWORK' || err?.message === 'Network Error'
          const message = isNetworkError
            ? 'İlanlar şu an yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.'
            : (err?.response?.data?.message ?? err?.message ?? 'İlanlar yüklenirken bir sorun oluştu.')
          setError(Array.isArray(message) ? message.join(' ') : message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    async function checkApplications() {
      if (!accessToken) return
      try {
        const applied = await api.get('/jobs/me/applications')
        if (mounted && applied.data) {
          const list = Array.isArray(applied.data) ? applied.data : []
          const jobIds = new Set(list.map((app: any) => app.jobListing?.id || app.jobListingId))
          const statusMap: Record<string, string> = {}
          list.forEach((app: any) => {
            const jid = app.jobListing?.id || app.jobListingId
            if (jid && app.status) statusMap[jid] = app.status
          })
          setAppliedJobs(jobIds)
          setApplicationStatusByJobId(statusMap)
        }
      } catch (err) {
        if (mounted) {
          setAppliedJobs(new Set())
          setApplicationStatusByJobId({})
        }
      }
    }

    if (accessToken) {
      Promise.all([fetchJobs(), checkApplications()])
    } else {
      fetchJobs()
    }

    return () => {
      mounted = false
    }
  }, [accessToken, retryCount])

  useEffect(() => {
    if (activeTab !== 'applications' || !accessToken) return

    let mounted = true

    async function fetchApplications() {
      try {
        setApplicationsLoading(true)
        setApplicationsError(null)
        const response = await api.get<JobApplication[]>('/jobs/me/applications')
        if (mounted) {
          setApplications(Array.isArray(response.data) ? response.data : [])
        }
      } catch (err: any) {
        if (mounted) {
          const msg = err?.response?.data?.message ?? err?.message
          const safe = typeof msg === 'string' ? msg : 'Başvurular yüklenirken bir sorun oluştu.'
          setApplicationsError(safe)
          setApplications([])
        }
      } finally {
        if (mounted) {
          setApplicationsLoading(false)
        }
      }
    }

    fetchApplications()

    return () => {
      mounted = false
    }
  }, [activeTab, accessToken, applicationsRetry])

  useEffect(() => {
    if (activeTab !== 'my-jobs' || !accessToken) return

    let mounted = true

    async function fetchMyJobs() {
      try {
        setMyJobsLoading(true)
        setMyJobsError(null)
        const response = await api.get<MyJobListing[]>('/jobs/me')
        if (mounted) {
          setMyJobs(Array.isArray(response.data) ? response.data : [])
        }
      } catch (err: any) {
        if (mounted) {
          const msg = err?.response?.data?.message ?? err?.message
          const safe = typeof msg === 'string' ? msg : 'İlanlarınız yüklenirken bir sorun oluştu.'
          setMyJobsError(safe)
          setMyJobs([])
        }
      } finally {
        if (mounted) {
          setMyJobsLoading(false)
        }
      }
    }

    fetchMyJobs()

    return () => {
      mounted = false
    }
  }, [activeTab, accessToken, myJobsRetry])

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-10 text-slate-900 sm:px-6 lg:py-12 dark:text-gray-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden">
        <div className="absolute left-10 top-8 h-56 w-56 rounded-full bg-brand-orange/12 blur-3xl" />
        <div className="absolute right-16 top-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <header className="relative mb-8 overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.9)_45%,rgba(255,237,213,0.78))] px-6 py-6 shadow-[0_28px_90px_rgba(15,23,42,0.09)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[linear-gradient(135deg,rgba(6,10,18,0.98)_0%,rgba(15,23,42,0.94)_48%,rgba(80,39,14,0.76)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/60 to-transparent" />
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand-orange/15 blur-3xl dark:bg-brand-orange/22" />
        <div className="absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl dark:bg-indigo-500/14" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(120deg,rgba(255,255,255,0.075),transparent_34%,rgba(248,139,37,0.075)_100%)] dark:block" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/25 bg-brand-orange/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
            <Sparkles className="h-4 w-4" />
              Feellink iş ağı
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Topluluk ilanlarını keşfet
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-gray-300">
              Feellink ekosistemindeki kurumların, koleksiyonerlerin ve yaratıcı ekiplerin paylaştığı güncel iş ve proje fırsatları burada.
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 rounded-3xl border border-slate-200/80 bg-white/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:w-auto sm:min-w-[340px] dark:border-white/[0.12] dark:bg-[rgba(2,6,14,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_44px_rgba(0,0,0,0.24)]">
            <div className="rounded-2xl bg-slate-950/[0.035] px-3 py-3 dark:bg-white/[0.07]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-orange-100/65">Yayında</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{loading ? '...' : jobs.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/[0.025] px-3 py-3 dark:bg-white/[0.055]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-orange-100/60">Başvuru</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{applicationsLoading ? '...' : applications.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/[0.025] px-3 py-3 dark:bg-white/[0.055]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-orange-100/60">İlanım</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{myJobsLoading ? '...' : myJobs.length}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-7 flex flex-col gap-4 border-b border-slate-200/80 pb-4 md:flex-row md:items-center md:justify-between dark:border-white/10">
        <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-200/80 bg-white/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <button
            onClick={() => handleTabChange('explore')}
            className={tabButtonClass(activeTab === 'explore')}
          >
            <Search className="h-4 w-4" />
            Keşfet
          </button>
          {accessToken && (
            <>
              <button
                onClick={() => handleTabChange('applications')}
                className={tabButtonClass(activeTab === 'applications')}
              >
                <Send className="h-4 w-4" />
                Başvurularım
              </button>
              <button
                onClick={() => handleTabChange('my-jobs')}
                className={tabButtonClass(activeTab === 'my-jobs')}
              >
                <FileText className="h-4 w-4" />
                İş İlanlarım
              </button>
            </>
          )}
        </div>

        {canCreateJob && (
          <Link
            href="/jobs/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_46px_rgba(248,139,37,0.28)] transition hover:-translate-y-0.5 hover:bg-brand-orange/90"
          >
            <Plus className="h-4 w-4" />
            İlan Oluştur
          </Link>
        )}
      </div>

      {activeTab === 'applications' ? (
        <MyApplicationsTab
          applications={applications}
          loading={applicationsLoading}
          error={applicationsError}
          onExploreClick={() => handleTabChange('explore')}
          onRetry={() => setApplicationsRetry((c) => c + 1)}
        />
      ) : activeTab === 'my-jobs' ? (
        <MyJobsTab
          jobs={myJobs}
          loading={myJobsLoading}
          error={myJobsError}
          onJobClick={handleJobClick}
          onDeleteClick={openDeleteModal}
          onRetry={() => setMyJobsRetry((c) => c + 1)}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          user={user}
          router={router}
        />
      ) : (
        <>
          {loading ? (
            <LoadingPanel label="İlanlar yükleniyor" />
          ) : error ? (
            <ErrorPanel message={error} onRetry={() => setRetryCount((c) => c + 1)} />
          ) : jobs.length === 0 ? (
            <EmptyPanel
              title="Şu anda yayınlanan ilan bulunmuyor."
              description="Kurumsal veya koleksiyoner hesapla ilk ilan yayınlandığında fırsatlar bu panoda görünecek."
              action={canCreateJob ? (
                <Link
                  href="/jobs/new"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_42px_rgba(248,139,37,0.28)] transition hover:bg-brand-orange/90"
                >
                  <Plus className="h-4 w-4" />
                  İlk ilanı oluştur
                </Link>
              ) : undefined}
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {jobs.map((job) => {
                  const hasApplied = appliedJobs.has(job.id)
                  const isOwner = job.createdBy?.id === user?.id
                  const cleanedDescription = cleanText(job.description)
                  const shortDescription = cleanedDescription.length > 100
                    ? cleanedDescription.substring(0, 100) + '...'
                    : cleanedDescription

                  return (
                    <article
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className="group relative flex min-h-[310px] cursor-pointer flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-5 text-slate-900 shadow-[0_26px_86px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all hover:-translate-y-1 hover:border-brand-orange/35 hover:shadow-[0_34px_100px_rgba(248,139,37,0.15)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.105),rgba(255,255,255,0.045)_45%,rgba(16,25,44,0.45))] dark:text-white dark:shadow-[0_26px_86px_rgba(0,0,0,0.24)]"
                    >
                      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-orange/12 blur-3xl transition group-hover:bg-brand-orange/22" />
                      <div className="pointer-events-none absolute -bottom-20 left-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

                      <div className="relative flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              {isOwner && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-300">
                                  <BriefcaseBusiness className="h-3 w-3" />
                                  İlanın
                                </span>
                              )}
                              {!isOwner && hasApplied && (
                                <span className={cx(
                                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                                  applicationStatusByJobId[job.id] === 'ACCEPTED'
                                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                                    : applicationStatusByJobId[job.id] === 'REJECTED'
                                      ? 'border-red-400/20 bg-red-400/10 text-red-300'
                                      : 'border-orange-300/20 bg-orange-400/10 text-orange-300'
                                )}>
                                  {applicationStatusByJobId[job.id] === 'ACCEPTED' && <CheckCircle2 className="h-3 w-3" />}
                                  {applicationStatusByJobId[job.id] === 'REJECTED' && <XCircle className="h-3 w-3" />}
                                  {(applicationStatusByJobId[job.id] === 'PENDING' || applicationStatusByJobId[job.id] === 'REVIEWED' || !applicationStatusByJobId[job.id]) && <Hourglass className="h-3 w-3" />}
                                  {applicationStatusByJobId[job.id] === 'ACCEPTED' && 'Onaylandı'}
                                  {applicationStatusByJobId[job.id] === 'REJECTED' && 'Reddedildi'}
                                  {(applicationStatusByJobId[job.id] === 'PENDING' || applicationStatusByJobId[job.id] === 'REVIEWED' || !applicationStatusByJobId[job.id]) && 'Başvurdun'}
                                </span>
                              )}
                              {!isOwner && !hasApplied && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-950/[0.035] px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300">
                                  <Sparkles className="h-3 w-3 text-brand-orange" />
                                  Yeni fırsat
                                </span>
                              )}
                            </div>
                            <h2 className="line-clamp-2 text-xl font-bold leading-tight text-slate-950 dark:text-white">
                              {job.title}
                            </h2>
                          </div>

                          {(isOwner || isAdmin) && (
                            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                                className="rounded-full border border-slate-200/80 bg-slate-950/[0.035] p-2 text-slate-500 transition hover:border-brand-orange/35 hover:text-brand-orange dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:border-brand-orange/30"
                                title="Menü"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {openMenuId === job.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#111722]/95">
                                    <button
                                      onClick={() => openDeleteModal(job.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        İlanı Sil
                                      </div>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {job.createdBy && (
                          <div className="mt-4 flex items-center gap-2">
                            {job.createdBy.avatar ? (
                              <img
                                src={job.createdBy.avatar}
                                alt={job.createdBy.username || ''}
                                className="h-7 w-7 rounded-full border border-slate-200 object-cover shadow-lg dark:border-white/10"
                              />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-950/[0.035] dark:border-white/10 dark:bg-white/[0.06]">
                                <UserCircle2 className="h-4 w-4 text-slate-500 dark:text-gray-400" />
                              </div>
                            )}
                            <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
                              {job.createdBy.fullName || job.createdBy.username}
                            </span>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-gray-400">
                          {job.company && (
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="h-4 w-4 text-brand-orange/80" />
                              {job.company}
                            </span>
                          )}
                          {job.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-sky-300/80" />
                              {job.location}
                            </span>
                          )}
                        </div>

                        {shortDescription && (
                          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-700 dark:text-gray-300">
                            {shortDescription}
                          </p>
                        )}

                        {job.tags.length > 0 && (
                          <div className="mt-5 flex flex-wrap gap-1.5">
                            {job.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-950/[0.035] px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/8 dark:bg-white/[0.06] dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                            {job.tags.length > 3 && (
                              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-950/[0.035] px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-white/8 dark:bg-white/[0.06] dark:text-gray-400">
                                +{job.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                      <div className="relative mt-auto border-t border-slate-200/80 pt-4 dark:border-white/8">
                        {!isOwner && canApply && (
                          <div
                            className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-950/[0.035] px-3 py-3 dark:border-white/10 dark:bg-black/18"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="mb-1 text-xs font-semibold text-slate-950 dark:text-white">Bu ilana başvur</p>
                            <p className="mb-3 text-[11px] leading-5 text-slate-600 dark:text-gray-400">İlan sahibiyle bağlantı kurmak için başvurunu gönder.</p>
                            {!hasApplied ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setApplyModalOpen(job.id)
                                }}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-orange py-2 text-xs font-semibold text-white shadow-[0_14px_34px_rgba(248,139,37,0.22)] transition hover:bg-brand-orange/90"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Başvur
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                applicationStatusByJobId[job.id] === 'ACCEPTED' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' :
                                applicationStatusByJobId[job.id] === 'REJECTED' ? 'border-red-400/20 bg-red-400/10 text-red-300' :
                                'border-orange-300/20 bg-orange-400/10 text-orange-300'
                              }`}>
                                {applicationStatusByJobId[job.id] === 'ACCEPTED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                {applicationStatusByJobId[job.id] === 'REJECTED' && <XCircle className="h-3.5 w-3.5" />}
                                {(applicationStatusByJobId[job.id] === 'PENDING' || applicationStatusByJobId[job.id] === 'REVIEWED' || !applicationStatusByJobId[job.id]) && <Hourglass className="h-3.5 w-3.5" />}
                                {applicationStatusByJobId[job.id] === 'ACCEPTED' && 'Başvurunuz onaylandı'}
                                {applicationStatusByJobId[job.id] === 'REJECTED' && 'Başvurunuz reddedildi'}
                                {(applicationStatusByJobId[job.id] === 'PENDING' || applicationStatusByJobId[job.id] === 'REVIEWED' || !applicationStatusByJobId[job.id]) && 'Başvurunuz beklemede'}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-500">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatLongDate(job.createdAt)}
                          </p>

                          <button
                            className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/25 bg-brand-orange/10 px-3 py-1.5 text-xs font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white"
                          >
                            İlanı İncele
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}

          {applyModalOpen && (
            <ApplyModal
              jobListingId={applyModalOpen}
              open={!!applyModalOpen}
              onClose={() => setApplyModalOpen(null)}
              onSuccess={() => {
                const jid = applyModalOpen
                if (jid) {
                  setAppliedJobs((prev) => new Set(prev).add(jid))
                  setApplicationStatusByJobId((prev) => ({ ...prev, [jid]: 'PENDING' }))
                }
                setApplyModalOpen(null)
              }}
            />
          )}

          <DeleteConfirmModal
            open={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false)
              setOpenMenuId(null)
              setSelectedJobId(null)
            }}
            onConfirm={handleDeleteJob}
            title="İlanı Silmek Üzeresiniz"
            message="Bu iş ilanını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve ilana yapılan tüm başvurular da silinecektir."
          />

          <JobDetailModal
            open={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false)
              setSelectedJob(null)
            }}
            job={selectedJob}
            currentUserId={user?.id}
            hasApplied={selectedJob ? appliedJobs.has(selectedJob.id) : false}
            applicationStatus={selectedJob ? applicationStatusByJobId[selectedJob.id] : null}
            onApply={selectedJob ? (jobId) => { setApplyModalOpen(jobId); setDetailModalOpen(false); setSelectedJob(null); } : undefined}
          />
        </>
      )}

      {activeTab === 'my-jobs' && (
        <>
          <JobDetailModal
            open={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false)
              setSelectedJob(null)
            }}
            job={selectedJob}
          />

          <DeleteConfirmModal
            open={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false)
              setOpenMenuId(null)
              setSelectedJobId(null)
            }}
            onConfirm={handleDeleteJob}
            title="İlanı Silmek Üzeresiniz"
            message="Bu iş ilanını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve ilana yapılan tüm başvurular da silinecektir."
          />
        </>
      )}
    </div>
  )
}

export default function FellinkPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
        </div>
      }
    >
      <FellinkContent />
    </Suspense>
  )
}
