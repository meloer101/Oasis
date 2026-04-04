'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins } from '@/lib/utils'
import PostCard from '@/components/feed/post-card'
import { useAuth } from '@/providers/auth-provider'
import type { Post, Circle } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'
import { useCircles } from '@/hooks/use-circle'
import { Avatar } from '@/components/ui/avatar'

const BADGE_META: Record<string, { emoji: string; color: string; bg: string }> = {
  newcomer: { emoji: '🌱', color: 'text-sage', bg: 'bg-sage/15 border-sage/30' },
  resonator: { emoji: '⚡', color: 'text-brand', bg: 'bg-brand-muted border-brand/25' },
  vibe_master: { emoji: '🔥', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-rose/20 border-rose/35' },
}

interface UserProfile {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  founderNumber: number | null
  createdAt: string
  isFollowing: boolean
  badges: { badgeType: string; isActive: boolean }[]
  followerCount: number
  followingCount: number
  postCount: number
  totalReceived: number
}

interface UserPost {
  id: string
  title: string
  contentType: 'markdown' | 'link' | 'image' | 'rich'
  imageUrl: string | null
  viewCount: number
  commentCount: number
  voterCount: number
  totalVoteAmount: number
  disagreeVoteAmount: number
  temperature: string
  createdAt: string
}

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { t } = useLocale()
  const [tab, setTab] = useState<'posts' | 'circles'>('posts')

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<UserProfile>({
    queryKey: ['user', username],
    queryFn: () => apiClient.get(`/api/users/${username}`).then((r) => r.data),
  })

  const { data: userPosts, isLoading: postsLoading } = useQuery<UserPost[]>({
    queryKey: ['userPosts', username],
    queryFn: () => apiClient.get(`/api/users/${username}/posts`).then((r) => r.data),
    enabled: !!profile,
  })

  const { data: allCircles, isLoading: circlesLoading } = useCircles()
  const ownedCircles =
    allCircles?.filter((c) => c.creator?.username === username) ?? []

  const [isFollowing, setIsFollowing] = useState(false)
  useEffect(() => {
    if (profile) setIsFollowing(profile.isFollowing)
  }, [profile])

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      follow
        ? apiClient.post(`/api/users/${username}/follow`)
        : apiClient.delete(`/api/users/${username}/follow`),
    onMutate: (follow: boolean) => {
      setIsFollowing(follow)
    },
    onError: (_err, follow) => {
      setIsFollowing(!follow)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', username] })
    },
  })

  const isOwnProfile = currentUser?.username === username

  const postsAsPost: Post[] = profile
    ? (userPosts ?? []).map((p) => ({
        ...p,
        linkUrl: null,
        imageUrl: p.imageUrl ?? null,
        content: '',
        circleId: null,
        visibility: 'public',
        tags: [],
        disagreeVoteAmount: p.disagreeVoteAmount ?? 0,
        userVoteType: null,
        author: {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
      }))
    : []

  if (profileLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">
        {t('user.notFound')}{' '}
        <button type="button" onClick={() => router.back()} className="text-brand hover:text-brand-hover">
          {t('user.goBack')}
        </button>
      </div>
    )
  }

  const displayName = profile.displayName ?? profile.username

  return (
    <div>
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-5 flex items-center gap-1"
      >
        {t('user.back')}
      </button>

      <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden mb-6 shadow-sm">
        <div
          className="h-32 sm:h-40 w-full bg-gradient-to-r from-teal-400/85 via-emerald-300/55 to-amber-300/80 dark:from-teal-700/45 dark:via-cyan-900/35 dark:to-amber-700/40"
          aria-hidden
        />
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 -mt-14 sm:-mt-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8">
            <Avatar
              src={profile.avatarUrl}
              name={displayName}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-brand shrink-0 ring-4 ring-[var(--card-bg)] shadow-md text-3xl font-bold"
              textClassName="text-brand-foreground"
            />

            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{displayName}</h1>
                {profile.founderNumber ? (
                  <span className="text-xs bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 rounded-full px-2.5 py-0.5 font-semibold">
                    Founder #{profile.founderNumber}
                  </span>
                ) : null}
                {profile.badges
                  .filter((b) => b.isActive && b.badgeType !== 'founder' && BADGE_META[b.badgeType])
                  .map((b) => {
                    const meta = BADGE_META[b.badgeType]
                    return (
                      <span
                        key={b.badgeType}
                        className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 ${meta.bg} ${meta.color}`}
                      >
                        {meta.emoji} {t(`wallet.badges.${b.badgeType}` as Parameters<typeof t>[0])}
                      </span>
                    )
                  })}
              </div>
              <p className="text-sm text-text-muted mb-2">@{profile.username}</p>
              {profile.bio ? (
                <p className="text-sm text-text-secondary leading-relaxed max-w-2xl italic">{profile.bio}</p>
              ) : (
                <p className="text-sm text-text-muted">{t('user.noBio')}</p>
              )}
              <p className="text-xs text-text-muted mt-3">
                {t('user.joined', { time: timeAgo(profile.createdAt) })}
              </p>
            </div>

            {currentUser && !isOwnProfile ? (
              <button
                type="button"
                onClick={() => followMutation.mutate(!isFollowing)}
                disabled={followMutation.isPending}
                className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-nav-hover text-text-primary border border-[var(--card-border)] hover:bg-nav-active'
                    : 'bg-brand text-brand-foreground hover:opacity-90'
                }`}
              >
                {isFollowing ? t('user.following') : t('user.follow')}
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            <ProfileStatCard label={t('user.followers')} value={profile.followerCount} />
            <ProfileStatCard label={t('user.followingCount')} value={profile.followingCount} />
            <ProfileStatCard label={t('user.posts')} value={profile.postCount} />
            <ProfileStatCard
              label={t('user.totalReceived')}
              value={formatCoins(profile.totalReceived)}
              suffix="⚡"
              highlight
            />
          </div>
        </div>

        <div className="flex border-t border-[var(--card-border)] px-2 bg-[var(--card-bg)]">
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === 'posts' ? 'border-brand text-text-primary' : 'border-transparent text-text-muted'
            }`}
          >
            {t('user.tabPosts')}
          </button>
          <button
            type="button"
            onClick={() => setTab('circles')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === 'circles' ? 'border-brand text-text-primary' : 'border-transparent text-text-muted'
            }`}
          >
            {t('user.tabCircles')}
          </button>
        </div>
      </header>

      {tab === 'posts' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-5 rounded-full bg-brand shrink-0" aria-hidden />
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-text-primary">
              {t('user.recentContributions')}
            </h2>
          </div>
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : postsAsPost.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-12">{t('user.noPosts')}</p>
          ) : (
            <div className="space-y-4">
              {postsAsPost.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  feedQueryKey={['userPosts', username]}
                  mediaLeft={!!post.imageUrl}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {circlesLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ownedCircles.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-sm space-y-2">
              <p>{t('user.circlesEmpty')}</p>
              <Link href="/circles" className="text-brand font-medium hover:underline">
                {t('user.circlesHint')}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {ownedCircles.map((circle) => (
                <CircleMiniCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileStatCard({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string
  value: string | number
  suffix?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm ${
        highlight
          ? 'ring-1 ring-amber-500/30 border-b-2 border-b-amber-500/65 dark:ring-brand/25 dark:border-b-brand/50'
          : ''
      }`}
    >
      <p
        className={`text-xl sm:text-2xl font-bold tabular-nums flex items-center gap-1.5 ${
          highlight ? 'text-amber-600 dark:text-brand' : 'text-text-primary'
        }`}
      >
        {suffix ? <span className="text-lg opacity-90">{suffix}</span> : null}
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mt-1.5">{label}</p>
    </div>
  )
}

function CircleMiniCard({ circle }: { circle: Circle }) {
  const { t } = useLocale()
  return (
    <Link
      href={`/circle/${circle.id}`}
      className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 hover:shadow-md transition-shadow flex gap-3"
    >
      <div className="w-12 h-12 rounded-xl bg-brand-muted flex items-center justify-center text-xl font-bold text-brand shrink-0">
        {circle.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-text-primary truncate">{circle.name}</p>
        {circle.description ? (
          <p className="text-xs text-text-muted line-clamp-2 mt-1">{circle.description}</p>
        ) : null}
        <div className="flex gap-3 mt-2 text-[11px] text-text-muted">
          <span>
            👤 {circle.memberCount} {t('circles.members')}
          </span>
          <span>
            📝 {circle.postCount} {t('circles.posts')}
          </span>
        </div>
      </div>
    </Link>
  )
}
