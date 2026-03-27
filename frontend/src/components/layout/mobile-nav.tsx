'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from '@/hooks/use-notifications'

const NAV_ITEMS = [
  { href: '/feed', icon: '◈', label: 'Feed' },
  { href: '/notifications', icon: '🔔', label: '通知' },
  { href: '/feed/new', icon: '＋', label: '发帖' },
  { href: '/wallet', icon: '💰', label: '钱包' },
  { href: '/settings', icon: '⚙️', label: '设置' },
]

export default function MobileNav() {
  const pathname = usePathname()
  const { data: notifData } = useNotifications()
  const unread = notifData?.unreadCount ?? 0

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800/50 flex items-center justify-around h-14 px-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        const isNotif = item.href === '/notifications'
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              active ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
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
