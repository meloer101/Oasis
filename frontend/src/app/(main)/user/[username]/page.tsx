'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { timeAgo, formatCoins } from '@/lib/utils'
import PostCard from '@/components/feed/post-card'
import { useAuth } from '@/providers/auth-provider'
import type { Post } from '@/lib/types'

interface UserProfile {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  founderNumber: number | null
  createdAt: string
  isFollowing: boolean
  badges: { badgeType: string }[]
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
        hasVoted: false,
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
      <div className="text-center py-16 text-zinc-500 text-sm">
        User not found.{' '}
        <button onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
          Go back
        </button>
      </div>
    )
  }

  const displayName = profile.displayName ?? profile.username
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-5 flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Profile header */}
      <div className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {initial}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-100">{displayName}</h1>
              {profile.founderNumber && (
                <span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/50 rounded px-1.5 py-0.5">
                  Founder #{profile.founderNumber}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">@{profile.username}</p>
            {profile.bio && (
              <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{profile.bio}</p>
            )}
            <p className="text-xs text-zinc-600 mt-2">Joined {timeAgo(profile.createdAt)}</p>
          </div>

          {/* Follow button */}
          {currentUser && !isOwnProfile && (
            <button
              onClick={() => followMutation.mutate(!isFollowing)}
              disabled={followMutation.isPending}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isFollowing
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
          Posts
        </h2>

        {postsLoading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!postsLoading && postsAsPost.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-8">No posts yet.</p>
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
