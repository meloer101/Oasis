'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFeed } from '@/hooks/use-feed'
import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import FeedTabs, { type CategoryFilter, type DiscoverSort, type MainFeedTab } from '@/components/feed/feed-tabs'
import PostCard from '@/components/feed/post-card'
import type { FeedType, Post } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'
import { PostCardSkeleton } from '@/components/ui/skeletons'

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
  'inline-flex items-center justify-center rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground transition-all duration-300 ease-[var(--ease-out-expo)] hover:opacity-80 active:scale-95'
const btnSecondary =
  'inline-flex items-center justify-center rounded-full border border-[var(--border-subtle)] bg-transparent px-6 py-2.5 text-sm font-medium text-text-primary transition-all duration-300 ease-[var(--ease-out-expo)] hover:bg-nav-hover active:scale-95'

function FeedPageInner() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const qParam = (searchParams.get('q') ?? '').trim()

  const [mainTab, setMainTab] = useState<MainFeedTab>('discover')
  const [discoverSort, setDiscoverSort] = useState<DiscoverSort>('hot')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const isSearching = qParam.length > 0
  const effectiveMainTab: MainFeedTab = isSearching ? 'discover' : mainTab

  const feedType: FeedType = useMemo(
    () => (effectiveMainTab === 'follow' ? 'follow' : discoverSort === 'fresh' ? 'fresh' : 'hot'),
    [effectiveMainTab, discoverSort]
  )

  const feed = useFeed(feedType, category)
  const search = usePostSearch(qParam)

  const feedPosts = feed.data?.pages.flatMap((p) => p.items) ?? []
  const searchPosts = search.data?.pages.flatMap((p) => p.items) ?? []
  const followFallback = feedType === 'follow' && (feed.data?.pages[0]?.followFallback ?? false)
  const feedQueryKey = isSearching ? ['post-search', qParam] : ['feed', feedType, category === 'all' ? 'all' : category]

  const loadMoreClass =
    'px-8 py-2.5 text-sm font-medium text-text-secondary rounded-full border border-[var(--border-subtle)] bg-transparent transition-all duration-300 ease-[var(--ease-out-expo)] hover:text-text-primary hover:bg-nav-hover active:scale-95 disabled:opacity-50 disabled:pointer-events-none'

  return (
    <div>
      {isSearching && (
        <div className="mb-8 flex flex-wrap items-center gap-3 px-1 py-4 text-sm text-text-muted border-b border-[var(--border-subtle)] motion-safe:animate-fade-in-up">
          <span className="font-medium text-text-secondary">{t('feed.resultsFor').replace('{q}', qParam)}</span>
          <Link href="/feed" className="text-text-primary font-medium hover:opacity-70 transition-opacity">
            {t('feed.clearSearch')}
          </Link>
        </div>
      )}

      {!isSearching && (
        <>
          <section className="mb-8 px-1 motion-safe:animate-fade-in-up">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted mb-2 opacity-80">
                  {t('feed.heroEyebrow')}
                </p>
                <h1 className="font-post-serif text-3xl sm:text-4xl font-medium text-text-primary mt-2 tracking-tighter leading-tight">
                  {t('feed.heroTitle')}
                </h1>
                <p className="text-base text-text-secondary mt-3 max-w-2xl leading-relaxed font-normal opacity-90">{t('feed.heroSubtitle')}</p>
              </div>
            </div>
          </section>

          <div className="mb-6">
            <FeedTabs
              mainTab={effectiveMainTab}
              discoverSort={discoverSort}
              category={category}
              onMainTabChange={setMainTab}
              onDiscoverSortChange={setDiscoverSort}
              onCategoryChange={setCategory}
            />
          </div>
        </>
      )}

      {(isSearching ? search.isLoading : feed.isLoading) && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <PostCardSkeleton key={i} />)}
        </div>
      )}

      {!isSearching && feed.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.loadError')}</div>
      )}
      {isSearching && search.error && (
        <div className="text-center py-12 text-text-muted text-sm">{t('feed.searchError')}</div>
      )}

      {!isSearching && followFallback && (
        <div className="mb-6 px-4 py-3 text-sm text-text-secondary leading-relaxed border border-[var(--border-subtle)] rounded-xl bg-[color-mix(in_srgb,var(--text-primary)_2%,var(--bg))]">
          {t('feed.followFallbackBanner')}
        </div>
      )}

      {!isSearching && !feed.isLoading && feedPosts.length === 0 && !feed.error && (
        <div className="text-center py-20 px-4 motion-safe:animate-fade-in-up">
          <IconFeedEmpty className="mx-auto mb-6 text-text-muted opacity-40" />
          <p className="text-base text-text-secondary max-w-sm mx-auto leading-relaxed font-normal">
            {feedType === 'follow' ? t('feed.emptyFollow') : t('feed.empty')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
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
        <div className="text-center py-20 px-4 motion-safe:animate-fade-in-up">
          <IconSearchEmpty className="mx-auto mb-6 text-text-muted opacity-40" />
          <p className="text-base text-text-secondary max-w-sm mx-auto font-normal">{t('feed.searchEmpty').replace('{q}', qParam)}</p>
          <Link href="/feed" className={`${btnSecondary} mt-8`}>
            {t('feed.clearSearch')}
          </Link>
        </div>
      )}

      <div className="divide-y divide-[var(--border-subtle)]">
        {(isSearching ? searchPosts : feedPosts).map((post, index) => (
          <div
            key={post.id}
            className="motion-safe:animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
          >
            <PostCard
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
          </div>
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
    <div className="space-y-4">
      {[0, 1, 2].map((i) => <PostCardSkeleton key={i} />)}
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
