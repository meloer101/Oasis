'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCircle, useCirclePosts, useJoinCircle, useLeaveCircle } from '@/hooks/use-circle'
import PostCard from '@/components/feed/post-card'
import { timeAgo, formatCoins } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'

export default function CirclePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { t } = useLocale()

  const { data: circle, isLoading } = useCircle(id)
  const { data: posts, isLoading: postsLoading } = useCirclePosts(id)
  const join = useJoinCircle(id)
  const leave = useLeaveCircle(id)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p>{t('circle.detail.notFound')}</p>
        <button onClick={() => router.back()} className="text-emerald-400 text-sm mt-2">
          {t('circle.detail.back')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-surface border border-border-subtle rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary mb-1">{circle.name}</h1>
            {circle.description && (
              <p className="text-sm text-text-secondary mb-3">{circle.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
              <span>
                👤 {circle.memberCount} {t('circle.detail.members')}
              </span>
              <span>
                📝 {circle.postCount} {t('circle.detail.posts')}
              </span>
              {circle.joinFee > 0 && (
                <span>
                  💰 {t('circle.detail.joinFee', { amount: formatCoins(circle.joinFee) })}
                </span>
              )}
              <span>
                {t('circle.detail.createdBy', {
                  user: circle.creator.username,
                  time: timeAgo(circle.createdAt),
                })}
              </span>
            </div>
          </div>

          {circle.isMember ? (
            circle.memberRole !== 'creator' ? (
              <button
                onClick={() => leave.mutate()}
                disabled={leave.isPending}
                className="shrink-0 px-4 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:border-zinc-400 dark:hover:border-zinc-600 text-sm transition-colors disabled:opacity-50"
              >
                {leave.isPending ? '…' : t('circle.detail.leave')}
              </button>
            ) : (
              <span className="shrink-0 text-xs text-text-muted px-3 py-1.5 rounded-lg border border-border-subtle">
                {t('circle.detail.owner')}
              </span>
            )
          ) : (
            <button
              onClick={() => join.mutate()}
              disabled={join.isPending}
              className="shrink-0 px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm transition-colors disabled:opacity-50"
            >
              {join.isPending
                ? '…'
                : circle.joinFee > 0
                  ? t('circle.detail.joinPaid', { amount: formatCoins(circle.joinFee) })
                  : t('circle.detail.join')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {postsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-400 dark:border-zinc-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} feedQueryKey={['circle-posts', id]} />
          ))
        ) : (
          <p className="text-center py-12 text-text-muted text-sm">{t('circle.detail.empty')}</p>
        )}
      </div>
    </div>
  )
}
