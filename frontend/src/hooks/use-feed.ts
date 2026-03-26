import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Post, FeedType } from '@/lib/types'

interface FeedPage {
  items: Post[]
  nextCursor: string | null
}

export function useFeed(feedType: FeedType) {
  return useInfiniteQuery<FeedPage>({
    queryKey: ['feed', feedType],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { feed: feedType, limit: '20' }
      if (pageParam) params.cursor = pageParam as string
      const res = await apiClient.get('/api/posts', { params })
      return res.data as FeedPage
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
