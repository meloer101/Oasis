'use client'

import { useWallet, useTransactions } from '@/hooks/use-wallet'
import type { BadgeType } from '@/lib/types'
import { timeAgo, formatCoins } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'
import { WalletSkeleton } from '@/components/ui/skeletons'

const BADGE_META: Record<
  BadgeType,
  { emoji: string; color: string; threshold: number; labelKey: string }
> = {
  newcomer: { emoji: '🌱', color: 'text-sage', threshold: 100, labelKey: 'newcomer' },
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
    return <WalletSkeleton />
  }

  if (!wallet) return null

  const allBadges = Object.entries(BADGE_META) as [BadgeType, (typeof BADGE_META)[BadgeType]][]

  function txLabel(type: string) {
    const key = `wallet.tx.${type}` as const
    const translated = t(key)
    return translated === key ? type : translated
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-medium text-text-primary tracking-tight">{t('wallet.title')}</h1>

      <div className="bg-transparent py-8 border-b border-[var(--border-subtle)]">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-3">{t('wallet.balance')}</p>
        <p className="text-6xl font-medium text-text-primary tabular-nums tracking-tighter">
          {formatCoins(wallet.balance)}
        </p>
        <p className="text-sm text-text-secondary mt-4 font-normal">
          {t('wallet.earnedSpent', {
            earned: formatCoins(wallet.totalEarned),
            spent: formatCoins(wallet.totalSpent),
          })}
        </p>
      </div>

      <div className="py-6 border-b border-[var(--border-subtle)] flex items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-2">{t('wallet.streak.title')}</p>
          <p className="text-3xl font-medium text-orange-500 tracking-tight">
            🔥 {t('wallet.streak.days', { days: wallet.loginStreak })}
          </p>
        </div>
        <p className="text-sm text-text-secondary max-w-[200px] leading-relaxed font-normal">
          {t('wallet.streak.hint')}
        </p>
      </div>

      <div className="py-8 border-b border-[var(--border-subtle)]">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted mb-6 opacity-80">{t('wallet.badgeProgress')}</p>
        <div className="grid gap-4">
          {allBadges.map(([type, meta]) => {
            const earned = wallet.balance >= meta.threshold
            const isCurrent = wallet.currentBadge === type
            const label = t(`wallet.badges.${meta.labelKey}`)
            return (
              <div key={type} className="flex items-center gap-4 group">
                <span className={`text-xl w-10 h-10 flex items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--bg))] ${earned ? '' : 'grayscale opacity-20'}`}>
                  {meta.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${earned ? 'text-text-primary' : 'text-text-muted'}`}>
                      {label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-full bg-text-primary text-[var(--bg)]">
                        {t('wallet.current')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1 bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--bg))] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${earned ? 'bg-text-primary' : 'bg-text-muted/30'}`}
                        style={{ width: `${Math.min((wallet.balance / meta.threshold) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted font-medium tabular-nums">
                      {formatCoins(meta.threshold)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {wallet.nextBadgeThreshold && (
          <p className="text-xs text-text-muted mt-8 font-medium uppercase tracking-widest text-center opacity-60">
            {t('wallet.nextBadge', {
              amount: formatCoins(wallet.nextBadgeThreshold - wallet.balance),
            })}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-6">{t('wallet.transactions')}</p>
        {txList.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-12 font-normal">{t('wallet.noTransactions')}</p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {txList.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-5 group transition-all"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary group-hover:opacity-70 transition-opacity">{txLabel(tx.transactionType)}</p>
                  <p className="text-xs text-text-muted mt-1 font-normal">{timeAgo(tx.createdAt)}</p>
                </div>
                <span
                  className={`text-base font-medium tabular-nums shrink-0 tracking-tight ${
                    tx.isCredit ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {tx.isCredit ? '+' : '−'}
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
            className="w-full mt-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-text-muted hover:text-text-primary transition-all border border-[var(--border-subtle)] rounded-full hover:bg-nav-hover active:scale-95"
          >
            {isFetchingNextPage ? t('wallet.loadingMore') : t('wallet.loadMore')}
          </button>
        )}
      </div>
    </div>
  )
}
