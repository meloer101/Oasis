'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFeed } from '@/hooks/use-feed'
import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import FeedTabs, { type DiscoverSort, type MainFeedTab } from '@/components/feed/feed-tabs'
import PostCard from '@/components/feed/post-card'
import type { FeedType, Post } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'

interface SearchPage {
  items: Post[]
  nextCursor: string | null
}

function usePostSearch(q: string) {
  return useInfiniteQuery<SearchPage>({
    queryKey: ['post-search', q],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { q, limit: '20' }
      if (pageParam) params.cursor = pageParam as string
      const { data } = await apiClient.get('/api/posts/search', { params })
      return data as SearchPage
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: q.length > 0,
  })
}

function FeedPageInner() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const qParam = (searchParams.get('q') ?? '').trim()

  const [mainTab, setMainTab] = useState<MainFeedTab>('discover')
  const [discoverSort, setDiscoverSort] = useState<DiscoverSort>('hot')

  const feedType: FeedType = useMemo(
    () => (mainTab === 'follow' ? 'follow' : discoverSort === 'fresh' ? 'fresh' : 'hot'),
    [mainTab, discoverSort]
  )

  const isSearching = qParam.length > 0

  const feed = useFeed(feedType)
  const search = usePostSearch(qParam)

  const feedPosts = feed.data?.pages.flatMap((p) => p.items) ?? []
  const searchPosts = search.data?.pages.flatMap((p) => p.items) ?? []
  const followFallback = feedType === 'follow' && (feed.data?.pages[0]?.followFallback ?? false)
  const feedQueryKey = isSearching ? ['post-search', qParam] : ['feed', feedType]

  useEffect(() => {
    if (isSearching) {
      setMainTab('discover')
    }
  }, [isSearching])

  return (
    <div>
      {isSearching && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <span>{t('feed.resultsFor').replace('{q}', qParam)}</span>
          <a
            href="/feed"
            className="text-brand font-medium hover:underline"
          >
            {t('feed.clearSearch')}
          </a>
        </div>
      )}

      {!isSearching && (
        <FeedTabs
          mainTab={mainTab}
          discoverSort={discoverSort}
          onMainTabChange={setMainTab}
          onDiscoverSortChange={setDiscoverSort}
        />
      )}

      {(isSearching ? search.isLoading : feed.isLoading) && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isSearching && feed.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.loadError')}</div>
      )}
      {isSearching && search.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.searchError')}</div>
      )}

      {!isSearching && followFallback && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-sm text-text-muted">
          {t('feed.followFallbackBanner')}
        </div>
      )}

      {!isSearching && !feed.isLoading && feedPosts.length === 0 && !feed.error && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">🌊</p>
          <p className="text-sm">
            {feedType === 'follow' ? t('feed.emptyFollow') : t('feed.empty')}
          </p>
        </div>
      )}
      {isSearching && !search.isLoading && searchPosts.length === 0 && !search.error && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">{t('feed.searchEmpty').replace('{q}', qParam)}</p>
        </div>
      )}

      <div className="space-y-4">
        {(isSearching ? searchPosts : feedPosts).map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            feedQueryKey={feedQueryKey}
            featured={
              !isSearching &&
              index === 0 &&
              mainTab === 'discover' &&
              discoverSort === 'hot' &&
              !followFallback
            }
          />
        ))}
      </div>

      {!isSearching && feed.hasNextPage && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
            className="px-5 py-2 text-sm text-text-secondary hover:text-text-primary border border-[var(--card-border)] hover:border-brand/40 rounded-lg transition-colors disabled:opacity-50"
          >
            {feed.isFetchingNextPage ? t('feed.loading') : t('feed.loadMore')}
          </button>
        </div>
      )}
      {isSearching && search.hasNextPage && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => search.fetchNextPage()}
            disabled={search.isFetchingNextPage}
            className="px-5 py-2 text-sm text-text-secondary hover:text-text-primary border border-[var(--card-border)] rounded-lg transition-colors disabled:opacity-50"
          >
            {search.isFetchingNextPage ? t('feed.loading') : t('feed.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

function FeedFallback() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedFallback />}>
      <FeedPageInner />
    </Suspense>
  )
}
