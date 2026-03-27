'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { formatCoins } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

interface Props {
  postId: string
  voterCount: number
  totalVoteAmount: number
  hasVoted: boolean
  queryKey: string[]
}

const QUICK_AMOUNTS = [1, 5, 10, 20, 50]

export default function VoteButton({
  postId,
  voterCount,
  totalVoteAmount,
  hasVoted: initialHasVoted,
  queryKey,
}: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(10)
  const [voted, setVoted] = useState(initialHasVoted)
  const queryClient = useQueryClient()
  const { refreshBalance } = useAuth()

  const mutation = useMutation({
    mutationFn: (amt: number) => apiClient.post('/api/votes', { postId, amount: amt }),
    onSuccess: () => {
      setVoted(true)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey })
      refreshBalance()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      if (msg === 'ALREADY_VOTED') setVoted(true)
      setOpen(false)
    },
  })

  if (voted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
        ✓ 已认同
        {voterCount > 0 && (
          <span className="text-zinc-600">
            · {voterCount} 人 · {formatCoins(totalVoteAmount)} 币
          </span>
        )}
      </span>
    )
  }

  if (open) {
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        {/* Quick pick buttons */}
        <div className="flex items-center gap-1">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                amount === q
                  ? 'bg-emerald-700 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
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
          className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-center text-sm text-zinc-100 focus:outline-none focus:border-emerald-700"
        />
        <button
          onClick={() => mutation.mutate(amount)}
          disabled={mutation.isPending}
          className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
        >
          {mutation.isPending ? '…' : '确认投币'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-1"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors font-medium"
    >
      <span>⚡</span>
      <span>认同</span>
      {voterCount > 0 && (
        <span className="text-zinc-600">
          · {voterCount} · {formatCoins(totalVoteAmount)} 币
        </span>
      )}
    </button>
  )
}
