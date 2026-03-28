'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useLocale } from '@/hooks/use-locale'

export default function CreateCirclePage() {
  const router = useRouter()
  const { t } = useLocale()
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

  const inputClass =
    'w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors'

  return (
    <div className="max-w-lg mx-auto">
      <button
        onClick={() => router.back()}
        className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-5 flex items-center gap-1"
      >
        {t('circle.create.back')}
      </button>

      <h1 className="text-lg font-bold text-text-primary mb-5">{t('circle.create.title')}</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary block mb-1.5">{t('circle.create.name')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('circle.create.namePlaceholder')}
            maxLength={100}
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1.5">
            {t('circle.create.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('circle.create.descriptionPlaceholder')}
            rows={3}
            maxLength={500}
            className={inputClass + ' resize-none'}
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1.5">
            {t('circle.create.visibility')}
          </label>
          <div className="flex gap-3">
            {(['public', 'private'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  visibility === v
                    ? 'bg-emerald-700 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-text-secondary hover:bg-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {v === 'public' ? `🌍 ${t('circle.create.public')}` : `🔒 ${t('circle.create.private')}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1.5">{t('circle.create.joinFee')}</label>
          <input
            type="number"
            min={0}
            value={joinFee}
            onChange={(e) => setJoinFee(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-32 bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-emerald-700 transition-colors"
          />
          <p className="text-xs text-text-muted mt-1">{t('circle.create.joinFeeHint')}</p>
        </div>

        {mutation.isError && <p className="text-sm text-red-400">{t('circle.create.error')}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 py-2 rounded-lg border border-border-subtle text-text-secondary text-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            {t('circle.create.cancel')}
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm transition-colors"
          >
            {mutation.isPending ? t('circle.create.creating') : t('circle.create.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
