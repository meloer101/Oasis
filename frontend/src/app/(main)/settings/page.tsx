'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { ThemeSelect } from '@/components/theme/theme-select'
import { LangSwitch } from '@/components/i18n/lang-switch'
import { Avatar } from '@/components/ui/avatar'

type MeUser = NonNullable<ReturnType<typeof useAuth>['user']>
type SettingsTab = 'profile' | 'appearance' | 'account'

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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarUpload(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post<{ url: string }>('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatarUrl(res.data.url)
    } catch {
      // ignore upload error, let user retry
    } finally {
      setUploading(false)
    }
  }

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
    <div className="space-y-5">
      {/* Avatar */}
      <div>
        <label className="text-sm font-medium text-text-secondary block mb-2">{t('settings.avatarUrl')}</label>
        <div className="flex items-center gap-4 mb-3">
          <Avatar
            src={avatarUrl || null}
            name={displayName || user.username}
            className="w-16 h-16 rounded-full bg-brand shrink-0 text-2xl font-bold"
            textClassName="text-brand-foreground"
          />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleAvatarUpload(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm rounded-lg border border-[var(--card-border)] hover:bg-nav-hover transition-colors disabled:opacity-50 text-text-secondary font-medium"
            >
              {uploading ? t('settings.uploading') : t('settings.uploadAvatar')}
            </button>
            <p className="text-xs text-text-muted mt-1">JPG, PNG, GIF or WebP</p>
          </div>
        </div>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Display name */}
      <div>
        <label className="text-sm font-medium text-text-secondary block mb-1.5">{t('settings.displayName')}</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={user.username}
          maxLength={100}
          className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="text-sm font-medium text-text-secondary block mb-1.5">{t('settings.bio')}</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t('settings.bioPlaceholder')}
          rows={4}
          maxLength={500}
          className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors resize-none"
        />
        <p className="text-xs text-text-muted mt-1 text-right">{bio.length}/500</p>
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
        className="px-6 py-2.5 rounded-lg bg-brand hover:opacity-90 disabled:opacity-40 text-brand-foreground text-sm font-medium transition-opacity"
      >
        {mutation.isPending ? t('settings.saving') : saved ? `✓ ${t('settings.saved')}` : t('settings.save')}
      </button>
    </div>
  )
}

function AppearanceSection() {
  const { t } = useLocale()
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-text-secondary block mb-2">{t('theme.appearance')}</label>
        <ThemeSelect />
      </div>
      <div>
        <label className="text-sm font-medium text-text-secondary block mb-2">{t('sidebar.language')}</label>
        <LangSwitch />
      </div>
    </div>
  )
}

function AccountSection({ user }: { user: MeUser }) {
  const { t } = useLocale()
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-text-secondary block mb-1.5">{t('settings.username')}</label>
        <p className="text-sm text-text-primary bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2">
          @{user.username}
        </p>
        <p className="text-xs text-text-muted mt-1">{t('settings.usernameReadonly')}</p>
      </div>
      <div className="rounded-xl border border-[var(--card-border)] p-4">
        <p className="text-sm font-medium text-text-primary mb-1">{t('settings.emailLabel')}</p>
        <p className="text-sm text-text-muted">{user.email ?? '—'}</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, refreshBalance, isLoading } = useAuth()
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const tabs: { key: SettingsTab; icon: string; label: string }[] = [
    { key: 'profile', icon: '😀', label: t('settings.navProfile') as string },
    { key: 'appearance', icon: '🎨', label: t('settings.navAppearance') as string },
    { key: 'account', icon: '🔑', label: t('settings.navAccount') as string },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      {user && (
        <h1 className="text-2xl font-bold text-text-primary mb-6">
          @{user.username}
        </h1>
      )}

      <div className="flex gap-6">
        {/* Left nav */}
        <aside className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-nav-active text-text-primary font-medium'
                    : 'text-text-secondary hover:bg-nav-hover hover:text-text-primary'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
          {activeTab === 'profile' && (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-5">{t('settings.navProfile')}</h2>
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
            </>
          )}
          {activeTab === 'appearance' && (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-5">{t('settings.navAppearance')}</h2>
              <AppearanceSection />
            </>
          )}
          {activeTab === 'account' && (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-5">{t('settings.navAccount')}</h2>
              {user ? (
                <AccountSection user={user} />
              ) : (
                <p className="text-sm text-text-muted">{t('settings.mustLogin')}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
