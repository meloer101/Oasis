import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Post, Comment } from '@/lib/types'

export function usePost(id: string) {
  return useQuery<Post>({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/posts/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useComments(postId: string) {
  return useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/posts/${postId}/comments`)
      return res.data
    },
    enabled: !!postId,
  })
}
