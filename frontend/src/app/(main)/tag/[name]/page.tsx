'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import PostCard from '@/components/feed/post-card'
import type { Tag, Post } from '@/lib/types'
import { useLocale } from '@/hooks/use-locale'

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
  const { t } = useLocale()
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
      <div className="text-center py-16 text-text-muted">
        <p>{t('tag.notFound', { name })}</p>
        <button onClick={() => router.back()} className="text-emerald-400 text-sm mt-2">
          {t('tag.back')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5">
        <button
          onClick={() => router.back()}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-4 flex items-center gap-1"
        >
          {t('tag.return')}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-text-primary">#{data.tag.name}</span>
          <span className="text-sm text-text-muted">
            {t('tag.postCount', { count: data.tag.postCount })}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {data.posts.length === 0 ? (
          <p className="text-center py-12 text-text-muted text-sm">{t('tag.empty')}</p>
        ) : (
          data.posts.map((post) => (
            <PostCard key={post.id} post={post} feedQueryKey={['tag', name]} />
          ))
        )}
      </div>
    </div>
  )
}
