import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Circle, Post } from '@/lib/types'

export function useCircle(id: string) {
  return useQuery<Circle>({
    queryKey: ['circle', id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/circles/${id}`)
      return res.data
    },
  })
}

export function useCirclePosts(id: string) {
  return useQuery<Post[]>({
    queryKey: ['circle-posts', id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/circles/${id}/posts`)
      return res.data
    },
  })
}

export function useJoinCircle(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post(`/api/circles/${id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle', id] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
}

export function useLeaveCircle(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.delete(`/api/circles/${id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle', id] })
    },
  })
}

export function useCircles() {
  return useQuery<Circle[]>({
    queryKey: ['circles'],
    queryFn: async () => {
      const res = await apiClient.get('/api/circles')
      return res.data
    },
  })
}
