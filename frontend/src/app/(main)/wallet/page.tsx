'use client'

import { useWallet, useTransactions } from '@/hooks/use-wallet'
import type { BadgeType } from '@/lib/types'
import { timeAgo, formatCoins } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'

const BADGE_META: Record<
  BadgeType,
  { emoji: string; color: string; threshold: number; labelKey: string }
> = {
  newcomer: { emoji: '🌱', color: 'text-emerald-400', threshold: 100, labelKey: 'newcomer' },
  resonator: { emoji: '⚡', color: 'text-blue-400', threshold: 500, labelKey: 'resonator' },
  vibe_master: { emoji: '🔥', color: 'text-orange-400', threshold: 2000, labelKey: 'vibe_master' },
  founder: { emoji: '🏔️', color: 'text-yellow-400', threshold: 5000, labelKey: 'founder' },
}

export default function WalletPage() {
  const { t } = useLocale()
  const { data: wallet, isLoading } = useWallet()
  const { data: txPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useTransactions()

  const txList = txPages?.pages.flat() ?? []

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!wallet) return null

  const allBadges = Object.entries(BADGE_META) as [BadgeType, (typeof BADGE_META)[BadgeType]][]

  function txLabel(type: string) {
    const key = `wallet.tx.${type}` as const
    const translated = t(key)
    return translated === key ? type : translated
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-text-primary">{t('wallet.title')}</h1>

      <div className="bg-surface border border-border-subtle rounded-xl p-5">
        <p className="text-sm text-text-muted mb-1">{t('wallet.balance')}</p>
        <p className="text-4xl font-bold text-emerald-400 tabular-nums">
          {formatCoins(wallet.balance)}
        </p>
        <p className="text-xs text-text-muted mt-1">
          {t('wallet.earnedSpent', {
            earned: formatCoins(wallet.totalEarned),
            spent: formatCoins(wallet.totalSpent),
          })}
        </p>
      </div>

      <div className="bg-surface border border-border-subtle rounded-xl p-5">
        <p className="text-sm font-semibold text-text-primary mb-4">{t('wallet.badgeProgress')}</p>
        <div className="space-y-3">
          {allBadges.map(([type, meta]) => {
            const earned = wallet.balance >= meta.threshold
            const isCurrent = wallet.currentBadge === type
            const label = t(`wallet.badges.${meta.labelKey}`)
            return (
              <div key={type} className="flex items-center gap-3">
                <span className={`text-lg w-7 text-center ${earned ? '' : 'grayscale opacity-30'}`}>
                  {meta.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${earned ? meta.color : 'text-text-muted'}`}>
                      {label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-text-secondary">
                        {t('wallet.current')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${earned ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-700'}`}
                        style={{ width: `${Math.min((wallet.balance / meta.threshold) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-text-muted shrink-0">
                      {formatCoins(meta.threshold)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {wallet.nextBadgeThreshold && (
          <p className="text-xs text-text-muted mt-4">
            {t('wallet.nextBadge', {
              amount: formatCoins(wallet.nextBadgeThreshold - wallet.balance),
            })}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-text-primary mb-3">{t('wallet.transactions')}</p>
        {txList.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">{t('wallet.noTransactions')}</p>
        ) : (
          <div className="space-y-px">
            {txList.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2.5 px-4 bg-surface border border-border-subtle rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-sm text-text-primary">{txLabel(tx.transactionType)}</p>
                  <p className="text-xs text-text-muted">{timeAgo(tx.createdAt)}</p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    tx.isCredit ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {tx.isCredit ? '+' : ''}
                  {tx.displayAmount}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full mt-3 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {isFetchingNextPage ? t('wallet.loadingMore') : t('wallet.loadMore')}
          </button>
        )}
      </div>
    </div>
  )
}
