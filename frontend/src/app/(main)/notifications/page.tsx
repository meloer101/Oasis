'use client'

import { useEffect, useState } from 'react'
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

type FilterTab = 'all' | 'comments' | 'votes' | 'follows'

const FILTER_TYPE_MAP: Record<FilterTab, string[] | null> = {
  all: null,
  comments: ['comment_on_post'],
  votes: ['vote_received', 'temperature_milestone'],
  follows: ['new_follower', 'circle_invite', 'badge_earned'],
}

export default function NotificationsPage() {
  const { t } = useLocale()
  const { data, isLoading } = useNotifications()
  const markAllRead = useMarkAllRead()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

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
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const allNotifications = data?.notifications ?? []
  const allowedTypes = FILTER_TYPE_MAP[activeTab]
  const notifications = allowedTypes
    ? allNotifications.filter((n) => allowedTypes.includes(n.type))
    : allNotifications

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('notifications.filterAll') as string },
    { key: 'comments', label: t('notifications.filterComments') as string },
    { key: 'votes', label: t('notifications.filterVotes') as string },
    { key: 'follows', label: t('notifications.filterFollows') as string },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t('notifications.title')}</h1>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-sm text-brand font-medium hover:underline"
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left filter sidebar */}
        <aside className="w-40 shrink-0">
          <nav className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-nav-active text-text-primary font-medium'
                    : 'text-text-secondary hover:bg-nav-hover hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Notification list */}
        <div className="flex-1 min-w-0">
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
                    n.isRead ? 'bg-transparent' : 'bg-brand/[0.06] dark:bg-brand/[0.1]'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                      n.isRead ? 'bg-nav-hover' : 'bg-brand/12 ring-2 ring-brand/25'
                    }`}
                  >
                    {TYPE_ICONS[n.type] ?? '📢'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary leading-snug">
                      {n.actor && (
                        <Link
                          href={`/user/${n.actor.username}`}
                          className="font-semibold text-text-primary hover:text-brand transition-colors"
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
                        className="text-xs text-brand font-medium hover:underline mt-2 inline-block"
                      >
                        {t('notifications.viewPost')}
                      </Link>
                    )}
                  </div>
                  {!n.isRead ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-sage shrink-0 mt-2 shadow-[0_0_0_4px_rgb(156_175_136/0.25)]" />
                  ) : (
                    <span className="w-2.5 shrink-0" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
