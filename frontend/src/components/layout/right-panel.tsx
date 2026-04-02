'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from '@/hooks/use-locale'
import { usePopularTags } from '@/hooks/use-popular-tags'
import { usePost } from '@/hooks/use-post'
import { useWallet } from '@/hooks/use-wallet'
import { useAuth } from '@/providers/auth-provider'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins } from '@/lib/utils'

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

interface UserCard {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  isFollowing: boolean
}

export default function RightPanel() {
  const { t } = useLocale()
  const pathname = usePathname()
  const params = useParams()
  const { user: me, balance } = useAuth()
  const { data: popular } = usePopularTags(8)

  if (pathname.startsWith('/feed/new')) {
    return null
  }

  const postId = pathname.startsWith('/post/') ? (params.id as string) : ''
  const { data: post } = usePost(postId)

  const username = pathname.startsWith('/user/') ? (params.username as string) : ''
  const { data: profile } = useQuery<UserCard>({
    queryKey: ['user', username],
    queryFn: () => apiClient.get(`/api/users/${username}`).then((r) => r.data),
    enabled: !!username,
  })

  const walletQuery = useWallet()
  const wallet = pathname === '/wallet' ? walletQuery.data : undefined

  return (
    <aside className="hidden xl:block w-[300px] shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-4 pl-2 space-y-4">
      {postId && post ? (
        <>
          <PanelCard>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
              {t('rightPanel.author')}
            </p>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-800 flex items-center justify-center text-lg font-bold text-emerald-200 shrink-0">
                {(post.author.displayName ?? post.author.username).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/user/${post.author.username}`}
                  className="font-semibold text-text-primary hover:text-emerald-500 transition-colors block truncate"
                >
                  {post.author.displayName ?? post.author.username}
                </Link>
                <p className="text-xs text-text-muted truncate">@{post.author.username}</p>
              </div>
            </div>
            <Link
              href={`/user/${post.author.username}`}
              className="mt-3 block w-full text-center text-sm font-medium rounded-lg py-2 border border-[var(--card-border)] hover:bg-nav-hover transition-colors"
            >
              {t('rightPanel.viewProfile')}
            </Link>
          </PanelCard>
          {post.tags && post.tags.length > 0 ? (
            <PanelCard>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
                {t('rightPanel.postTags')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tag/${encodeURIComponent(tag)}`}
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </PanelCard>
          ) : null}
        </>
      ) : null}

      {username && profile && !postId ? (
        <PanelCard>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
            {t('user.about')}
          </p>
          {profile.bio ? (
            <p className="text-sm text-text-secondary leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="text-sm text-text-muted">{t('user.noBio')}</p>
          )}
          <p className="text-xs text-text-muted mt-2">
            {t('rightPanel.joined')} {timeAgo(profile.createdAt)}
          </p>
          {me && me.username !== profile.username ? (
            <Link
              href={`/user/${profile.username}`}
              className="mt-3 block text-sm text-emerald-600 dark:text-emerald-400 font-medium"
            >
              {t('rightPanel.viewProfile')} →
            </Link>
          ) : null}
        </PanelCard>
      ) : null}

      {pathname === '/wallet' && wallet ? (
        <PanelCard>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
            {t('wallet.badgeProgress')}
          </p>
          <p className="text-sm text-text-secondary">
            {t('wallet.current')}:{' '}
            <span className="font-medium text-text-primary">
              {wallet.currentBadge
                ? t(`wallet.badges.${wallet.currentBadge}` as Parameters<typeof t>[0])
                : '—'}
            </span>
          </p>
          {wallet.nextBadgeThreshold != null ? (
            <p className="text-xs text-text-muted mt-2">
              {t('wallet.nextBadge', {
                amount: formatCoins(Math.max(0, wallet.nextBadgeThreshold - balance)),
              })}
            </p>
          ) : null}
          <p className="text-xs text-text-muted mt-3">{t('rightPanel.walletSidebarHint')}</p>
        </PanelCard>
      ) : null}

      <PanelCard>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
          {t('rightPanel.communityTitle')}
        </p>
        <p className="text-sm text-text-secondary leading-relaxed">{t('rightPanel.communityBlurb')}</p>
        <Link
          href="/circles"
          className="mt-3 inline-block text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {t('rightPanel.exploreCircles')} →
        </Link>
      </PanelCard>

      {!postId ? (
        <PanelCard>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
            {t('rightPanel.trendingTags')}
          </p>
          <div className="flex flex-wrap gap-2">
            {(popular ?? []).map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                className="text-sm px-2 py-1 rounded-md bg-nav-hover text-text-secondary hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </PanelCard>
      ) : null}
    </aside>
  )
}
