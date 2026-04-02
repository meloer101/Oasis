'use client'

import { useLocale } from '@/hooks/use-locale'

export type MainFeedTab = 'discover' | 'follow'
export type DiscoverSort = 'hot' | 'fresh'

interface Props {
  mainTab: MainFeedTab
  discoverSort: DiscoverSort
  onMainTabChange: (tab: MainFeedTab) => void
  onDiscoverSortChange: (sort: DiscoverSort) => void
}

export default function FeedTabs({
  mainTab,
  discoverSort,
  onMainTabChange,
  onDiscoverSortChange,
}: Props) {
  const { t } = useLocale()

  return (
    <div className="mb-4">
      <div className="flex gap-1 border-b border-border-subtle">
        <button
          type="button"
          onClick={() => onMainTabChange('discover')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            mainTab === 'discover'
              ? 'border-emerald-500 text-text-primary'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          {t('feed.tabDiscover')}
        </button>
        <button
          type="button"
          onClick={() => onMainTabChange('follow')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            mainTab === 'follow'
              ? 'border-emerald-500 text-text-primary'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          {t('feed.tabFollowing')}
        </button>
      </div>

      {mainTab === 'discover' ? (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => onDiscoverSortChange('hot')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              discoverSort === 'hot'
                ? 'bg-emerald-600 text-white'
                : 'bg-nav-hover text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('feed.subHot')}
          </button>
          <button
            type="button"
            onClick={() => onDiscoverSortChange('fresh')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              discoverSort === 'fresh'
                ? 'bg-emerald-600 text-white'
                : 'bg-nav-hover text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('feed.subLatest')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
