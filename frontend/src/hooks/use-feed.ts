import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Post, FeedType, PostCategory } from '@/lib/types'

interface FeedPage {
  items: Post[]
  nextCursor: string | null
  followFallback?: boolean
}

export function useFeed(feedType: FeedType, category?: PostCategory | 'all') {
  const cat = category && category !== 'all' ? category : undefined
  return useInfiniteQuery<FeedPage>({
    queryKey: ['feed', feedType, cat ?? 'all'],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { feed: feedType, limit: '20' }
      if (pageParam) params.cursor = pageParam as string
      if (cat) params.category = cat
      const res = await apiClient.get('/api/posts', { params })
      return res.data as FeedPage
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
