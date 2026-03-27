import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { WalletInfo, Transaction } from '@/lib/types'

export function useWallet() {
  return useQuery<WalletInfo>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await apiClient.get('/api/wallet')
      return res.data
    },
  })
}

export function useTransactions() {
  return useInfiniteQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get('/api/wallet/transactions', {
        params: { offset: pageParam, limit: 20 },
      })
      return res.data
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length * 20 : undefined,
    initialPageParam: 0,
  })
}
