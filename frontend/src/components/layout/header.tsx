'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useNotifications } from '@/hooks/use-notifications'
import { useLocale } from '@/hooks/use-locale'
import { useLayoutShell } from '@/providers/layout-shell-provider'
import { ThemeCycleButton } from '@/components/theme/theme-cycle-button'
import { LangSwitch } from '@/components/i18n/lang-switch'
import { Avatar } from '@/components/ui/avatar'

const HEADER_H = 'h-14'

export default function Header() {
  const { user, logout } = useAuth()
  const { t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: notifData } = useNotifications()
  const unread = notifData?.unreadCount ?? 0
  const { toggleMobileSidebar } = useLayoutShell()

  const qFromFeed = pathname === '/feed' ? (searchParams.get('q') ?? '').trim() : ''
  const [searchDraft, setSearchDraft] = useState(qFromFeed)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearchDraft(qFromFeed)
  }, [qFromFeed])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const q = searchDraft.trim()
    if (q) {
      router.push(`/feed?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/feed')
    }
    setMobileSearchOpen(false)
  }

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    router.replace('/login')
  }

  const initials = (user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()

  return (
    <header
      className={`sticky top-0 z-30 ${HEADER_H} border-b border-[var(--card-border)] bg-[var(--topnav-bg)] backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 w-full min-w-0`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 -ml-1 rounded-lg text-text-secondary hover:bg-nav-hover hover:text-text-primary"
          aria-label={t('topNav.openMenu')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link
          href="/feed"
          className="text-lg font-bold text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors shrink-0"
        >
          Oasis
        </Link>

        {/* Desktop search */}
        <form onSubmit={onSearchSubmit} className="hidden sm:flex flex-1 min-w-0 max-w-xl">
          <div className="relative w-full">
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder={t('feed.searchPlaceholder')}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </form>

        {/* Mobile search toggle + inline */}
        <div className="flex sm:hidden flex-1 min-w-0 justify-end">
          {!mobileSearchOpen ? (
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="p-2 rounded-lg text-text-secondary hover:bg-nav-hover"
              aria-label={t('feed.searchPlaceholder')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          ) : (
            <form onSubmit={onSearchSubmit} className="flex flex-1 gap-1 items-center min-w-0">
              <input
                autoFocus
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder={t('feed.searchPlaceholder')}
                className="flex-1 min-w-0 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm"
              />
              <button type="submit" className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                OK
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen(false)
                  setSearchDraft(qFromFeed)
                }}
                className="text-xs text-text-muted shrink-0"
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Link
          href="/feed/new"
          className="hidden min-[380px]:inline-flex items-center rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shrink-0"
        >
          {t('topNav.createPost')}
        </Link>
        <Link
          href="/feed/new"
          className="min-[380px]:hidden p-2 rounded-lg bg-emerald-600 text-white shrink-0"
          aria-label={t('topNav.createPost')}
        >
          <span className="text-lg leading-none">＋</span>
        </Link>

        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-text-secondary hover:bg-nav-hover hover:text-text-primary transition-colors shrink-0"
        >
          <span className="text-lg">🔔</span>
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center rounded-full ring-2 ring-transparent hover:ring-emerald-600/40 transition-all"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.displayName ?? user?.username ?? '?'}
              className="w-9 h-9 rounded-full bg-emerald-800 text-sm"
              textClassName="text-emerald-200"
            />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] py-2 shadow-lg z-50">
              <Link
                href={`/user/${user?.username}`}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-text-primary hover:bg-nav-hover"
              >
                {t('topNav.profile')}
              </Link>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-text-primary hover:bg-nav-hover"
              >
                {t('sidebar.settings')}
              </Link>
              <div className="border-t border-border-subtle my-2 px-4 py-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-muted">{t('sidebar.language')}</span>
                  <LangSwitch compact />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-muted">{t('theme.appearance')}</span>
                  <ThemeCycleButton />
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-text-muted hover:bg-nav-hover hover:text-text-primary"
              >
                {t('sidebar.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
