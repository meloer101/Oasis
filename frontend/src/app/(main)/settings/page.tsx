'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'

export default function SettingsPage() {
  const { user, refreshBalance } = useAuth()
  const queryClient = useQueryClient()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patch('/api/users/me', {
        ...(displayName ? { displayName } : {}),
        ...(bio ? { bio } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      }),
    onSuccess: async () => {
      await refreshBalance()
      queryClient.invalidateQueries({ queryKey: ['user', user?.username] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-bold text-zinc-100 mb-6">设置</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">用户名</label>
          <p className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg px-3 py-2">
            @{user?.username}
          </p>
          <p className="text-xs text-zinc-600 mt-1">用户名暂不支持修改</p>
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">显示名称</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user?.username}
            maxLength={100}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">个人简介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="介绍一下自己…"
            rows={3}
            maxLength={500}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-1.5">头像 URL</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-400">保存失败，请重试</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm transition-colors"
        >
          {mutation.isPending ? '保存中…' : saved ? '✓ 已保存' : '保存更改'}
        </button>
      </div>
    </div>
  )
}
