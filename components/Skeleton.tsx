'use client'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
}

export function SkeletonMetricCard() {
  return (
    <div className="card p-5">
      <Skeleton className="w-9 h-9 !rounded-xl mb-4" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function SkeletonListRow() {
  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <Skeleton className="w-9 h-9 !rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-20 !rounded-full" />
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonMetricCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 flex items-center gap-4">
            <Skeleton className="w-10 h-10 !rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card divide-y divide-slate-50">
          <div className="px-6 py-4"><Skeleton className="h-4 w-48" /></div>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonListRow key={i} />)}
        </div>
        <div className="card">
          <div className="px-5 py-4"><Skeleton className="h-4 w-32" /></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 space-y-2">
              <Skeleton className="h-4 w-20 !rounded-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonMedications() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="h-8 w-14 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="card divide-y divide-slate-50">
        <div className="px-6 py-4"><Skeleton className="h-4 w-40" /></div>
        {Array.from({ length: 3 }).map((_, i) => <SkeletonListRow key={i} />)}
      </div>
    </div>
  )
}
