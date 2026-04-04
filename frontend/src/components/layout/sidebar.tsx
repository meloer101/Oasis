'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { usePopularTags } from '@/hooks/use-popular-tags'
import { useLayoutShell } from '@/providers/layout-shell-provider'

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
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-nav-active text-text-primary font-medium'
          : 'text-text-secondary hover:text-text-primary hover:bg-nav-hover'
      }`}
    >
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      {children}
    </Link>
  )
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLocale()
  const pathname = usePathname()
  const { data: tags, isLoading } = usePopularTags(14)

  return (
    <>
      <nav className="space-y-0.5 py-2">
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

      <div className="border-t border-border-subtle pt-3 shrink-0">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
          {t('sidebar.trendingTags')}
        </p>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {isLoading && (
            <p className="px-3 text-xs text-text-muted py-1">{t('feed.loading')}</p>
          )}
          {!isLoading &&
            (tags ?? []).map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                onClick={onNavigate}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-nav-hover hover:text-text-primary transition-colors"
              >
                <span className="truncate">#{tag.name}</span>
                <span className="text-[10px] text-text-muted shrink-0 tabular-nums">{tag.postCount}</span>
              </Link>
            ))}
          {!isLoading && (!tags || tags.length === 0) && (
            <p className="px-3 text-xs text-text-muted py-1">{t('rightPanel.noTagsYet')}</p>
          )}
        </div>
      </div>
    </>
  )
}

export default function Sidebar() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useLayoutShell()

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] flex-col border-r border-border-subtle bg-[var(--sidebar-bg)] px-2">
        <SidebarInner />
      </aside>

      {mobileSidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed z-50 left-0 top-14 bottom-0 w-[min(18rem,88vw)] flex flex-col border-r border-border-subtle bg-[var(--sidebar-bg)] shadow-xl md:hidden overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 px-2">
              <SidebarInner onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </aside>
        </>
      ) : null}
    </>
  )
}
