'use client'

import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import { useNotifications } from '@/hooks/use-notifications'

export default function Header() {
  const { user } = useAuth()
  const { data: notifData } = useNotifications()
  const unread = notifData?.unreadCount ?? 0

  const initials = (user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-border-subtle bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center px-4 gap-3 md:hidden">
      {/* Logo */}
      <Link
        href="/feed"
        className="text-lg font-bold text-emerald-400 hover:text-emerald-300 transition-colors mr-auto"
      >
        Oasis
      </Link>

      {/* Notifications */}
      <Link
        href="/notifications"
        className="relative w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
      >
        🔔
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>

      {/* User avatar */}
      <Link href={`/user/${user?.username}`}>
        <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-sm font-semibold text-emerald-200">
          {initials}
        </div>
      </Link>
    </header>
  )
}
