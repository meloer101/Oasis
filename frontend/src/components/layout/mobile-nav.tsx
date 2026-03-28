'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/hooks/use-notifications'
import { useLocale } from '@/hooks/use-locale'

const NAV_ITEMS = [
  { href: '/feed', icon: '◈', key: 'mobileNav.feed' as const },
  { href: '/notifications', icon: '🔔', key: 'mobileNav.notifications' as const },
  { href: '/feed/new', icon: '＋', key: 'mobileNav.newPost' as const },
  { href: '/wallet', icon: '💰', key: 'mobileNav.wallet' as const },
  { href: '/settings', icon: '⚙️', key: 'mobileNav.settings' as const },
]

export default function MobileNav() {
  const pathname = usePathname()
  const { t } = useLocale()
  const { data: notifData } = useNotifications()
  const unread = notifData?.unreadCount ?? 0

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-mobile-bar backdrop-blur-sm border-t border-border-subtle flex items-center justify-around h-14 px-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        const isNotif = item.href === '/notifications'
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              active ? 'text-emerald-400' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[10px]">{t(item.key)}</span>
            {isNotif && unread > 0 && (
              <span className="absolute top-0 right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
