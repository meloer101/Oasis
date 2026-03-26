'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'

export default function RootPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    router.replace(user ? '/feed' : '/login')
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
