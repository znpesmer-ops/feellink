'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded'
  
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

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <div className="w-full bg-white/80 dark:bg-[#1a1a1a]/70 backdrop-blur-md border border-gray-200 dark:border-gray-700/40 rounded-2xl shadow-sm p-4 md:p-5">
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
