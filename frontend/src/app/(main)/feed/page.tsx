'use client'

import { useState } from 'react'
import { useFeed } from '@/hooks/use-feed'
import FeedTabs from '@/components/feed/feed-tabs'
import PostCard from '@/components/feed/post-card'
import type { FeedType } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'

export default function FeedPage() {
  const { t } = useLocale()
  const [feedType, setFeedType] = useState<FeedType>('hot')
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useFeed(feedType)

  const posts = data?.pages.flatMap((p) => p.items) ?? []
  const feedQueryKey = ['feed', feedType]

  return (
    <div>
      <FeedTabs active={feedType} onChange={setFeedType} />

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.loadError')}</div>
      )}

      {!isLoading && posts.length === 0 && !error && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">🌊</p>
          <p className="text-sm">
            {feedType === 'follow' ? t('feed.emptyFollow') : t('feed.empty')}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} feedQueryKey={feedQueryKey} />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-5 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-subtle hover:border-zinc-400 dark:hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? t('feed.loading') : t('feed.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}
