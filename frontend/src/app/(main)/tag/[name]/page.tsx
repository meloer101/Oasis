'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import PostCard from '@/components/feed/post-card'
import type { Tag, Post } from '@/lib/types'

function useTagDetail(name: string) {
  return useQuery<{ tag: Tag; posts: Post[] }>({
    queryKey: ['tag', name],
    queryFn: async () => {
      const res = await apiClient.get(`/api/tags/${name}`)
      return res.data
    },
  })
}

export default function TagPage() {
  const params = useParams()
  const name = params.name as string
  const router = useRouter()
  const { data, isLoading, error } = useTagDetail(name)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p>标签「{name}」不存在</p>
        <button onClick={() => router.back()} className="text-emerald-400 text-sm mt-2">
          返回
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Tag header */}
      <div className="mb-5">
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4 flex items-center gap-1"
        >
          ← 返回
        </button>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-zinc-100">#{data.tag.name}</span>
          <span className="text-sm text-zinc-600">{data.tag.postCount} 篇帖子</span>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {data.posts.length === 0 ? (
          <p className="text-center py-12 text-zinc-600 text-sm">这个标签下还没有帖子</p>
        ) : (
          data.posts.map((post) => (
            <PostCard key={post.id} post={post} feedQueryKey={['tag', name]} />
          ))
        )}
      </div>
    </div>
  )
}
