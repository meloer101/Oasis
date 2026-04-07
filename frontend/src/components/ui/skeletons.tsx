import { Skeleton } from './skeleton'

// ── PostCard skeleton ────────────────────────────────────────────────────────
// Mirrors the standard card layout in post-card.tsx
export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-3">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex gap-2 items-center">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3 w-14 rounded" />
        </div>
      </div>
      {/* Title */}
      <Skeleton className="h-5 w-[72%] rounded mb-2" />
      {/* Preview lines */}
      <Skeleton className="h-3.5 w-full rounded mb-1.5" />
      <Skeleton className="h-3.5 w-[58%] rounded mb-3" />
      {/* Labels row */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      {/* Temperature bar */}
      <Skeleton className="h-1.5 w-full rounded-full mb-4" />
      {/* Footer divider + actions */}
      <div className="border-t border-[var(--card-border)] pt-3 flex items-center justify-between">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  )
}

// ── PostDetail skeleton ──────────────────────────────────────────────────────
// Mirrors post/[id]/page.tsx layout
export function PostDetailSkeleton() {
  return (
    <div>
      {/* Back button */}
      <Skeleton className="h-4 w-16 rounded mb-5" />
      {/* Image placeholder */}
      <Skeleton className="w-full h-48 rounded-2xl mb-5" />
      {/* Tag + readtime row */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      {/* Title */}
      <Skeleton className="h-8 w-[85%] rounded mb-2" />
      <Skeleton className="h-8 w-[55%] rounded mb-5" />
      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-6">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        <Skeleton className="h-3.5 w-32 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      {/* Content lines */}
      <div className="space-y-2 mb-6">
        {[100, 100, 100, 75, 100, 100, 88, 60].map((w, i) => (
          <Skeleton key={i} className={`h-3.5 rounded`} style={{ width: `${w}%` }} />
        ))}
      </div>
      {/* Temperature bar area */}
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}

// ── UserProfile skeleton ─────────────────────────────────────────────────────
// Mirrors user/[username]/page.tsx layout
export function UserProfileSkeleton() {
  return (
    <div>
      {/* Back button */}
      <Skeleton className="h-4 w-16 rounded mb-5" />

      {/* Header card */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden mb-6">
        {/* Banner */}
        <Skeleton className="h-32 sm:h-40 w-full rounded-none" />
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 -mt-14 sm:-mt-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8">
            {/* Avatar */}
            <Skeleton className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl ring-4 ring-[var(--card-bg)] shrink-0" />
            <div className="flex-1 min-w-0 pb-0.5">
              {/* Name row */}
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-7 w-40 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              {/* Username + bio */}
              <Skeleton className="h-3.5 w-28 rounded mb-2" />
              <Skeleton className="h-3.5 w-full rounded mb-1.5" />
              <Skeleton className="h-3.5 w-[65%] rounded mb-3" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-t border-[var(--card-border)] px-2 flex gap-1">
          <Skeleton className="h-10 w-20 rounded my-1" />
          <Skeleton className="h-10 w-20 rounded my-1" />
        </div>
      </div>

      {/* Post cards */}
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  )
}

// ── Wallet skeleton ──────────────────────────────────────────────────────────
// Mirrors wallet/page.tsx layout
export function WalletSkeleton() {
  return (
    <div className="space-y-5">
      {/* Title */}
      <Skeleton className="h-6 w-20 rounded" />

      {/* Balance card */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <Skeleton className="h-3.5 w-16 rounded mb-2" />
        <Skeleton className="h-10 w-36 rounded mb-2" />
        <Skeleton className="h-3 w-48 rounded" />
      </div>

      {/* Streak card */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-3.5 w-20 rounded mb-2" />
          <Skeleton className="h-7 w-28 rounded" />
        </div>
        <Skeleton className="h-8 w-32 rounded" />
      </div>

      {/* Badge progress card */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <Skeleton className="h-4 w-28 rounded mb-4" />
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-7 h-7 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-24 rounded mb-2" />
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
              <Skeleton className="h-3 w-10 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div>
        <Skeleton className="h-4 w-24 rounded mb-3" />
        <div className="space-y-px">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 px-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)]"
            >
              <div>
                <Skeleton className="h-3.5 w-28 rounded mb-1.5" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Notifications skeleton ───────────────────────────────────────────────────
// Mirrors notifications/page.tsx two-column layout
export function NotificationsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-36 rounded" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>

      <div className="flex gap-6">
        {/* Left filter sidebar */}
        <aside className="w-40 shrink-0 space-y-1">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </aside>

        {/* Notification rows */}
        <div className="flex-1 min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden divide-y divide-[var(--card-border)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-[70%] rounded mb-2" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
