'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'

export default function MobileNav() {
  const pathname = usePathname()
  const { t } = useLocale()
  const { data: notifData } = useNotifications()
  const { user } = useAuth()
  const unread = notifData?.unreadCount ?? 0

  const profileHref = user ? `/user/${user.username}` : '/settings'

  const NAV_ITEMS = [
    { href: '/feed', icon: '◈', key: 'mobileNav.feed' as const, match: (p: string) => p === '/feed' },
    {
      href: '/circles',
      icon: '🏔️',
      key: 'mobileNav.circles' as const,
      match: (p: string) => p.startsWith('/circles') || p.startsWith('/circle'),
    },
    { href: '/feed/new', icon: '＋', key: 'mobileNav.newPost' as const, match: (p: string) => p === '/feed/new' },
    {
      href: '/notifications',
      icon: '🔔',
      key: 'mobileNav.notifications' as const,
      match: (p: string) => p === '/notifications',
      badge: unread,
    },
    {
      href: profileHref,
      icon: '👤',
      key: 'mobileNav.profile' as const,
      match: (p: string) => !!user && p.startsWith(`/user/${user.username}`),
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-mobile-bar backdrop-blur-xl backdrop-saturate-[180%] border-t border-border-subtle flex items-center justify-around h-14 px-1">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname)
        const isNotif = item.href === '/notifications'
        return (
          <Link
            key={item.href + item.key}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1 ${
              active
                ? 'text-brand before:absolute before:top-0 before:left-2 before:right-2 before:h-0.5 before:rounded-full before:bg-brand'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[9px] truncate max-w-full text-center">{t(item.key)}</span>
            {isNotif && unread > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
