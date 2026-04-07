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
    <div className="space-y-10">
      {/* Avatar */}
      <div className="py-6 border-b border-[var(--border-subtle)]">
        <label className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted block mb-6 opacity-80">{t('settings.avatarUrl')}</label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 mb-6">
          <Avatar
            src={avatarUrl || null}
            name={displayName || user.username}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-text-primary shrink-0 text-4xl font-medium shadow-xl"
            textClassName="text-[var(--bg)]"
          />
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap gap-3">
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
                className="px-6 py-2.5 text-sm rounded-full border border-[var(--border-subtle)] hover:bg-nav-hover transition-all active:scale-95 disabled:opacity-50 text-text-primary font-medium"
              >
                {uploading ? t('settings.uploading') : t('settings.uploadAvatar')}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="px-6 py-2.5 text-sm rounded-full border border-transparent hover:text-red-500 transition-colors text-text-muted font-medium"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted font-normal uppercase tracking-widest opacity-60">JPG, PNG, GIF or WebP</p>
          </div>
        </div>
        <div className="relative group">
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="w-full bg-transparent border-b border-[var(--border-subtle)] py-3 text-base text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-text-primary transition-all duration-300 font-normal"
          />
          <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-text-primary transition-all duration-500 group-focus-within:w-full" />
        </div>
      </div>

      {/* Display name */}
      <div className="py-6 border-b border-[var(--border-subtle)]">
        <label className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted block mb-4 opacity-80">{t('settings.displayName')}</label>
        <div className="relative group">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user.username}
            maxLength={100}
            className="w-full bg-transparent border-b border-[var(--border-subtle)] py-3 text-2xl font-medium text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-text-primary transition-all duration-300 tracking-tight"
          />
          <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-text-primary transition-all duration-500 group-focus-within:w-full" />
        </div>
      </div>

      {/* Bio */}
      <div className="py-6 border-b border-[var(--border-subtle)]">
        <label className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted block mb-4 opacity-80">{t('settings.bio')}</label>
        <div className="relative group">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('settings.bioPlaceholder')}
            rows={3}
            maxLength={500}
            className="w-full bg-transparent border-b border-[var(--border-subtle)] py-3 text-lg font-normal text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-text-primary transition-all duration-300 resize-none leading-relaxed"
          />
          <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-text-primary transition-all duration-500 group-focus-within:w-full" />
        </div>
        <p className="text-[10px] text-text-muted mt-4 font-medium uppercase tracking-widest opacity-60 text-right">{bio.length}/500</p>
      </div>

      {mutation.isError && (
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 text-sm font-medium">
          {t('settings.saveError')}
          {apiErr ? ` — ${apiErr}` : ''}
        </div>
      )}

      <div className="pt-4 flex items-center gap-6">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-10 py-3 rounded-full bg-text-primary text-[var(--bg)] hover:opacity-80 disabled:opacity-40 text-sm font-medium transition-all active:scale-95 shadow-lg shadow-text-primary/10"
        >
          {mutation.isPending ? t('settings.saving') : saved ? `✓ ${t('settings.saved')}` : t('settings.save')}
        </button>
        {saved && (
          <span className="text-sm font-medium text-text-primary animate-fade-in">
            {t('settings.saved')}
          </span>
        )}
      </div>
    </div>
  )
}

function AppearanceSection() {
  const { t } = useLocale()
  return (
    <div className="space-y-12">
      <div className="py-6 border-b border-[var(--border-subtle)]">
        <label className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted block mb-6 opacity-80">{t('theme.appearance')}</label>
        <ThemeSelect />
      </div>
      <div className="py-6 border-b border-[var(--border-subtle)]">
        <label className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted block mb-6 opacity-80">{t('sidebar.language')}</label>
        <LangSwitch />
      </div>
    </div>
  )
}

function AccountSection({ user }: { user: MeUser }) {
  const { t } = useLocale()
  return (
    <div className="space-y-12">
      <div className="py-6 border-b border-[var(--border-subtle)]">
        <label className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted block mb-4 opacity-80">{t('settings.username')}</label>
        <p className="text-2xl font-medium text-text-primary tracking-tight">
          @{user.username}
        </p>
        <p className="text-xs text-text-muted mt-4 font-normal uppercase tracking-widest opacity-60">{t('settings.usernameReadonly')}</p>
      </div>
      <div className="py-6 border-b border-[var(--border-subtle)]">
        <label className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted block mb-4 opacity-80">{t('settings.emailLabel')}</label>
        <p className="text-2xl font-medium text-text-primary tracking-tight">{user.email ?? '—'}</p>
        <p className="text-xs text-text-muted mt-4 font-normal uppercase tracking-widest opacity-60">Your account email address</p>
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
    <div className="max-w-4xl mx-auto px-4">
      {/* Header */}
      {user && (
        <div className="mb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted mb-4 opacity-80">
            SETTINGS
          </p>
          <h1 className="text-4xl sm:text-5xl font-medium text-text-primary tracking-tighter leading-tight">
            @{user.username}
          </h1>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-12">
        {/* Left nav */}
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-text-primary text-[var(--bg)] font-medium shadow-md scale-[1.02]'
                    : 'text-text-secondary hover:bg-nav-hover hover:text-text-primary'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="tracking-tight">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="motion-safe:animate-fade-in-up">
            {activeTab === 'profile' && (
              <div key="profile">
                <h2 className="text-2xl font-medium text-text-primary mb-8 tracking-tight">{t('settings.navProfile')}</h2>
                {isLoading ? (
                  <p className="text-sm text-text-muted animate-pulse">{t('settings.loadingProfile')}</p>
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
            )}
            {activeTab === 'appearance' && (
              <div key="appearance">
                <h2 className="text-2xl font-medium text-text-primary mb-8 tracking-tight">{t('settings.navAppearance')}</h2>
                <AppearanceSection />
              </div>
            )}
            {activeTab === 'account' && (
              <div key="account">
                <h2 className="text-2xl font-medium text-text-primary mb-8 tracking-tight">{t('settings.navAccount')}</h2>
                {user ? (
                  <AccountSection user={user} />
                ) : (
                  <p className="text-sm text-text-muted">{t('settings.mustLogin')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
