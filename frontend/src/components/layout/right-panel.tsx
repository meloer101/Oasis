'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { formatCoins } from '@/lib/utils'
import type { Tag, Circle } from '@/lib/types'

function useHotTags() {
  return useQuery<Tag[]>({
    queryKey: ['hot-tags'],
    queryFn: async () => {
      const res = await apiClient.get('/api/tags?limit=8')
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}

function useTopCircles() {
  return useQuery<Circle[]>({
    queryKey: ['top-circles'],
    queryFn: async () => {
      const res = await apiClient.get('/api/circles')
      return res.data.slice(0, 5)
    },
    staleTime: 5 * 60_000,
  })
}

export default function RightPanel() {
  const { balance, user } = useAuth()
  const { data: tags } = useHotTags()
  const { data: circles } = useTopCircles()

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 sticky top-0 h-screen px-4 py-6 space-y-5 overflow-y-auto border-l border-zinc-800/50">
      {/* Balance summary */}
      <div className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-1">余额</p>
        <p className="text-2xl font-bold text-emerald-400 tabular-nums">
          {formatCoins(balance)}
        </p>
        <Link
          href="/wallet"
          className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors mt-1 block"
        >
          查看钱包 →
        </Link>
      </div>

      {/* Hot tags */}
      {tags && tags.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 mb-2.5 uppercase tracking-wide">热门标签</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.name}`}
                className="text-xs px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-zinc-700 transition-colors"
              >
                #{tag.name}
                <span className="text-zinc-700 ml-1">{tag.postCount}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rising circles */}
      {circles && circles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 mb-2.5 uppercase tracking-wide">热门圈子</p>
          <div className="space-y-2">
            {circles.map((circle) => (
              <Link
                key={circle.id}
                href={`/circle/${circle.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
              >
                <span className="text-sm text-zinc-300 group-hover:text-emerald-400 transition-colors truncate">
                  {circle.name}
                </span>
                <span className="text-xs text-zinc-600 shrink-0 ml-2">
                  {circle.memberCount} 人
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/circle/create"
            className="text-xs text-zinc-600 hover:text-emerald-400 transition-colors mt-2 block"
          >
            ＋ 创建圈子
          </Link>
        </div>
      )}

      {/* Footer */}
      {user && (
        <div className="text-xs text-zinc-700 mt-auto">
          <Link href="/settings" className="hover:text-zinc-500 transition-colors">设置</Link>
          {' · '}
          <span>Oasis v0.1</span>
        </div>
      )}
    </aside>
  )
}
