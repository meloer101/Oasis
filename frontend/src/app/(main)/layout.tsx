'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import RightPanel from '@/components/layout/right-panel'
import MobileNav from '@/components/layout/mobile-nav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <Header />

      <div className="flex">
        {/* Left sidebar — desktop */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 min-w-0 md:ml-0 max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
          {children}
        </main>

        {/* Right panel — xl screens */}
        <RightPanel />
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
