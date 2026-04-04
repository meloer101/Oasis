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
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-elevated)] ${className}`}
    >
      {children}
    </div>
  )
}

function TreasuryCard({ balance }: { balance: number }) {
  const { t } = useLocale()
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--card-border)] shadow-md">
      <div className="p-4 bg-[color-mix(in_srgb,var(--brand)_88%,black)] text-brand-foreground dark:bg-[color-mix(in_srgb,var(--brand)_28%,#030712)] dark:text-text-primary">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-90">
          {t('rightPanel.yourTreasury')}
        </p>
        <p className="text-2xl font-bold tabular-nums mt-1 tracking-tight">{formatCoins(balance)} AG</p>
        <Link
          href="/wallet"
          className="mt-3 block w-full text-center text-sm font-semibold rounded-lg py-2.5 bg-rose text-text-primary hover:bg-rose-hover transition-colors shadow-sm dark:bg-brand dark:text-brand-foreground dark:hover:opacity-95"
        >
          {t('rightPanel.claimRewards')}
        </Link>
      </div>
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
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          {t('rightPanel.topResonators')}
        </p>
        <Link href="/circles" className="text-[10px] font-semibold uppercase tracking-wide text-brand hover:underline shrink-0">
          {t('rightPanel.viewAll')} →
        </Link>
      </div>
      {isLoading && <p className="text-xs text-text-muted py-2">{t('feed.loading')}</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-text-muted py-1">{t('rightPanel.noResonatorsYet')}</p>
      )}
      <div className="space-y-3">
        {!isLoading &&
          rows.map((c) => {
            const u = c.creator
            const pct = resonancePercent(u.id)
            return (
              <div key={c.id} className="flex items-center gap-2">
                <Avatar
                  src={u.avatarUrl}
                  name={u.displayName ?? u.username}
                  className="w-8 h-8 rounded-full bg-brand-muted shrink-0 text-xs font-bold"
                  textClassName="text-brand"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/user/${u.username}`}
                    className="text-sm font-medium text-text-primary hover:text-brand truncate block"
                  >
                    @{u.username}
                  </Link>
                  <p className="text-[10px] text-text-muted tabular-nums">
                    {pct}% {t('rightPanel.resonance')}
                  </p>
                </div>
                <Link
                  href={`/user/${u.username}`}
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg border border-border-subtle text-text-secondary hover:border-brand/40 hover:text-brand transition-colors"
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
        {t('rightPanel.globalResonance')}
      </p>
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{
          background: `linear-gradient(90deg, var(--brand) 0%, var(--rose) 50%, var(--sage) 100%)`,
        }}
        aria-hidden
      />
      <p className="text-sm font-bold text-text-primary mt-3">{t('rightPanel.resonanceActive', { pct })}</p>
      <p className="text-xs text-text-muted mt-1 leading-relaxed">{t('rightPanel.resonanceBlurb')}</p>
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

  if (pathname.startsWith('/feed/new')) {
    return null
  }

  return (
    <aside className="hidden xl:block w-[300px] shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto py-4 pl-2 space-y-4">
      <TreasuryCard balance={balance} />
      <ResonanceCard />

      {postId && post ? (
        <>
          <PanelCard>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-3">
              {t('rightPanel.author')}
            </p>
            <div className="flex items-start gap-3">
              <Avatar
                src={post.author.avatarUrl}
                name={post.author.displayName ?? post.author.username}
                className="w-12 h-12 rounded-full bg-brand shrink-0 text-lg font-bold"
                textClassName="text-brand-foreground"
              />
              <div className="min-w-0">
                <Link
                  href={`/user/${post.author.username}`}
                  className="font-semibold text-text-primary hover:text-brand transition-colors block truncate"
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
                {post.tags.map((tag, i) => (
                  <Link
                    key={tag}
                    href={`/tag/${encodeURIComponent(tag)}`}
                    className={`text-sm font-medium hover:underline ${i % 2 === 0 ? 'text-brand' : 'text-sage'}`}
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
                  const tempColor = temp < 0 ? 'text-red-400' : 'text-sage'
                  return (
                    <Link
                      key={p.id}
                      href={`/post/${p.id}`}
                      className="flex items-start gap-3 group rounded-lg hover:bg-nav-hover/80 -mx-1 px-1 py-0.5 transition-colors"
                    >
                      <div
                        className={`w-14 h-14 rounded-lg shrink-0 ${i % 2 === 0 ? 'bg-brand-muted' : 'bg-rose/25'}`}
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
              className="mt-3 block text-sm text-brand font-medium hover:underline"
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
        <Link href="/circles" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
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
                className="text-sm px-2.5 py-1 rounded-lg bg-nav-hover text-text-secondary border border-border-subtle/60 hover:text-brand hover:border-brand/30 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </PanelCard>
      ) : null}

      <footer className="pt-3 text-[10px] text-text-muted uppercase tracking-[0.12em] text-center leading-relaxed flex flex-wrap justify-center gap-x-2 gap-y-1">
        <a href="#" className="hover:text-brand transition-colors">
          {t('rightPanel.footerWhitepaper')}
        </a>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-brand transition-colors">
          {t('rightPanel.footerGovernance')}
        </a>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-brand transition-colors">
          {t('rightPanel.footerApi')}
        </a>
        <span aria-hidden>·</span>
        <a href="#" className="hover:text-brand transition-colors">
          {t('rightPanel.footerTerms')}
        </a>
      </footer>
      <p className="text-[10px] text-center text-brand font-semibold uppercase tracking-widest pt-1">
        {t('rightPanel.nodeStatus')}
      </p>
    </aside>
  )
}
