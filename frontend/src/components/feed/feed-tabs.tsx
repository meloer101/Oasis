'use client'

import type { FeedType } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'

interface Props {
  active: FeedType
  onChange: (feed: FeedType) => void
}

export default function FeedTabs({ active, onChange }: Props) {
  const { t } = useLocale()

  const TABS: { value: FeedType; label: string }[] = [
    { value: 'hot', label: t('feed.tabHot') },
    { value: 'fresh', label: t('feed.tabFresh') },
    { value: 'follow', label: t('feed.tabFollow') },
  ]

  return (
    <div className="flex gap-1 border-b border-border-subtle mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.value
              ? 'border-emerald-500 text-text-primary'
              : 'border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
