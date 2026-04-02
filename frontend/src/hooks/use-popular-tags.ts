import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export type PopularTag = { id: string; name: string; postCount: number }

export function usePopularTags(limit = 12) {
  return useQuery({
    queryKey: ['tags-popular', limit],
    queryFn: async () => {
      const { data } = await apiClient.get<PopularTag[]>('/api/tags')
      return (data ?? []).slice(0, limit)
    },
    staleTime: 60_000,
  })
}
