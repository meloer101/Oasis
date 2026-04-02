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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">{t('circles.title')}</h1>
        <Link
          href="/circle/create"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          + {t('circles.create')}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : circles && circles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {circles.map((circle) => (
            <Link
              key={circle.id}
              href={`/circle/${circle.id}`}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 hover:shadow-md transition-shadow flex gap-4"
            >
              <div className="w-14 h-14 rounded-xl bg-emerald-900/35 flex items-center justify-center text-xl font-bold text-emerald-300 shrink-0">
                {circle.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-text-primary">{circle.name}</span>
                  {circle.joinFee > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 font-medium">
                      {formatCoins(circle.joinFee)} coins
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 font-medium">
                      {t('circles.free')}
                    </span>
                  )}
                </div>
                {circle.description ? (
                  <p className="text-sm text-text-muted line-clamp-2 mb-2">{circle.description}</p>
                ) : null}
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>
                    👤 {circle.memberCount} {t('circles.members')}
                  </span>
                  <span>
                    📝 {circle.postCount} {t('circles.posts')}
                  </span>
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
