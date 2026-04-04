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
    'w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors'

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
                    ? 'bg-brand text-brand-foreground'
                    : 'bg-brand-muted dark:bg-input text-text-secondary hover:bg-input'
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
            className="w-32 bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand transition-colors"
          />
          <p className="text-xs text-text-muted mt-1">{t('circle.create.joinFeeHint')}</p>
        </div>

        {mutation.isError && <p className="text-sm text-red-400">{t('circle.create.error')}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 py-2 rounded-lg border border-border-subtle text-text-secondary text-sm hover:border-brand/35 transition-colors"
          >
            {t('circle.create.cancel')}
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="flex-1 py-2 rounded-lg bg-brand hover:opacity-90 disabled:opacity-40 text-brand-foreground text-sm transition-opacity"
          >
            {mutation.isPending ? t('circle.create.creating') : t('circle.create.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
