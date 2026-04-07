'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from '@/hooks/use-locale'
import { usePopularTags } from '@/hooks/use-popular-tags'
import { useCircles } from '@/hooks/use-circle'
import { usePost } from '@/hooks/use-post'
import { useWallet } from '@/hooks/use-wallet'
import { useAuth } from '@/providers/auth-provider'
import { useLayoutShell } from '@/providers/layout-shell-provider'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-transparent py-6 border-b border-[var(--border-subtle)] ${className}`}
    >
      {children}
    </div>
  )
}

function TreasuryCard({ balance }: { balance: number }) {
  const { t } = useLocale()
  return (
    <div className="py-6 border-b border-[var(--border-subtle)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted mb-3 opacity-80">
        {t('rightPanel.yourTreasury')}
      </p>
      <p className="text-4xl font-medium tabular-nums tracking-tighter text-text-primary">{formatCoins(balance)} AG</p>
      <Link
        href="/wallet"
        className="mt-5 inline-flex items-center justify-center w-full text-sm font-medium rounded-full py-2.5 bg-text-primary text-[var(--bg)] hover:opacity-80 transition-all active:scale-95 shadow-lg shadow-text-primary/10"
      >
        {t('rightPanel.claimRewards')}
      </Link>
    </div>
  )
}

function resonancePercent(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = seed.charCodeAt(i) + ((h << 5) - h)
  }
  return 55 + (Math.abs(h) % 44)
}

function TopResonatorsCard() {
  const { t } = useLocale()
  const { data: circles, isLoading } = useCircles()
  const rows = (circles ?? []).slice(0, 3)

  return (
    <PanelCard>
      <div className="flex items-center justify-between gap-2 mb-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted opacity-80">
          {t('rightPanel.topResonators')}
        </p>
        <Link href="/circles" className="text-[10px] font-medium uppercase tracking-widest text-text-primary hover:opacity-70 transition-opacity shrink-0">
          {t('rightPanel.viewAll')} →
        </Link>
      </div>
      {isLoading && <p className="text-xs text-text-muted py-2">{t('feed.loading')}</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-text-muted py-1">{t('rightPanel.noResonatorsYet')}</p>
      )}
      <div className="space-y-4">
        {!isLoading &&
          rows.map((c) => {
            const u = c.creator
            const pct = resonancePercent(u.id)
            return (
              <div key={c.id} className="flex items-center gap-3 group">
                <Avatar
                  src={u.avatarUrl}
                  name={u.displayName ?? u.username}
                  className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--bg))] shrink-0 text-xs font-medium"
                  textClassName="text-text-secondary"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/user/${u.username}`}
                    className="text-sm font-medium text-text-primary hover:opacity-70 transition-opacity truncate block tracking-tight"
                  >
                    @{u.username}
                  </Link>
                  <p className="text-[10px] text-text-muted tabular-nums font-medium uppercase tracking-wider mt-0.5 opacity-70">
                    {pct}% {t('rightPanel.resonance')}
                  </p>
                </div>
                <Link
                  href={`/user/${u.username}`}
                  className="shrink-0 text-[10px] font-medium uppercase tracking-widest px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-text-secondary hover:bg-nav-hover hover:text-text-primary transition-all active:scale-95"
                >
                  {t('rightPanel.follow')}
                </Link>
              </div>
            )
          })}
      </div>
    </PanelCard>
  )
}

function ResonanceCard() {
  const { t } = useLocale()
  const pct = 74
  return (
    <PanelCard>
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted mb-5 opacity-80">
        {t('rightPanel.globalResonance')}
      </p>
      <div
        className="h-1.5 rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--bg))]"
        aria-hidden
      >
        <div 
          className="h-full rounded-full bg-text-primary transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm font-medium text-text-primary mt-4 tracking-tight">{t('rightPanel.resonanceActive', { pct })}</p>
      <p className="text-xs text-text-secondary mt-2 leading-relaxed font-normal opacity-80">{t('rightPanel.resonanceBlurb')}</p>
    </PanelCard>
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
  const { rightPanelOpen } = useLayoutShell()
  const isFeedHome = pathname === '/feed'

  const postId = pathname.startsWith('/post/') ? (params.id as string) : ''
  const { data: post } = usePost(postId)

  const firstTag = postId && post?.tags?.length ? post.tags[0] : ''
  const { data: relatedData } = useQuery<{ posts: { id: string; title: string; temperature: string }[] }>({
    queryKey: ['tag', firstTag],
    queryFn: () => apiClient.get(`/api/tags/${encodeURIComponent(firstTag)}`).then((r) => r.data),
    enabled: !!firstTag,
  })
  const relatedPosts = (relatedData?.posts ?? []).filter((p) => p.id !== postId).slice(0, 3)

  const username = pathname.startsWith('/user/') ? (params.username as string) : ''
  const { data: profile } = useQuery<UserCard>({
    queryKey: ['user', username],
    queryFn: () => apiClient.get(`/api/users/${username}`).then((r) => r.data),
    enabled: !!username,
  })

  const walletQuery = useWallet()
  const wallet = pathname === '/wallet' ? walletQuery.data : undefined

  if (pathname.startsWith('/feed/new') || !rightPanelOpen) {
    return null
  }

  return (
    <aside className="hidden xl:block w-[320px] shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto py-4 pl-2 pr-6 space-y-4 animate-fade-in">
      <TreasuryCard balance={balance} />
      <ResonanceCard />

      {postId && post ? (
        <>
          <PanelCard>
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted mb-5 opacity-80">
              {t('rightPanel.author')}
            </p>
            <div className="flex items-center gap-4">
              <Avatar
                src={post.author.avatarUrl}
                name={post.author.displayName ?? post.author.username}
                className="w-14 h-14 rounded-full bg-text-primary shrink-0 text-xl font-medium"
                textClassName="text-[var(--bg)]"
              />
              <div className="min-w-0">
                <Link
                  href={`/user/${post.author.username}`}
                  className="text-base font-medium text-text-primary hover:opacity-70 transition-opacity block truncate tracking-tight"
                >
                  {post.author.displayName ?? post.author.username}
                </Link>
                <p className="text-sm text-text-muted truncate mt-0.5">@{post.author.username}</p>
              </div>
            </div>
            <Link
              href={`/user/${post.author.username}`}
              className="mt-6 block w-full text-center text-xs font-medium uppercase tracking-widest rounded-full py-2.5 border border-[var(--border-subtle)] hover:bg-nav-hover transition-all active:scale-95"
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
                    className="text-sm font-medium text-text-secondary hover:text-text-primary hover:underline"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </PanelCard>
          ) : null}
          {relatedPosts.length > 0 ? (
            <PanelCard>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
                {t('rightPanel.relatedInsights')}
              </p>
              <div className="space-y-3">
                {relatedPosts.map((p, i) => {
                  const temp = parseFloat(p.temperature)
                  const tempStr = temp.toFixed(1)
                  const tempColor = temp < 0 ? 'text-text-muted' : 'text-text-secondary'
                  return (
                    <Link
                      key={p.id}
                      href={`/post/${p.id}`}
                      className="flex items-start gap-3 group rounded-lg hover:bg-nav-hover/80 -mx-1 px-1 py-0.5 transition-colors"
                    >
                      <div
                        className={`w-14 h-14 rounded-lg shrink-0 ${i % 2 === 0 ? 'bg-[color-mix(in_srgb,var(--text-primary)_6%,var(--card-bg))]' : 'bg-[color-mix(in_srgb,var(--text-primary)_10%,var(--card-bg))]'}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors line-clamp-2 leading-snug font-medium block">
                          {p.title}
                        </span>
                        <span className={`text-xs tabular-nums mt-0.5 inline-block ${tempColor}`}>{tempStr}°</span>
                      </div>
                    </Link>
                  )
                })}
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
              className="mt-3 block text-sm text-text-primary font-medium hover:underline"
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
        <Link href="/circles" className="mt-3 inline-block text-sm font-medium text-text-primary hover:underline">
          {t('rightPanel.exploreCircles')} →
        </Link>
      </PanelCard>

      {isFeedHome ? (
        <TopResonatorsCard />
      ) : !postId ? (
        <PanelCard>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
            {t('rightPanel.trendingTags')}
          </p>
          <div className="flex flex-wrap gap-2">
            {(popular ?? []).map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${encodeURIComponent(tag.name)}`}
                className="text-sm px-2.5 py-1 rounded-lg bg-nav-hover text-text-secondary border border-border-subtle/60 hover:text-text-primary hover:border-[color-mix(in_srgb,var(--text-primary)_22%,var(--card-border))] transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </PanelCard>
      ) : null}

      <footer className="pt-3 text-[10px] text-text-muted uppercase tracking-[0.12em] text-center leading-relaxed flex flex-wrap justify-center gap-x-2 gap-y-1">
        <a href="#" className="hover:text-text-primary transition-colors">
          {t('rightPanel.footerWhitepaper')}
        </a>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-text-primary transition-colors">
          {t('rightPanel.footerGovernance')}
        </a>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-text-primary transition-colors">
          {t('rightPanel.footerApi')}
        </a>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-text-primary transition-colors">
          {t('rightPanel.footerTerms')}
        </a>
      </footer>
      <p className="text-[10px] text-center text-text-muted font-semibold uppercase tracking-widest pt-1">
        {t('rightPanel.nodeStatus')}
      </p>
    </aside>
  )
}
