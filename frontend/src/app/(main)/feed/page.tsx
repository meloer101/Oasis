'use client'

import { useState, useRef, FormEvent } from 'react'
import { useFeed } from '@/hooks/use-feed'
import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import FeedTabs from '@/components/feed/feed-tabs'
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

export default function FeedPage() {
  const { t } = useLocale()
  const [feedType, setFeedType] = useState<FeedType>('hot')
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isSearching = searchQuery.length > 0

  const feed = useFeed(feedType)
  const search = usePostSearch(searchQuery)

  const feedPosts = feed.data?.pages.flatMap((p) => p.items) ?? []
  const searchPosts = search.data?.pages.flatMap((p) => p.items) ?? []
  const feedQueryKey = isSearching ? ['post-search', searchQuery] : ['feed', feedType]

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = inputValue.trim()
    setSearchQuery(q)
  }

  function clearSearch() {
    setInputValue('')
    setSearchQuery('')
    inputRef.current?.focus()
  }

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('feed.searchPlaceholder')}
            className="w-full bg-surface border border-border-subtle rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        {isSearching && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-3 py-2 text-sm text-text-muted hover:text-text-primary border border-border-subtle rounded-lg transition-colors"
          >
            {t('feed.clearSearch')}
          </button>
        )}
      </form>

      {/* Feed tabs — hidden while searching */}
      {!isSearching && <FeedTabs active={feedType} onChange={setFeedType} />}

      {/* Loading */}
      {(isSearching ? search.isLoading : feed.isLoading) && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {!isSearching && feed.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.loadError')}</div>
      )}
      {isSearching && search.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.searchError')}</div>
      )}

      {/* Empty state */}
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
          <p className="text-sm">{t('feed.searchEmpty').replace('{q}', searchQuery)}</p>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {(isSearching ? searchPosts : feedPosts).map((post) => (
          <PostCard key={post.id} post={post} feedQueryKey={feedQueryKey} />
        ))}
      </div>

      {/* Load more */}
      {!isSearching && feed.hasNextPage && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
            className="px-5 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-subtle hover:border-zinc-400 dark:hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {feed.isFetchingNextPage ? t('feed.loading') : t('feed.loadMore')}
          </button>
        </div>
      )}
      {isSearching && search.hasNextPage && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => search.fetchNextPage()}
            disabled={search.isFetchingNextPage}
            className="px-5 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-subtle hover:border-zinc-400 dark:hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {search.isFetchingNextPage ? t('feed.loading') : t('feed.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}
