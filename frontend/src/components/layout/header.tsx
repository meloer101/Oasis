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

const HEADER_H = 'h-12'

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

  return (
    <header
      className={`sticky top-0 z-30 ${HEADER_H} border-b border-[var(--card-border)] bg-[var(--topnav-bg)] backdrop-blur-xl backdrop-saturate-[180%] flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 w-full min-w-0`}
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
          className="text-lg font-bold text-brand hover:text-brand-hover transition-colors shrink-0"
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
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand"
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
              <button type="submit" className="text-xs text-brand font-medium shrink-0">
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

      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Desktop: language / theme / wallet — mobile keeps these in avatar menu */}
        <div className="hidden sm:flex items-center gap-2 md:gap-3 shrink-0">
          <div className="hidden md:flex flex-col gap-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted leading-none">
              {t('sidebar.language')}
            </span>
            <LangSwitch compact />
          </div>
          <div className="hidden md:flex flex-col gap-0.5 items-start">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted leading-none">
              {t('theme.appearance')}
            </span>
            <ThemeCycleButton />
          </div>
          <div className="flex md:hidden items-center gap-1.5">
            <LangSwitch compact />
            <ThemeCycleButton />
          </div>
          <Link
            href="/wallet"
            className="inline-flex items-center rounded-lg border border-brand px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-nav-hover transition-colors whitespace-nowrap"
          >
            {t('topNav.connectWallet')}
          </Link>
        </div>

        <Link
          href="/feed/new"
          className="hidden min-[380px]:inline-flex items-center rounded-lg border border-brand bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90 transition-opacity shrink-0"
        >
          {t('topNav.createPost')}
        </Link>
        <Link
          href="/feed/new"
          className="min-[380px]:hidden p-2 rounded-lg bg-brand text-brand-foreground shrink-0"
          aria-label={t('topNav.createPost')}
        >
          <span className="text-lg leading-none">＋</span>
        </Link>

        <Link
          href="/notifications"
          className="relative p-1.5 sm:p-2 rounded-lg text-text-secondary hover:bg-nav-hover hover:text-text-primary transition-colors shrink-0"
        >
          <span className="text-base sm:text-lg">🔔</span>
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-0.5 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center rounded-full ring-2 ring-transparent hover:ring-brand/35 transition-all"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.displayName ?? user?.username ?? '?'}
              className="w-9 h-9 rounded-full bg-brand text-sm"
              textClassName="text-brand-foreground"
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
              <div className="border-t border-border-subtle my-2 px-4 py-2 space-y-2 sm:hidden">
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
