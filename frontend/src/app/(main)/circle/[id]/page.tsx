'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCircle, useCirclePosts, useJoinCircle, useLeaveCircle } from '@/hooks/use-circle'
import PostCard from '@/components/feed/post-card'
import { timeAgo, formatCoins } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'
import { PostDetailSkeleton, PostCardSkeleton } from '@/components/ui/skeletons'

export default function CirclePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { t } = useLocale()

  const { data: circle, isLoading } = useCircle(id)
  const { data: posts, isLoading: postsLoading } = useCirclePosts(id)
  const join = useJoinCircle(id)
  const leave = useLeaveCircle(id)

  const [showJoinConfirm, setShowJoinConfirm] = useState(false)
  const [justJoined, setJustJoined] = useState(false)

  useEffect(() => {
    if (join.isSuccess) {
      setJustJoined(true)
      const timer = setTimeout(() => setJustJoined(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [join.isSuccess])

  const joinErrorMsg = join.isError
    ? (join.error as { response?: { status?: number; data?: { error?: string } } })
        ?.response?.status === 402
      ? t('circle.detail.joinInsufficientFunds')
      : t('circle.detail.joinFailed')
    : null

  if (isLoading) {
    return <PostDetailSkeleton />
  }

  if (!circle) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p>{t('circle.detail.notFound')}</p>
        <button type="button" onClick={() => router.back()} className="text-brand text-sm mt-2">
          {t('circle.detail.back')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-10 px-1">
        <div className="flex items-start justify-between gap-6 flex-wrap border-b border-[var(--border-subtle)] pb-10">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted mb-4 opacity-80">
              CIRCLE
            </p>
            <h1 className="text-4xl sm:text-5xl font-medium text-text-primary mb-6 tracking-tighter leading-tight">{circle.name}</h1>
            {circle.description && (
              <p className="text-lg text-text-secondary mb-8 leading-relaxed max-w-2xl font-normal">{circle.description}</p>
            )}
            <div className="flex items-center gap-6 text-xs text-text-muted uppercase tracking-widest font-medium flex-wrap">
              <span className="flex items-center gap-2">
                <span className="opacity-60">MEMBERS</span>
                <span className="text-text-primary">{circle.memberCount}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="opacity-60">POSTS</span>
                <span className="text-text-primary">{circle.postCount}</span>
              </span>
              {circle.joinFee > 0 && (
                <span className="flex items-center gap-2">
                  <span className="opacity-60">FEE</span>
                  <span className="text-text-primary">{formatCoins(circle.joinFee)} AG</span>
                </span>
              )}
              <span className="flex items-center gap-2">
                <span className="opacity-60">BY</span>
                <Link href={`/user/${circle.creator.username}`} className="text-text-primary hover:opacity-70 transition-opacity">
                  @{circle.creator.username}
                </Link>
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <Link
              href={`/feed/new?circle=${encodeURIComponent(id)}`}
              className="inline-flex items-center justify-center px-8 py-2.5 rounded-full bg-text-primary text-[var(--bg)] text-sm font-medium hover:opacity-80 transition-all active:scale-95 text-center"
            >
              {t('circle.detail.newPost')}
            </Link>
            {circle.isMember ? (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              {circle.memberRole !== 'creator' ? (
                <button
                  type="button"
                  onClick={() => leave.mutate()}
                  disabled={leave.isPending}
                  className="px-8 py-2.5 rounded-full border border-[var(--border-subtle)] text-text-secondary hover:bg-nav-hover text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
                >
                  {leave.isPending ? '…' : t('circle.detail.leave')}
                </button>
              ) : (
                <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted px-4 py-2 rounded-full border border-[var(--border-subtle)]">
                  {t('circle.detail.owner')}
                </span>
              )}
              {justJoined && (
                <p className="text-[11px] text-text-primary font-medium tracking-wide text-center sm:text-right">{t('circle.detail.joinSuccess')}</p>
              )}
            </div>
            ) : showJoinConfirm && circle.joinFee > 0 ? (
            <div className="shrink-0 flex flex-col items-end gap-3 min-w-[200px]">
              <p className="text-xs text-text-secondary text-right font-normal leading-relaxed">
                {t('circle.detail.joinConfirmPrompt', { amount: formatCoins(circle.joinFee) })}
              </p>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinConfirm(false)
                    join.reset()
                  }}
                  className="flex-1 px-4 py-2 rounded-full border border-[var(--border-subtle)] text-text-secondary text-xs font-medium hover:bg-nav-hover transition-all"
                >
                  {t('circle.detail.joinCancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    join.mutate()
                    setShowJoinConfirm(false)
                  }}
                  disabled={join.isPending}
                  className="flex-1 px-4 py-2 rounded-full bg-text-primary text-[var(--bg)] text-xs font-medium hover:opacity-80 disabled:opacity-50 transition-all"
                >
                  {join.isPending ? '…' : t('circle.detail.joinConfirm')}
                </button>
              </div>
            </div>
            ) : (
            <div className="flex flex-col items-stretch sm:items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (circle.joinFee > 0) {
                    join.reset()
                    setShowJoinConfirm(true)
                  } else {
                    join.mutate()
                  }
                }}
                disabled={join.isPending}
                className="px-8 py-2.5 rounded-full bg-text-primary hover:opacity-80 text-[var(--bg)] text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                {join.isPending
                  ? '…'
                  : circle.joinFee > 0
                    ? t('circle.detail.joinPaid', { amount: formatCoins(circle.joinFee) })
                    : t('circle.detail.join')}
              </button>
            </div>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {postsLoading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : posts && posts.length > 0 ? (
          posts.map((post, index) => (
            <div
              key={post.id}
              className="motion-safe:animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
            >
              <PostCard post={post} feedQueryKey={['circle-posts', id]} />
            </div>
          ))
        ) : (
          <div className="text-center py-24 px-4">
            <p className="text-text-muted text-base mb-8 font-normal">{t('circle.detail.empty')}</p>
            <Link
              href={`/feed/new?circle=${encodeURIComponent(id)}`}
              className="inline-flex items-center justify-center px-8 py-2.5 rounded-full border border-[var(--border-subtle)] text-sm font-medium text-text-primary hover:bg-nav-hover transition-all active:scale-95"
            >
              {t('circle.detail.writeFirstPost')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
