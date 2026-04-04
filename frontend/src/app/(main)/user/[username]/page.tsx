'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { timeAgo, tagHue, formatCoins } from '@/lib/utils'
import PostCard from '@/components/feed/post-card'
import { useAuth } from '@/providers/auth-provider'
import type { Post, Circle } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'
import { useCircles } from '@/hooks/use-circle'
import { Avatar } from '@/components/ui/avatar'

const BADGE_META: Record<string, { emoji: string; color: string; bg: string }> = {
  newcomer: { emoji: '🌱', color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-800/50' },
  resonator: { emoji: '⚡', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/50' },
  vibe_master: { emoji: '🔥', color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800/50' },
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
  viewCount: number
  commentCount: number
  voterCount: number
  totalVoteAmount: number
  temperature: string
  createdAt: string
}

function profileBannerHue(username: string): number {
  return tagHue(`@${username}`)
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
        imageUrl: null,
        content: '',
        circleId: null,
        visibility: 'public',
        tags: [],
        disagreeVoteAmount: 0,
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
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">
        {t('user.notFound')}{' '}
        <button type="button" onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
          {t('user.goBack')}
        </button>
      </div>
    )
  }

  const displayName = profile.displayName ?? profile.username
  const initial = displayName.charAt(0).toUpperCase()
  const hue = profileBannerHue(profile.username)

  return (
    <div>
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-5 flex items-center gap-1"
      >
        {t('user.back')}
      </button>

      <header
        className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden mb-6 shadow-sm"
        style={{
          backgroundImage: `linear-gradient(135deg, hsla(${hue}, 55%, 42%, 0.35), transparent 55%), linear-gradient(var(--card-bg), var(--card-bg))`,
        }}
      >
        <div className="px-6 sm:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <Avatar
              src={profile.avatarUrl}
              name={displayName}
              className="w-20 h-20 sm:w-[5.5rem] sm:h-[5.5rem] rounded-full bg-emerald-700 shrink-0 ring-4 ring-white/20 dark:ring-black/20 text-3xl font-bold"
              textClassName="text-white"
            />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{displayName}</h1>
                {profile.founderNumber ? (
                  <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/50 rounded px-2 py-0.5">
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
                        className={`text-xs border rounded px-2 py-0.5 ${meta.bg} ${meta.color}`}
                      >
                        {meta.emoji} {t(`wallet.badges.${b.badgeType}` as Parameters<typeof t>[0])}
                      </span>
                    )
                  })}
              </div>
              <p className="text-sm text-text-muted mb-2">@{profile.username}</p>
              {profile.bio ? (
                <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">{profile.bio}</p>
              ) : (
                <p className="text-sm text-text-muted italic">{t('user.noBio')}</p>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
                <span className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{profile.followerCount}</span>{' '}
                  {t('user.followers')}
                </span>
                <span className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{profile.followingCount}</span>{' '}
                  {t('user.followingCount')}
                </span>
                <span className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{profile.postCount}</span>{' '}
                  {t('user.posts')}
                </span>
                {profile.totalReceived > 0 && (
                  <span className="text-sm text-text-secondary">
                    <span className="font-semibold text-emerald-500">⚡ {formatCoins(profile.totalReceived)}</span>{' '}
                    {t('user.totalReceived')}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-2">
                {t('user.joined', { time: timeAgo(profile.createdAt) })}
              </p>
            </div>

            {currentUser && !isOwnProfile ? (
              <button
                type="button"
                onClick={() => followMutation.mutate(!isFollowing)}
                disabled={followMutation.isPending}
                className={`shrink-0 px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-nav-hover text-text-primary border border-[var(--card-border)] hover:bg-nav-active'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {isFollowing ? t('user.following') : t('user.follow')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex border-t border-[var(--card-border)] px-2 bg-[var(--card-bg)]">
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === 'posts' ? 'border-emerald-500 text-text-primary' : 'border-transparent text-text-muted'
            }`}
          >
            {t('user.tabPosts')}
          </button>
          <button
            type="button"
            onClick={() => setTab('circles')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === 'circles' ? 'border-emerald-500 text-text-primary' : 'border-transparent text-text-muted'
            }`}
          >
            {t('user.tabCircles')}
          </button>
        </div>
      </header>

      {tab === 'posts' ? (
        <div>
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : postsAsPost.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-12">{t('user.noPosts')}</p>
          ) : (
            <div className="space-y-4">
              {postsAsPost.map((post) => (
                <PostCard key={post.id} post={post} feedQueryKey={['userPosts', username]} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {circlesLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ownedCircles.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-sm space-y-2">
              <p>{t('user.circlesEmpty')}</p>
              <Link href="/circles" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
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

function CircleMiniCard({ circle }: { circle: Circle }) {
  const { t } = useLocale()
  return (
    <Link
      href={`/circle/${circle.id}`}
      className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 hover:shadow-md transition-shadow flex gap-3"
    >
      <div className="w-12 h-12 rounded-xl bg-emerald-900/40 flex items-center justify-center text-xl font-bold text-emerald-300 shrink-0">
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
