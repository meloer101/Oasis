'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { formatCoins } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'

interface Props {
  postId: string
  voterCount: number
  totalVoteAmount: number
  disagreeVoteAmount: number
  userVoteType: 'agree' | 'disagree' | null
  queryKey: string[]
  isAuthorCapReached?: boolean
}

type UIState = 'idle' | 'selecting-agree' | 'selecting-disagree'

const QUICK_AMOUNTS = [1, 5, 10, 20, 50]

export default function VoteButton({
  postId,
  voterCount,
  totalVoteAmount,
  disagreeVoteAmount,
  userVoteType: initialVoteType,
  queryKey,
  isAuthorCapReached = false,
}: Props) {
  const [uiState, setUIState] = useState<UIState>('idle')
  const [amount, setAmount] = useState(10)
  const [votedType, setVotedType] = useState<'agree' | 'disagree' | null>(initialVoteType)
  const queryClient = useQueryClient()
  const { refreshBalance } = useAuth()
  const { t } = useLocale()

  const mutation = useMutation({
    mutationFn: ({ amt, voteType }: { amt: number; voteType: 'agree' | 'disagree' }) =>
      apiClient.post('/api/votes', { postId, amount: amt, voteType }),
    onSuccess: (_data, variables) => {
      setVotedType(variables.voteType)
      setUIState('idle')
      queryClient.invalidateQueries({ queryKey })
      refreshBalance()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      if (msg === 'ALREADY_VOTED') setVotedType('agree') // fallback: treat as agreed
      setUIState('idle')
    },
  })

  // Already voted — show result
  if (votedType !== null) {
    const isAgree = votedType === 'agree'
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          isAgree ? 'text-emerald-500' : 'text-orange-400'
        }`}
      >
        {isAgree ? '✓' : '✗'} {isAgree ? t('vote.agreed') : t('vote.disagreed')}
        {voterCount > 0 && (
          <span className="text-text-muted">
            {isAgree
              ? t('vote.peopleCoins', { count: voterCount, amount: formatCoins(totalVoteAmount) })
              : t('vote.disagreeStats', { amount: formatCoins(disagreeVoteAmount) })}
          </span>
        )}
      </span>
    )
  }

  // Amount selector open
  if (uiState === 'selecting-agree' || uiState === 'selecting-disagree') {
    const isAgree = uiState === 'selecting-agree'
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {isAgree && isAuthorCapReached && (
          <span className="w-full text-xs text-amber-500/80 mb-0.5">
            ℹ️ {t('vote.capReached')}
          </span>
        )}
        <div className="flex items-center gap-1">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                amount === q
                  ? isAgree
                    ? 'bg-emerald-700 text-white'
                    : 'bg-orange-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-text-secondary hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={10000}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-14 bg-zinc-200 dark:bg-zinc-800 border border-border-subtle rounded px-2 py-0.5 text-center text-sm text-text-primary focus:outline-none focus:border-emerald-700"
        />
        <button
          onClick={() => mutation.mutate({ amt: amount, voteType: isAgree ? 'agree' : 'disagree' })}
          disabled={mutation.isPending}
          className={`px-2.5 py-0.5 rounded disabled:opacity-50 text-white text-xs font-medium transition-colors ${
            isAgree
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-orange-600 hover:bg-orange-500'
          }`}
        >
          {mutation.isPending ? '…' : isAgree ? t('vote.confirm') : t('vote.disagreeConfirm')}
        </button>
        <button
          onClick={() => setUIState('idle')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors px-1"
        >
          ✕
        </button>
      </div>
    )
  }

  // Idle — show both buttons
  return (
    <div className="inline-flex items-center gap-3">
      <button
        onClick={() => setUIState('selecting-agree')}
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-emerald-400 transition-colors font-medium"
      >
        <span>⚡</span>
        <span>{t('vote.agree')}</span>
        {totalVoteAmount > 0 && (
          <span className="text-text-muted">
            {t('vote.shortStats', { count: voterCount, amount: formatCoins(totalVoteAmount) })}
          </span>
        )}
      </button>
      <button
        onClick={() => setUIState('selecting-disagree')}
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-orange-400 transition-colors font-medium"
      >
        <span>💧</span>
        <span>{t('vote.disagree')}</span>
        {disagreeVoteAmount > 0 && (
          <span className="text-text-muted">{formatCoins(disagreeVoteAmount)}</span>
        )}
      </button>
    </div>
  )
}
