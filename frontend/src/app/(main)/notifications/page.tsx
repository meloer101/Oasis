'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useNotifications, useMarkAllRead } from '@/hooks/use-notifications'
import { timeAgo } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'

const TYPE_ICONS: Record<string, string> = {
  vote_received: '⚡',
  comment_on_post: '💬',
  new_follower: '👤',
  temperature_milestone: '🌡️',
  circle_invite: '🏔️',
  badge_earned: '🏅',
}

export default function NotificationsPage() {
  const { t } = useLocale()
  const { data, isLoading } = useNotifications()
  const markAllRead = useMarkAllRead()

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
        <h1 className="text-lg font-bold text-text-primary">{t('notifications.title')}</h1>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-sm">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="space-y-px">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                n.isRead
                  ? 'bg-surface border-border-subtle'
                  : 'bg-emerald-50/80 dark:bg-zinc-900/80 border-emerald-200/60 dark:border-zinc-700/60 ring-1 ring-emerald-200/50 dark:ring-emerald-900/30'
              }`}
            >
              <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '📢'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary">
                  {n.actor && (
                    <Link
                      href={`/user/${n.actor.username}`}
                      className="font-medium text-text-primary hover:text-emerald-400 transition-colors"
                    >
                      {n.actor.displayName ?? n.actor.username}
                    </Link>
                  )}{' '}
                  {n.content}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{timeAgo(n.createdAt)}</p>
                {n.relatedPostId && (
                  <Link
                    href={`/post/${n.relatedPostId}`}
                    className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-400 transition-colors mt-1 block"
                  >
                    {t('notifications.viewPost')}
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
