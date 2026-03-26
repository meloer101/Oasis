'use client'

import type { FeedType } from '@/lib/types'

interface Props {
  active: FeedType
  onChange: (feed: FeedType) => void
}

const TABS: { value: FeedType; label: string }[] = [
  { value: 'hot', label: '🔥 Hot' },
  { value: 'fresh', label: '✨ Fresh' },
  { value: 'follow', label: '👥 Following' },
]

export default function FeedTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b border-zinc-800 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.value
              ? 'border-emerald-500 text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
