'use client'

import { useLocale } from '@/hooks/use-locale'
import type { PostCategory } from '@/lib/types'

export type MainFeedTab = 'discover' | 'follow'
export type DiscoverSort = 'hot' | 'fresh'
export type CategoryFilter = 'all' | PostCategory

interface Props {
  mainTab: MainFeedTab
  discoverSort: DiscoverSort
  category: CategoryFilter
  onMainTabChange: (tab: MainFeedTab) => void
  onDiscoverSortChange: (sort: DiscoverSort) => void
  onCategoryChange: (cat: CategoryFilter) => void
}

const segTrack =
  'inline-flex rounded-lg border border-[var(--card-border)] bg-[var(--surface)] p-0.5 gap-0.5 w-fit shadow-[0_1px_0_rgb(0_0_0/0.03)] dark:shadow-none'
const segBtnBase =
  'px-3.5 py-2 text-sm font-semibold rounded-md transition-[color,background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out-expo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]'
const segActive =
  'bg-[var(--card-bg)] text-text-primary border border-[var(--card-border)] shadow-sm dark:shadow-[0_1px_0_rgb(255_255_255/0.06)]'
const segInactive = 'text-text-secondary border border-transparent hover:text-text-primary hover:bg-[color-mix(in_srgb,var(--card-bg)_65%,transparent)]'

const subTrack = 'inline-flex rounded-lg border border-[var(--card-border)] bg-[var(--surface)] p-0.5 gap-0.5'
const subBtnBase =
  'px-3 py-1.5 text-xs font-semibold rounded-md transition-[color,background-color,border-color,box-shadow] duration-200 ease-[var(--ease-out-expo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]'
const subActive =
  'text-text-primary bg-[var(--card-bg)] border border-[color-mix(in_srgb,var(--text-primary)_18%,var(--card-border))] shadow-sm'
const subInactive =
  'text-text-secondary border border-transparent hover:text-text-primary hover:bg-[color-mix(in_srgb,var(--card-bg)_55%,transparent)]'

const CATEGORIES: CategoryFilter[] = ['all', 'idea', 'tech', 'else']

export default function FeedTabs({
  mainTab,
  discoverSort,
  category,
  onMainTabChange,
  onDiscoverSortChange,
  onCategoryChange,
}: Props) {
  const { t } = useLocale()

  return (
    <div className="mb-5 flex flex-col gap-3 motion-safe:animate-fade-in-up">
      <div className={segTrack} role="tablist" aria-label={t('feed.ariaMainTabs')}>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'discover'}
          onClick={() => onMainTabChange('discover')}
          className={`${segBtnBase} ${mainTab === 'discover' ? segActive : segInactive}`}
        >
          {t('feed.tabDiscover')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'follow'}
          onClick={() => onMainTabChange('follow')}
          className={`${segBtnBase} ${mainTab === 'follow' ? segActive : segInactive}`}
        >
          {t('feed.tabFollowing')}
        </button>
      </div>

      {mainTab === 'discover' ? (
        <div className={subTrack} role="tablist" aria-label={t('feed.ariaSortTabs')}>
          <button
            type="button"
            role="tab"
            aria-selected={discoverSort === 'hot'}
            onClick={() => onDiscoverSortChange('hot')}
            className={`${subBtnBase} ${discoverSort === 'hot' ? subActive : subInactive}`}
          >
            {t('feed.subHot')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={discoverSort === 'fresh'}
            onClick={() => onDiscoverSortChange('fresh')}
            className={`${subBtnBase} ${discoverSort === 'fresh' ? subActive : subInactive}`}
          >
            {t('feed.subLatest')}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('feed.ariaCategoryFilter')}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-[color,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-expo)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 ${
              category === cat
                ? 'bg-[var(--card-bg)] text-text-primary border-[color-mix(in_srgb,var(--text-primary)_22%,var(--card-border))] shadow-sm'
                : 'text-text-secondary border-[var(--card-border)] hover:text-text-primary hover:border-[color-mix(in_srgb,var(--text-primary)_14%,var(--card-border))]'
            }`}
          >
            {t(`feed.category.${cat}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>
    </div>
  )
}
