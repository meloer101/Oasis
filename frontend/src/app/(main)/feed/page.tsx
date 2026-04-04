'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
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

function IconFeedEmpty({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="10" y="12" width="28" height="26" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 20h16M16 26h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 32h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

function IconSearchEmpty({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="22" cy="22" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M29 29l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
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

const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition-[box-shadow,opacity,transform] duration-200 ease-[var(--ease-out-expo)] hover:opacity-[0.92] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] active:scale-[0.99]'
const btnSecondary =
  'inline-flex items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-text-primary transition-colors duration-200 ease-[var(--ease-out-expo)] hover:bg-nav-hover hover:border-[color-mix(in_srgb,var(--text-primary)_20%,var(--card-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]'

function FeedPageInner() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const qParam = (searchParams.get('q') ?? '').trim()

  const [mainTab, setMainTab] = useState<MainFeedTab>('discover')
  const [discoverSort, setDiscoverSort] = useState<DiscoverSort>('hot')

  const isSearching = qParam.length > 0
  const effectiveMainTab: MainFeedTab = isSearching ? 'discover' : mainTab

  const feedType: FeedType = useMemo(
    () => (effectiveMainTab === 'follow' ? 'follow' : discoverSort === 'fresh' ? 'fresh' : 'hot'),
    [effectiveMainTab, discoverSort]
  )

  const feed = useFeed(feedType)
  const search = usePostSearch(qParam)

  const feedPosts = feed.data?.pages.flatMap((p) => p.items) ?? []
  const searchPosts = search.data?.pages.flatMap((p) => p.items) ?? []
  const followFallback = feedType === 'follow' && (feed.data?.pages[0]?.followFallback ?? false)
  const feedQueryKey = isSearching ? ['post-search', qParam] : ['feed', feedType]

  const loadMoreClass =
    'px-5 py-2.5 text-sm font-medium text-text-secondary rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] transition-[color,background-color,border-color,box-shadow] duration-200 ease-[var(--ease-out-expo)] hover:text-text-primary hover:bg-nav-hover hover:border-[color-mix(in_srgb,var(--text-primary)_18%,var(--card-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:opacity-50 disabled:pointer-events-none'

  return (
    <div>
      {isSearching && (
        <div className="feed-panel mb-5 flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-text-muted motion-safe:animate-fade-in-up">
          <span>{t('feed.resultsFor').replace('{q}', qParam)}</span>
          <Link href="/feed" className="text-text-primary font-medium hover:underline underline-offset-2">
            {t('feed.clearSearch')}
          </Link>
        </div>
      )}

      {!isSearching && (
        <>
          <section className="feed-hero mb-5 p-5 sm:p-6 motion-safe:animate-fade-in-up">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                  {t('feed.heroEyebrow')}
                </p>
                <h1 className="font-post-serif text-2xl sm:text-[1.75rem] font-semibold text-text-primary mt-2 tracking-tight">
                  {t('feed.heroTitle')}
                </h1>
                <p className="text-sm text-text-secondary mt-2 max-w-2xl leading-relaxed">{t('feed.heroSubtitle')}</p>
                <div className="flex flex-wrap gap-2 mt-5">
                  <Link href="/feed/new" className={btnPrimary}>
                    {t('topNav.createPost')}
                  </Link>
                  <Link href="/circles" className={btnSecondary}>
                    {t('rightPanel.exploreCircles')}
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <FeedTabs
            mainTab={effectiveMainTab}
            discoverSort={discoverSort}
            onMainTabChange={setMainTab}
            onDiscoverSortChange={setDiscoverSort}
          />
        </>
      )}

      {(isSearching ? search.isLoading : feed.isLoading) && (
        <div className="flex justify-center py-12">
          <div
            className="w-6 h-6 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:border-t-[var(--text-primary)]"
            role="status"
            aria-label={t('feed.loading')}
          />
        </div>
      )}

      {!isSearching && feed.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.loadError')}</div>
      )}
      {isSearching && search.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.searchError')}</div>
      )}

      {!isSearching && followFallback && (
        <div className="feed-panel mb-3 px-4 py-3 text-sm text-text-secondary leading-relaxed">
          {t('feed.followFallbackBanner')}
        </div>
      )}

      {!isSearching && !feed.isLoading && feedPosts.length === 0 && !feed.error && (
        <div className="feed-panel text-center py-14 px-4 motion-safe:animate-fade-in-up">
          <IconFeedEmpty className="mx-auto mb-4 text-text-muted opacity-80" />
          <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
            {feedType === 'follow' ? t('feed.emptyFollow') : t('feed.empty')}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Link href="/feed/new" className={btnPrimary}>
              {t('topNav.createPost')}
            </Link>
            <Link href="/circles" className={btnSecondary}>
              {t('rightPanel.exploreCircles')}
            </Link>
          </div>
        </div>
      )}
      {isSearching && !search.isLoading && searchPosts.length === 0 && !search.error && (
        <div className="feed-panel text-center py-14 px-4 motion-safe:animate-fade-in-up">
          <IconSearchEmpty className="mx-auto mb-4 text-text-muted opacity-80" />
          <p className="text-sm text-text-secondary max-w-sm mx-auto">{t('feed.searchEmpty').replace('{q}', qParam)}</p>
          <Link href="/feed" className={`${btnSecondary} mt-6`}>
            {t('feed.clearSearch')}
          </Link>
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
              effectiveMainTab === 'discover' &&
              discoverSort === 'hot' &&
              !followFallback
            }
          />
        ))}
      </div>

      {!isSearching && feed.hasNextPage && (
        <div className="flex justify-center mt-6">
          <button type="button" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage} className={loadMoreClass}>
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
            className={loadMoreClass}
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
      <div
        className="w-6 h-6 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin motion-reduce:animate-none motion-reduce:border-t-[var(--text-primary)]"
        role="status"
        aria-hidden
      />
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
