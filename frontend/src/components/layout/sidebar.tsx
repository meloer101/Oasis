'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useCircles } from '@/hooks/use-circle'
import { useLayoutShell } from '@/providers/layout-shell-provider'
import { useAuth } from '@/providers/auth-provider'
import { Avatar } from '@/components/ui/avatar'

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
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-[3px] ${
        active
          ? 'bg-nav-active text-text-primary font-medium border-brand shadow-[inset_0_0_0_1px_rgb(0_113_227/0.12)] dark:shadow-[inset_0_0_0_1px_rgb(41_151_255/0.2)]'
          : 'text-text-secondary hover:text-text-primary hover:bg-nav-hover border-transparent'
      }`}
    >
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      {children}
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
  const { data: circles, isLoading } = useCircles()
  const trending = (circles ?? []).slice(0, 5)

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="px-2 pt-3 pb-4 border-b border-border-subtle mb-1 shrink-0">
        {user ? (
          <div className="flex items-center gap-2.5 px-2">
            <Avatar
              src={user.avatarUrl}
              name={user.displayName ?? user.username}
              className="size-8 rounded-lg bg-brand shrink-0 text-sm font-bold"
              textClassName="text-brand-foreground"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary leading-tight truncate">
                {user.displayName ?? user.username}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand truncate">
                {t('sidebar.verifiedMember')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-2">
            <span className="inline-flex size-8 rounded-md bg-brand shrink-0 shadow-sm" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary leading-tight truncate">Oasis</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted truncate">
                {t('sidebar.decentralizedFeed')}
              </p>
            </div>
          </div>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted/90 mt-3 px-2">
          {t('sidebar.consensusPlatform')}
        </p>
      </div>

      <nav className="space-y-0.5 py-2 shrink-0">
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

      <div className="border-t border-border-subtle pt-3 mt-1 shrink-0">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
          {t('sidebar.trendingCircles')}
        </p>
        <div className="space-y-0.5 max-h-36 overflow-y-auto">
          {isLoading && <p className="px-3 text-xs text-text-muted py-1">{t('feed.loading')}</p>}
          {!isLoading &&
            trending.map((circle) => (
              <Link
                key={circle.id}
                href={`/circle/${circle.id}`}
                onClick={onNavigate}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-nav-hover hover:text-text-primary transition-colors"
              >
                <span className="truncate">#{circle.name}</span>
                <span className="text-[10px] text-text-muted shrink-0 tabular-nums">
                  {circle.memberCount.toLocaleString()}
                </span>
              </Link>
            ))}
          {!isLoading && trending.length === 0 && (
            <p className="px-3 text-xs text-text-muted py-1">{t('sidebar.noCirclesYet')}</p>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-2 pt-3 pb-2 mt-auto border-t border-border-subtle">
        <Link
          href="/feed/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand text-brand-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity shadow-sm"
        >
          <span aria-hidden>✦</span>
          {t('sidebar.newPost')}
        </Link>
        <Link
          href="/wallet"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border-subtle bg-[var(--card-bg)] text-text-primary text-sm font-medium py-2.5 hover:bg-nav-hover transition-colors"
        >
          <span aria-hidden>🏛</span>
          {t('sidebar.viewTreasury')}
        </Link>
        <div className="flex justify-center gap-4 px-2 pt-1">
          <a href="#" className="text-[10px] uppercase tracking-wide text-text-muted hover:text-brand transition-colors">
            {t('sidebar.support')}
          </a>
          <a href="#" className="text-[10px] uppercase tracking-wide text-text-muted hover:text-brand transition-colors">
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

      {mobileSidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed z-50 left-0 top-12 bottom-0 w-[min(18rem,88vw)] flex flex-col border-r border-border-subtle bg-[var(--sidebar-bg)] backdrop-blur-xl backdrop-saturate-[180%] shadow-xl md:hidden overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 px-2 overflow-y-auto">
              <SidebarInner user={user} onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </aside>
        </>
      ) : null}
    </>
  )
}
