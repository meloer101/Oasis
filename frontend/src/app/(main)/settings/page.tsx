'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { ThemeSelect } from '@/components/theme/theme-select'
import { LangSwitch } from '@/components/i18n/lang-switch'

export default function SettingsPage() {
  const { user, refreshBalance } = useAuth()
  const { t } = useLocale()
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
      <h1 className="text-lg font-bold text-text-primary mb-6">{t('settings.title')}</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-text-secondary block mb-1.5">{t('theme.appearance')}</label>
          <ThemeSelect />
        </div>

        <div>
          <LangSwitch />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1.5">{t('settings.username')}</label>
          <p className="text-sm text-text-primary bg-zinc-200/80 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
            @{user?.username}
          </p>
          <p className="text-xs text-text-muted mt-1">{t('settings.usernameReadonly')}</p>
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1.5">{t('settings.displayName')}</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user?.username}
            maxLength={100}
            className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1.5">{t('settings.bio')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('settings.bioPlaceholder')}
            rows={3}
            maxLength={500}
            className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-1.5">{t('settings.avatarUrl')}</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-400">{t('settings.saveError')}</p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm transition-colors"
        >
          {mutation.isPending ? t('settings.saving') : saved ? `✓ ${t('settings.saved')}` : t('settings.save')}
        </button>
      </div>
    </div>
  )
}
