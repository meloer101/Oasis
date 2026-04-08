'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { usePopularTags } from '@/hooks/use-popular-tags'
import { useLayoutShell } from '@/providers/layout-shell-provider'
import { useAuth } from '@/providers/auth-provider'
import { Avatar } from '@/components/ui/avatar'
import { getNewPostHref } from '@/lib/new-post-href'

function NavItem({
  href,
  active,
  icon,
  children,
  onNavigate,
}: {
  href: string
  active: boolean
  icon: string
  children: React.ReactNode
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all duration-300 ${
        active
          ? 'bg-text-primary text-[var(--bg)] font-medium shadow-md scale-[1.02]'
          : 'text-text-secondary hover:text-text-primary hover:bg-nav-hover'
      }`}
    >
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <span className="tracking-tight">{children}</span>
    </Link>
  )
}

function SidebarInner({
  onNavigate,
  user,
}: {
  onNavigate?: () => void
  user: ReturnType<typeof useAuth>['user']
}) {
  const { t } = useLocale()
  const pathname = usePathname()
  const newPostHref = getNewPostHref(pathname)
  const { data: popularTags, isLoading } = usePopularTags(8)

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="px-4 pt-6 pb-6 mb-2 shrink-0">
        {user ? (
          <div className="flex items-center gap-3 px-1">
            <Avatar
              src={user.avatarUrl}
              name={user.displayName ?? user.username}
              className="size-10 rounded-full bg-text-primary shrink-0 text-sm font-medium"
              textClassName="text-[var(--bg)]"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary leading-tight truncate tracking-tight">
                {user.displayName ?? user.username}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted mt-1 truncate opacity-70">
                {t('sidebar.verifiedMember')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-1">
            <span className="inline-flex size-10 rounded-full bg-text-primary shrink-0 shadow-sm" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary leading-tight truncate tracking-tight">Oasis</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted mt-1 truncate opacity-70">
                {t('sidebar.decentralizedFeed')}
              </p>
            </div>
          </div>
        )}
      </div>

      <nav className="space-y-1 py-2 px-2 shrink-0">
        <NavItem href="/feed" active={pathname === '/feed'} icon="◈" onNavigate={onNavigate}>
          {t('sidebar.feed')}
        </NavItem>
        <NavItem
          href="/circles"
          active={pathname.startsWith('/circles') || pathname.startsWith('/circle')}
          icon="🏔️"
          onNavigate={onNavigate}
        >
          {t('sidebar.circles')}
        </NavItem>
        <NavItem href="/wallet" active={pathname === '/wallet'} icon="💰" onNavigate={onNavigate}>
          {t('sidebar.wallet')}
        </NavItem>
        <NavItem href="/settings" active={pathname === '/settings'} icon="⚙️" onNavigate={onNavigate}>
          {t('sidebar.settings')}
        </NavItem>
      </nav>

      <div className="pt-8 mt-4 shrink-0 px-2">
        <p className="px-4 text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted mb-4 opacity-60">
          {t('sidebar.trendingTags')}
        </p>
        <div className="max-h-48 overflow-y-auto px-1">
          {isLoading && <p className="px-4 text-xs text-text-muted py-1">{t('feed.loading')}</p>}
          {!isLoading && (
            <div className="flex flex-wrap gap-2 px-3">
              {(popularTags ?? []).map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  onClick={onNavigate}
                  className="text-sm px-2.5 py-1 rounded-lg bg-nav-hover text-text-secondary border border-border-subtle/60 hover:text-text-primary hover:border-[color-mix(in_srgb,var(--text-primary)_22%,var(--card-border))] transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
          {!isLoading && (popularTags ?? []).length === 0 && (
            <p className="px-4 text-xs text-text-muted py-1">{t('rightPanel.noTagsYet')}</p>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-3 pt-8 pb-6 mt-auto px-4">
        <Link
          href={newPostHref}
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full rounded-full bg-text-primary text-[var(--bg)] text-sm font-medium py-3 hover:opacity-80 transition-all active:scale-95 shadow-lg shadow-text-primary/10"
        >
          <span aria-hidden className="text-lg">＋</span>
          {t('sidebar.newPost')}
        </Link>
        <Link
          href="/wallet"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full rounded-full border border-[var(--border-subtle)] bg-transparent text-text-primary text-sm font-medium py-3 hover:bg-nav-hover transition-all active:scale-95"
        >
          <span aria-hidden>🏛</span>
          {t('sidebar.viewTreasury')}
        </Link>
        <div className="flex justify-center gap-6 pt-4">
          <a href="#" className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-muted hover:text-text-primary transition-colors opacity-60 hover:opacity-100">
            {t('sidebar.support')}
          </a>
          <a href="#" className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-muted hover:text-text-primary transition-colors opacity-60 hover:opacity-100">
            {t('sidebar.about')}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useLayoutShell()
  const { user } = useAuth()

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 sticky top-12 h-[calc(100vh-3rem)] flex-col border-r border-border-subtle bg-[var(--sidebar-bg)] backdrop-blur-xl backdrop-saturate-[180%] px-2">
        <SidebarInner user={user} />
      </aside>

      <div
        aria-hidden={!mobileSidebarOpen}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden transition-opacity duration-300 ${
          mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <aside
        aria-hidden={!mobileSidebarOpen}
        className={`fixed z-50 left-0 top-12 bottom-0 w-[min(18rem,88vw)] flex flex-col border-r border-border-subtle bg-[var(--sidebar-bg)] backdrop-blur-xl backdrop-saturate-[180%] shadow-xl md:hidden overflow-hidden transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 px-2 overflow-y-auto">
          <SidebarInner user={user} onNavigate={() => setMobileSidebarOpen(false)} />
        </div>
      </aside>
    </>
  )
}
