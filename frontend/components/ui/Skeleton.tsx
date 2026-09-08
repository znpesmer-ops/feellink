'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-200/75 dark:bg-white/[0.08] rounded'
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: '',
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-label="Loading..."
    />
  )
}

type PostCardSkeletonVariant = 'default' | 'explore'

// Post Card Skeleton
export function PostCardSkeleton({ variant = 'default' }: { variant?: PostCardSkeletonVariant }) {
  if (variant === 'explore') {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.15rem] border border-black/5 bg-[#f7f1eb] shadow-[0_12px_30px_rgba(39,27,18,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_18px_44px_rgba(0,0,0,0.34)]">
        <Skeleton variant="rectangular" className="h-full w-full rounded-[1.15rem]" />
        <div className="pointer-events-none absolute inset-0 rounded-[1.15rem] bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <div className="mb-3 space-y-2">
            <Skeleton variant="text" className="h-3 w-24 bg-white/20" />
            <Skeleton variant="text" className="h-4 w-4/5 bg-white/25" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-black/20 p-1.5">
              <Skeleton variant="circular" className="h-6 w-6 bg-white/25" />
              <Skeleton variant="text" className="h-3 w-16 bg-white/20" />
            </div>
            <Skeleton variant="text" className="h-8 w-16 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-[24px] border border-slate-200/85 bg-slate-50/78 p-4 shadow-[0_18px_54px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-black/22 md:p-5">
      <Skeleton variant="rectangular" className="w-full aspect-square mb-4 rounded-2xl" />
      <Skeleton variant="text" className="w-3/4 mb-2 h-5" />
      <Skeleton variant="text" className="w-full mb-2 h-4" />
      <Skeleton variant="text" className="w-2/3 mb-4 h-4" />
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="w-6 h-6" />
          <Skeleton variant="text" className="w-20 h-4" />
        </div>
        <Skeleton variant="text" className="w-12 h-4" />
      </div>
    </div>
  )
}

// Page Skeleton (Genel sayfa yükleniyor skeleton'ı)
export function PageSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 space-y-6">
      <Skeleton variant="text" className="w-48 h-8 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
