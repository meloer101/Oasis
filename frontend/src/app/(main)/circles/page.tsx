'use client'

import Link from 'next/link'
import { useCircles } from '@/hooks/use-circle'
import { formatCoins } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'

export default function CirclesPage() {
  const { data: circles, isLoading } = useCircles()
  const { t } = useLocale()

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-text-primary">{t('circles.title')}</h1>
        <Link
          href="/circle/create"
          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm transition-colors"
        >
          + {t('circles.create')}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : circles && circles.length > 0 ? (
        <div className="space-y-3">
          {circles.map((circle) => (
            <Link
              key={circle.id}
              href={`/circle/${circle.id}`}
              className="block bg-surface border border-border-subtle rounded-xl px-4 py-3 hover:border-zinc-400/50 dark:hover:border-zinc-600/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text-primary">{circle.name}</span>
                    {circle.joinFee > 0 ? (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        {formatCoins(circle.joinFee)} coins
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        {t('circles.free')}
                      </span>
                    )}
                  </div>
                  {circle.description && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-2">{circle.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>👤 {circle.memberCount} {t('circles.members')}</span>
                    <span>📝 {circle.postCount} {t('circles.posts')}</span>
                  </div>
                </div>
                <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center text-lg font-bold text-emerald-200">
                  {circle.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center py-16 text-text-muted text-sm">{t('circles.empty')}</p>
      )}
    </div>
  )
}
