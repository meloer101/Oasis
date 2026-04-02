'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins } from '@/lib/utils'
import PostCard from '@/components/feed/post-card'
import { useAuth } from '@/providers/auth-provider'
import type { Post } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'

const BADGE_META: Record<string, { emoji: string; color: string; bg: string }> = {
  newcomer:    { emoji: '🌱', color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-800/50' },
  resonator:   { emoji: '⚡', color: 'text-blue-400',    bg: 'bg-blue-900/30 border-blue-800/50' },
  vibe_master: { emoji: '🔥', color: 'text-orange-400',  bg: 'bg-orange-900/30 border-orange-800/50' },
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
}

interface UserPost {
  id: string
  title: string
  contentType: 'markdown' | 'link' | 'image'
  viewCount: number
  commentCount: number
  voterCount: number
  totalVoteAmount: number
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

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<UserProfile>({
    queryKey: ['user', username],
    queryFn: () => apiClient.get(`/api/users/${username}`).then((r) => r.data),
  })

  const { data: userPosts, isLoading: postsLoading } = useQuery<UserPost[]>({
    queryKey: ['userPosts', username],
    queryFn: () => apiClient.get(`/api/users/${username}/posts`).then((r) => r.data),
    enabled: !!profile,
  })

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
        <button onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
          {t('user.goBack')}
        </button>
      </div>
    )
  }

  const displayName = profile.displayName ?? profile.username
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-5 flex items-center gap-1"
      >
        {t('user.back')}
      </button>

      <div className="bg-surface border border-border-subtle rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{displayName}</h1>
              {profile.founderNumber && (
                <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/50 rounded px-1.5 py-0.5">
                  Founder #{profile.founderNumber}
                </span>
              )}
              {profile.badges
                .filter((b) => b.isActive && b.badgeType !== 'founder' && BADGE_META[b.badgeType])
                .map((b) => {
                  const meta = BADGE_META[b.badgeType]
                  return (
                    <span
                      key={b.badgeType}
                      className={`text-xs border rounded px-1.5 py-0.5 ${meta.bg} ${meta.color}`}
                    >
                      {meta.emoji} {t(`wallet.badges.${b.badgeType}` as Parameters<typeof t>[0])}
                    </span>
                  )
                })}
            </div>
            <p className="text-sm text-text-muted mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">{profile.bio}</p>
            )}
            <p className="text-xs text-text-muted mt-2">
              {t('user.joined', { time: timeAgo(profile.createdAt) })}
            </p>
          </div>

          {currentUser && !isOwnProfile && (
            <button
              onClick={() => followMutation.mutate(!isFollowing)}
              disabled={followMutation.isPending}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isFollowing
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-text-primary hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-border-subtle'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isFollowing ? t('user.following') : t('user.follow')}
            </button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          {t('user.posts')}
        </h2>

        {postsLoading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!postsLoading && postsAsPost.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">{t('user.noPosts')}</p>
        )}

        <div className="space-y-3">
          {postsAsPost.map((post) => (
            <PostCard key={post.id} post={post} feedQueryKey={['userPosts', username]} />
          ))}
        </div>
      </div>
    </div>
  )
}
