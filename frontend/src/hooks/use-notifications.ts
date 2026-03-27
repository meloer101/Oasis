import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { Notification } from '@/lib/types'

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/api/notifications')
      return res.data
    },
    refetchInterval: 30_000, // poll every 30s
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
