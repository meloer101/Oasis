import { useQuery } from '@tanstack/react-query'
import { AxiosError, isAxiosError } from 'axios'
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
    retry: (failureCount, error) => {
      const status = (error as AxiosError)?.response?.status
      if (status === 403 || status === 404) return false
      return failureCount < 2
    },
  })
}

export type CircleOnlyGatePayload = { id: string; name: string; slug: string }

export function getCircleOnlyGateFromError(error: unknown): CircleOnlyGatePayload | null {
  if (!isAxiosError(error)) return null
  if (error.response?.status !== 403) return null
  const data = error.response.data as { error?: string; circle?: CircleOnlyGatePayload }
  if (data?.error !== 'circle_only' || !data.circle?.id) return null
  return data.circle
}

export function useComments(postId: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  return useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/posts/${postId}/comments`)
      return res.data
    },
    enabled: !!postId && enabled,
  })
}
