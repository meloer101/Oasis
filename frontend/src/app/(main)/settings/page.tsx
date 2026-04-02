'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { ThemeSelect } from '@/components/theme/theme-select'
import { LangSwitch } from '@/components/i18n/lang-switch'

type MeUser = NonNullable<ReturnType<typeof useAuth>['user']>

function SettingsProfileForm({
  user,
  refreshBalance,
  queryClient,
}: {
  user: MeUser
  refreshBalance: () => Promise<void>
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const { t } = useLocale()
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '')
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patch('/api/users/me', {
        displayName: displayName.trim() === '' ? null : displayName.trim(),
        bio: bio.trim() === '' ? null : bio.trim(),
        avatarUrl: avatarUrl.trim() === '' ? null : avatarUrl.trim(),
      }),
    onSuccess: async (res) => {
      const u = res.data as MeUser
      setDisplayName(u.displayName ?? '')
      setBio(u.bio ?? '')
      setAvatarUrl(u.avatarUrl ?? '')
      await refreshBalance()
      queryClient.invalidateQueries({ queryKey: ['user', user.username] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const apiErr =
    mutation.isError && isAxiosError(mutation.error)
      ? (mutation.error.response?.data as { error?: string } | undefined)?.error
      : undefined

  return (
    <>
      <div>
        <label className="text-sm text-text-secondary block mb-1.5">{t('settings.displayName')}</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={user.username}
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
        <p className="text-sm text-red-400">
          {t('settings.saveError')}
          {apiErr ? ` — ${apiErr}` : ''}
        </p>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm transition-colors"
      >
        {mutation.isPending ? t('settings.saving') : saved ? `✓ ${t('settings.saved')}` : t('settings.save')}
      </button>
    </>
  )
}

export default function SettingsPage() {
  const { user, refreshBalance, isLoading } = useAuth()
  const { t } = useLocale()
  const queryClient = useQueryClient()

  return (
    <div className="max-w-lg mx-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 sm:p-8 shadow-sm">
      <h1 className="text-xl font-bold text-text-primary mb-6">{t('settings.title')}</h1>

      <div className="space-y-5">
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
            @{user?.username ?? '…'}
          </p>
          <p className="text-xs text-text-muted mt-1">{t('settings.usernameReadonly')}</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-text-muted">{t('settings.loadingProfile')}</p>
        ) : user ? (
          <SettingsProfileForm
            key={user.id}
            user={user}
            refreshBalance={refreshBalance}
            queryClient={queryClient}
          />
        ) : (
          <p className="text-sm text-text-muted">{t('settings.mustLogin')}</p>
        )}
      </div>
    </div>
  )
}
