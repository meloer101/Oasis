'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCircle, useCirclePosts, useJoinCircle, useLeaveCircle } from '@/hooks/use-circle'
import PostCard from '@/components/feed/post-card'
import { timeAgo, formatCoins } from '@/lib/utils'

export default function CirclePage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const { data: circle, isLoading } = useCircle(id)
  const { data: posts, isLoading: postsLoading } = useCirclePosts(id)
  const join = useJoinCircle(id)
  const leave = useLeaveCircle(id)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p>圈子不存在</p>
        <button onClick={() => router.back()} className="text-emerald-400 text-sm mt-2">
          返回
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Circle header */}
      <div className="bg-zinc-900 border border-zinc-800/50 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-1">{circle.name}</h1>
            {circle.description && (
              <p className="text-sm text-zinc-400 mb-3">{circle.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-zinc-600">
              <span>👤 {circle.memberCount} 成员</span>
              <span>📝 {circle.postCount} 帖子</span>
              {circle.joinFee > 0 && <span>💰 加入需 {formatCoins(circle.joinFee)} 币</span>}
              <span>由 @{circle.creator.username} 创建 · {timeAgo(circle.createdAt)}</span>
            </div>
          </div>

          {/* Join/Leave button */}
          {circle.isMember ? (
            circle.memberRole !== 'creator' ? (
              <button
                onClick={() => leave.mutate()}
                disabled={leave.isPending}
                className="shrink-0 px-4 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-zinc-600 text-sm transition-colors disabled:opacity-50"
              >
                {leave.isPending ? '…' : '退出圈子'}
              </button>
            ) : (
              <span className="shrink-0 text-xs text-zinc-600 px-3 py-1.5 rounded-lg border border-zinc-800">
                山主
              </span>
            )
          ) : (
            <button
              onClick={() => join.mutate()}
              disabled={join.isPending}
              className="shrink-0 px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm transition-colors disabled:opacity-50"
            >
              {join.isPending ? '…' : circle.joinFee > 0 ? `加入 (${formatCoins(circle.joinFee)} 币)` : '加入圈子'}
            </button>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {postsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} feedQueryKey={['circle-posts', id]} />
          ))
        ) : (
          <p className="text-center py-12 text-zinc-600 text-sm">圈子里还没有帖子</p>
        )}
      </div>
    </div>
  )
}
