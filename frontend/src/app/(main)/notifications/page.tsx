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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">{t('notifications.title')}</h1>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
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
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden divide-y divide-[var(--card-border)]">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 transition-colors ${
                n.isRead ? 'bg-transparent' : 'bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]'
              }`}
            >
              <div
                className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                  n.isRead ? 'bg-nav-hover' : 'bg-emerald-500/15 ring-2 ring-emerald-500/25'
                }`}
              >
                {TYPE_ICONS[n.type] ?? '📢'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary leading-snug">
                  {n.actor && (
                    <Link
                      href={`/user/${n.actor.username}`}
                      className="font-semibold text-text-primary hover:text-emerald-500 transition-colors"
                    >
                      {n.actor.displayName ?? n.actor.username}
                    </Link>
                  )}{' '}
                  <span className="text-text-secondary">{n.content}</span>
                </p>
                <p className="text-xs text-text-muted mt-1.5 tabular-nums">{timeAgo(n.createdAt)}</p>
                {n.relatedPostId && (
                  <Link
                    href={`/post/${n.relatedPostId}`}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-2 inline-block"
                  >
                    {t('notifications.viewPost')}
                  </Link>
                )}
              </div>
              {!n.isRead ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-2 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
              ) : (
                <span className="w-2.5 shrink-0" aria-hidden />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
