'use client'

import { useWallet, useTransactions } from '@/hooks/use-wallet'
import type { BadgeType } from '@/lib/types'
import { timeAgo, formatCoins } from '@/lib/utils'

const BADGE_META: Record<BadgeType, { label: string; emoji: string; color: string; threshold: number }> = {
  newcomer: { label: '新芽', emoji: '🌱', color: 'text-emerald-400', threshold: 100 },
  resonator: { label: '共鸣者', emoji: '⚡', color: 'text-blue-400', threshold: 500 },
  vibe_master: { label: 'Vibe Master', emoji: '🔥', color: 'text-orange-400', threshold: 2000 },
  founder: { label: '创始人', emoji: '🏔️', color: 'text-yellow-400', threshold: 5000 },
}

const TX_LABELS: Record<string, string> = {
  daily_distribution: '每日签到奖励',
  post_reward: '发帖奖励',
  comment_reward: '评论奖励',
  vote_received: '帖子被认同',
  transaction_fee_burned: '平台手续费',
  circle_join_fee: '加入圈子',
  system_mint: '系统发放',
}

export default function WalletPage() {
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

  const allBadges = Object.entries(BADGE_META) as [BadgeType, typeof BADGE_META[BadgeType]][]

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-zinc-100">钱包</h1>

      {/* Balance card */}
      <div className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-5">
        <p className="text-sm text-zinc-500 mb-1">Agreecoin 余额</p>
        <p className="text-4xl font-bold text-emerald-400 tabular-nums">
          {formatCoins(wallet.balance)}
        </p>
        <p className="text-xs text-zinc-600 mt-1">
          累计获得 {formatCoins(wallet.totalEarned)} · 累计花费 {formatCoins(wallet.totalSpent)}
        </p>
      </div>

      {/* Badge progress */}
      <div className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-5">
        <p className="text-sm font-semibold text-zinc-300 mb-4">徽章进度</p>
        <div className="space-y-3">
          {allBadges.map(([type, meta]) => {
            const earned = wallet.balance >= meta.threshold
            const isCurrent = wallet.currentBadge === type
            return (
              <div key={type} className="flex items-center gap-3">
                <span className={`text-lg w-7 text-center ${earned ? '' : 'grayscale opacity-30'}`}>
                  {meta.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${earned ? meta.color : 'text-zinc-600'}`}>
                      {meta.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        当前
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${earned ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        style={{ width: `${Math.min((wallet.balance / meta.threshold) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-zinc-600 shrink-0">
                      {formatCoins(meta.threshold)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {wallet.nextBadgeThreshold && (
          <p className="text-xs text-zinc-600 mt-4">
            距下一级还需 {formatCoins(wallet.nextBadgeThreshold - wallet.balance)} 枚认同币
          </p>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <p className="text-sm font-semibold text-zinc-300 mb-3">收支明细</p>
        {txList.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">暂无记录</p>
        ) : (
          <div className="space-y-px">
            {txList.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2.5 px-4 bg-zinc-900 border border-zinc-800/50 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-sm text-zinc-300">
                    {TX_LABELS[tx.transactionType] ?? tx.transactionType}
                  </p>
                  <p className="text-xs text-zinc-600">{timeAgo(tx.createdAt)}</p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    tx.isCredit ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {tx.isCredit ? '+' : ''}{tx.displayAmount}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full mt-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isFetchingNextPage ? '加载中…' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  )
}
