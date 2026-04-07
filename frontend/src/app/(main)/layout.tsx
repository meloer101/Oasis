'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { LayoutShellProvider } from '@/providers/layout-shell-provider'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import RightPanel from '@/components/layout/right-panel'
import RightPanelToggle from '@/components/layout/right-panel-toggle'
import MobileNav from '@/components/layout/mobile-nav'

function HeaderFallback() {
  return (
    <div
      className="sticky top-0 z-30 h-12 shrink-0 border-b border-[var(--card-border)] bg-[var(--topnav-bg)] backdrop-blur-xl backdrop-saturate-[180%]"
      aria-hidden
    />
  )
}

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <LayoutShellProvider>
      <div className="min-h-screen flex flex-col bg-[var(--bg)]">
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>

        <div className="flex flex-1 min-h-0 min-w-0 relative">
          <RightPanelToggle />
          <Sidebar />

          <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-[4.5rem] md:pb-6">{children}</main>

          <RightPanel />
        </div>

        <MobileNav />
      </div>
    </LayoutShellProvider>
  )
}
