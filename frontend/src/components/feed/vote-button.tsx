'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { formatCoins } from '@/lib/utils'

interface Props {
  postId: string
  voterCount: number
  totalVoteAmount: number
  queryKey: string[]
}

export default function VoteButton({ postId, voterCount, totalVoteAmount, queryKey }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(10)
  const [voted, setVoted] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (amt: number) => apiClient.post('/api/votes', { postId, amount: amt }),
    onSuccess: () => {
      setVoted(true)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      const code = (err as { response?: { data?: { code?: string } } }).response?.data?.code
      if (code === 'ALREADY_VOTED') setVoted(true)
      setOpen(false)
    },
  })

  if (voted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
        ✓ Agreed
      </span>
    )
  }

  if (open) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          onClick={() => setAmount((a) => Math.max(1, a - 5))}
          className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm flex items-center justify-center transition-colors"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={10000}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-center text-sm text-zinc-100 focus:outline-none focus:border-emerald-700"
        />
        <button
          onClick={() => setAmount((a) => a + 5)}
          className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm flex items-center justify-center transition-colors"
        >
          ＋
        </button>
        <button
          onClick={() => mutation.mutate(amount)}
          disabled={mutation.isPending}
          className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
        >
          {mutation.isPending ? '…' : '✓'}
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
      <span>Agree</span>
      {voterCount > 0 && (
        <span className="text-zinc-600">
          · {voterCount} · {formatCoins(totalVoteAmount)} coins
        </span>
      )}
    </button>
  )
}
