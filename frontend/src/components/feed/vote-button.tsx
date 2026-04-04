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
  variant?: 'default' | 'compact' | 'rail'
  /** Full-width two-column agree / question buttons (post detail stake card) */
  stackedActions?: boolean
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
  variant = 'default',
  stackedActions = false,
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
      if (msg === 'ALREADY_VOTED') setVotedType('agree')
      setUIState('idle')
    },
  })

  if (votedType !== null) {
    const isAgree = votedType === 'agree'
    if (variant === 'compact') {
      return (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${
            isAgree ? 'text-sage' : 'text-orange-400'
          }`}
        >
          {isAgree ? '✓' : '✗'} {isAgree ? '⚡' : ''}{' '}
          {isAgree
            ? formatCoins(totalVoteAmount)
            : formatCoins(disagreeVoteAmount)}
        </span>
      )
    }
    if (variant === 'rail') {
      return (
        <div
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${
            isAgree ? 'text-sage' : 'text-orange-400'
          }`}
        >
          <span className="text-lg">{isAgree ? '✓' : '✗'}</span>
          <span>{isAgree ? '⚡' : '💧'}</span>
        </div>
      )
    }
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          isAgree ? 'text-sage' : 'text-orange-400'
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

  if (uiState === 'selecting-agree' || uiState === 'selecting-disagree') {
    const isAgree = uiState === 'selecting-agree'
    const panel = (
      <>
        {isAgree && isAuthorCapReached && (
          <span className="w-full text-[10px] text-amber-500/80 mb-1 block">{t('vote.capReached')}</span>
        )}
        <div className="flex flex-wrap items-center gap-1">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                amount === q
                  ? isAgree
                    ? 'bg-sage text-text-primary'
                    : 'bg-orange-600 text-white'
                  : 'bg-brand-muted dark:bg-input text-text-secondary hover:bg-input'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <input
            type="number"
            min={1}
            max={10000}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 bg-brand-muted dark:bg-input border border-border-subtle rounded px-1 py-0.5 text-center text-xs text-text-primary focus:outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => mutation.mutate({ amt: amount, voteType: isAgree ? 'agree' : 'disagree' })}
            disabled={mutation.isPending}
            className={`px-2 py-0.5 rounded disabled:opacity-50 text-white text-[10px] font-medium transition-colors ${
              isAgree ? 'bg-sage hover:bg-sage-hover text-text-primary' : 'bg-orange-600 hover:bg-orange-500'
            }`}
          >
            {mutation.isPending ? '…' : isAgree ? t('vote.confirm') : t('vote.disagreeConfirm')}
          </button>
          <button
            type="button"
            onClick={() => setUIState('idle')}
            className="text-[10px] text-text-muted hover:text-text-secondary px-1"
          >
            ✕
          </button>
        </div>
      </>
    )

    if (variant === 'rail') {
      return (
        <div className="relative flex flex-col items-center gap-1">
          <div className="absolute left-full ml-3 top-0 z-30 w-52 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-xl">
            {panel}
          </div>
          <button
            type="button"
            onClick={() => setUIState('idle')}
            className="text-[10px] text-text-muted hover:text-text-secondary px-2 py-1 rounded-lg border border-transparent hover:border-border-subtle"
          >
            ✕
          </button>
        </div>
      )
    }

    if (variant === 'compact') {
      return <div className="inline-flex flex-col gap-1 max-w-[200px]">{panel}</div>
    }

    return <div className="inline-flex items-center gap-1.5 flex-wrap">{panel}</div>
  }

  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUIState('selecting-agree')}
          className="inline-flex items-center gap-0.5 text-xs text-text-secondary hover:text-sage font-medium"
        >
          <span>⚡</span>
          <span>{voterCount || totalVoteAmount > 0 ? formatCoins(totalVoteAmount) : ''}</span>
        </button>
        <button
          type="button"
          onClick={() => setUIState('selecting-disagree')}
          className="inline-flex items-center gap-0.5 text-xs text-text-secondary hover:text-orange-400 font-medium"
        >
          <span>💧</span>
          {disagreeVoteAmount > 0 ? <span>{formatCoins(disagreeVoteAmount)}</span> : null}
        </button>
      </div>
    )
  }

  if (variant === 'rail') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setUIState('selecting-agree')}
          className="w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col items-center justify-center text-sm hover:border-sage/60 transition-colors"
          title={t('vote.agree')}
        >
          <span>⚡</span>
          {totalVoteAmount > 0 && (
            <span className="text-[9px] text-text-muted leading-none">{formatCoins(totalVoteAmount)}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setUIState('selecting-disagree')}
          className="w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col items-center justify-center text-sm hover:border-orange-500/50 transition-colors"
          title={t('vote.disagree')}
        >
          <span>💧</span>
          {disagreeVoteAmount > 0 && (
            <span className="text-[9px] text-text-muted leading-none">{formatCoins(disagreeVoteAmount)}</span>
          )}
        </button>
      </div>
    )
  }

  const agreeBtnClass = stackedActions
    ? 'flex flex-col items-center justify-center gap-0.5 w-full py-3 rounded-xl bg-brand text-brand-foreground text-sm font-semibold hover:opacity-90 transition-opacity'
    : 'inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-sage transition-colors font-medium'
  const disagreeBtnClass = stackedActions
    ? 'flex flex-col items-center justify-center gap-0.5 w-full py-3 rounded-xl border-2 border-brand/50 bg-transparent text-text-primary text-sm font-semibold hover:bg-nav-hover transition-colors'
    : 'inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-orange-400 transition-colors font-medium'

  return (
    <div className={stackedActions ? 'grid grid-cols-2 gap-2 w-full' : 'inline-flex items-center gap-3'}>
      <button type="button" onClick={() => setUIState('selecting-agree')} className={agreeBtnClass}>
        <span>⚡</span>
        <span>{stackedActions ? t('vote.verifyAgreement') : t('vote.agree')}</span>
        {!stackedActions && totalVoteAmount > 0 && (
          <span className="text-text-muted">
            {t('vote.shortStats', { count: voterCount, amount: formatCoins(totalVoteAmount) })}
          </span>
        )}
      </button>
      <button type="button" onClick={() => setUIState('selecting-disagree')} className={disagreeBtnClass}>
        <span>💧</span>
        <span>{stackedActions ? t('vote.challengeInsight') : t('vote.disagree')}</span>
        {!stackedActions && disagreeVoteAmount > 0 && (
          <span className="text-text-muted">{formatCoins(disagreeVoteAmount)}</span>
        )}
      </button>
    </div>
  )
}
