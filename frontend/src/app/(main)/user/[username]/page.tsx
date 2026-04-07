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
import { UserProfileSkeleton, PostCardSkeleton } from '@/components/ui/skeletons'

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
        visibility: 'public' as const,
        category: 'else' as const,
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
    return <UserProfileSkeleton />
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

      <header className="mb-10 relative">
        <div
          className="h-40 sm:h-52 w-full bg-gradient-to-r from-teal-400/20 via-emerald-300/10 to-amber-300/20 dark:from-teal-700/10 dark:via-cyan-900/5 dark:to-amber-700/10 rounded-3xl"
          aria-hidden
        />
        <div className="px-4 sm:px-6 -mt-16 sm:-mt-20 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-10">
            <Avatar
              src={profile.avatarUrl}
              name={displayName}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-brand shrink-0 ring-8 ring-[var(--bg)] shadow-xl text-4xl font-medium"
              textClassName="text-brand-foreground"
            />

            <div className="flex-1 min-w-0 pb-2">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-medium text-text-primary tracking-tight">{displayName}</h1>
                {profile.founderNumber ? (
                  <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-full px-3 py-1 font-medium tracking-wide">
                    FOUNDER #{profile.founderNumber}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-text-muted mb-4 font-medium tracking-tight">@{profile.username}</p>
              {profile.bio ? (
                <p className="text-base text-text-secondary leading-relaxed max-w-2xl font-normal">{profile.bio}</p>
              ) : (
                <p className="text-sm text-text-muted italic">{t('user.noBio')}</p>
              )}
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary">{profile.followerCount}</span>
                  <span className="text-xs text-text-muted uppercase tracking-wider">{t('user.followers')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary">{profile.followingCount}</span>
                  <span className="text-xs text-text-muted uppercase tracking-wider">{t('user.followingCount')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary">{profile.postCount}</span>
                  <span className="text-xs text-text-muted uppercase tracking-wider">{t('user.posts')}</span>
                </div>
              </div>
            </div>

            {currentUser && !isOwnProfile ? (
              <button
                type="button"
                onClick={() => followMutation.mutate(!isFollowing)}
                disabled={followMutation.isPending}
                className={`shrink-0 px-8 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95 disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-transparent text-text-primary border border-[var(--border-subtle)] hover:bg-nav-hover'
                    : 'bg-text-primary text-[var(--bg)] hover:opacity-80'
                }`}
              >
                {isFollowing ? t('user.following') : t('user.follow')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex mt-12 border-b border-[var(--border-subtle)] px-2">
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={`px-6 py-4 text-sm font-medium border-b-2 -mb-px transition-all ${
              tab === 'posts' ? 'border-text-primary text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {t('user.tabPosts')}
          </button>
          <button
            type="button"
            onClick={() => setTab('circles')}
            className={`px-6 py-4 text-sm font-medium border-b-2 -mb-px transition-all ${
              tab === 'circles' ? 'border-text-primary text-text-primary' : 'border-transparent text-text-muted hover:text-text-secondary'
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
            <div className="space-y-4">
              <PostCardSkeleton />
              <PostCardSkeleton />
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
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[color-mix(in_srgb,var(--text-primary)_7%,var(--card-bg))] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-24 rounded bg-[color-mix(in_srgb,var(--text-primary)_7%,var(--card-bg))] animate-pulse" />
                    <div className="h-3 w-full rounded bg-[color-mix(in_srgb,var(--text-primary)_7%,var(--card-bg))] animate-pulse" />
                    <div className="h-3 w-16 rounded bg-[color-mix(in_srgb,var(--text-primary)_7%,var(--card-bg))] animate-pulse" />
                  </div>
                </div>
              ))}
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
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-5 hover:shadow-lg transition-all duration-300 flex gap-4 group"
    >
      <div className="w-14 h-14 rounded-xl bg-[color-mix(in_srgb,var(--text-primary)_5%,var(--bg))] flex items-center justify-center text-2xl font-medium text-text-primary shrink-0 transition-transform group-hover:scale-105">
        {circle.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-text-primary truncate text-lg">{circle.name}</p>
        {circle.description ? (
          <p className="text-sm text-text-muted line-clamp-1 mt-1 font-normal">{circle.description}</p>
        ) : null}
        <div className="flex gap-4 mt-3 text-[11px] text-text-muted uppercase tracking-wider font-medium">
          <span>
            {circle.memberCount} {t('circles.members')}
          </span>
          <span>
            {circle.postCount} {t('circles.posts')}
          </span>
        </div>
      </div>
    </Link>
  )
}
