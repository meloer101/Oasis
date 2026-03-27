'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { useNotifications } from '@/hooks/use-notifications'
import { formatCoins } from '@/lib/utils'

function NavItem({
  href,
  active,
  icon,
  children,
  badge,
}: {
  href: string
  active: boolean
  icon: string
  children: React.ReactNode
  badge?: number
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-zinc-800 text-zinc-100 font-medium'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
      }`}
    >
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      {children}
      {badge && badge > 0 ? (
        <span className="ml-auto w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

export default function Sidebar() {
  const { user, balance, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { data: notifData } = useNotifications()
  const unread = notifData?.unreadCount ?? 0

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  const initials = (user?.displayName ?? user?.username ?? '?').charAt(0).toUpperCase()

  return (
    <aside className="w-60 shrink-0 hidden md:flex flex-col h-screen sticky top-0 px-3 py-4 border-r border-zinc-800/50">
      {/* Logo */}
      <Link
        href="/feed"
        className="text-xl font-bold text-emerald-400 mb-7 px-3 block hover:text-emerald-300 transition-colors"
      >
        Oasis
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        <NavItem href="/feed" active={pathname === '/feed'} icon="◈">
          Feed
        </NavItem>
        <NavItem href="/notifications" active={pathname === '/notifications'} icon="🔔" badge={unread}>
          通知
        </NavItem>
        <NavItem href="/wallet" active={pathname === '/wallet'} icon="💰">
          钱包
        </NavItem>
        <NavItem href="/circle/create" active={pathname === '/circle/create'} icon="🏔️">
          创建圈子
        </NavItem>
        <NavItem href="/settings" active={pathname === '/settings'} icon="⚙️">
          设置
        </NavItem>

        <div className="border-t border-zinc-800/50 my-2" />

        {/* New post CTA */}
        <Link
          href="/feed/new"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-emerald-700 hover:bg-emerald-600 text-white font-medium transition-colors"
        >
          <span className="text-base w-5 text-center">＋</span>
          发布帖子
        </Link>
      </nav>

      {/* User */}
      <div className="border-t border-zinc-800/50 pt-3 mt-2">
        <Link
          href={`/user/${user?.username}`}
          className="flex items-center gap-2.5 px-3 mb-2 rounded-lg hover:bg-zinc-900 transition-colors py-1"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center text-sm font-semibold text-emerald-200 shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-200 truncate">
              {user?.displayName ?? user?.username}
            </p>
            <p className="text-xs text-zinc-500">⚡ {formatCoins(balance)} 币</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors rounded-lg hover:bg-zinc-900"
        >
          退出登录
        </button>
      </div>
    </aside>
  )
}
