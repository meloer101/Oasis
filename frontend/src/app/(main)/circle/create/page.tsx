'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export default function CreateCirclePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [joinFee, setJoinFee] = useState(0)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post('/api/circles', { name, description, joinFee, visibility }),
    onSuccess: (res) => {
      router.push(`/circle/${res.data.id}`)
    },
  })

  return (
    <div className="max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-5 flex items-center gap-1"
      >
        ← 返回
      </button>

      <h1 className="text-lg font-bold text-zinc-100 mb-5">创建圈子</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">圈子名称 *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：AI 工具圈"
            maxLength={100}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">圈子简介</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="介绍一下这个圈子…"
            rows={3}
            maxLength={500}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">可见性</label>
          <div className="flex gap-3">
            {(['public', 'private'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  visibility === v
                    ? 'bg-emerald-700 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {v === 'public' ? '🌍 公开' : '🔒 私密'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">加入费用（认同币）</label>
          <input
            type="number"
            min={0}
            value={joinFee}
            onChange={(e) => setJoinFee(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-32 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-700 transition-colors"
          />
          <p className="text-xs text-zinc-600 mt-1">设为 0 表示免费加入</p>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-400">创建失败，请重试</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:border-zinc-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm transition-colors"
          >
            {mutation.isPending ? '创建中…' : '创建圈子'}
          </button>
        </div>
      </div>
    </div>
  )
}
