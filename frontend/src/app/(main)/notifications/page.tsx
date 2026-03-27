'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useNotifications, useMarkAllRead } from '@/hooks/use-notifications'
import { timeAgo } from '@/lib/utils'

const TYPE_ICONS: Record<string, string> = {
  vote_received: '⚡',
  comment_on_post: '💬',
  new_follower: '👤',
  temperature_milestone: '🌡️',
  circle_invite: '🏔️',
  badge_earned: '🏅',
}

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications()
  const markAllRead = useMarkAllRead()

  // Mark all as read when leaving
  useEffect(() => {
    return () => {
      if ((data?.unreadCount ?? 0) > 0) {
        markAllRead.mutate()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.unreadCount])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const notifications = data?.notifications ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-zinc-100">通知</h1>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            全部已读
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-sm">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-px">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                n.isRead
                  ? 'bg-zinc-900 border-zinc-800/50'
                  : 'bg-zinc-900/80 border-zinc-700/60 ring-1 ring-emerald-900/30'
              }`}
            >
              <span className="text-lg shrink-0 mt-0.5">
                {TYPE_ICONS[n.type] ?? '📢'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-300">
                  {n.actor && (
                    <Link
                      href={`/user/${n.actor.username}`}
                      className="font-medium text-zinc-200 hover:text-emerald-400 transition-colors"
                    >
                      {n.actor.displayName ?? n.actor.username}
                    </Link>
                  )}{' '}
                  {n.content}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{timeAgo(n.createdAt)}</p>
                {n.relatedPostId && (
                  <Link
                    href={`/post/${n.relatedPostId}`}
                    className="text-xs text-emerald-600 hover:text-emerald-400 transition-colors mt-1 block"
                  >
                    查看帖子 →
                  </Link>
                )}
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
