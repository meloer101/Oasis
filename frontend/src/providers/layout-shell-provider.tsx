'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type LayoutShellContextValue = {
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
  rightPanelOpen: boolean
  setRightPanelOpen: (open: boolean) => void
  toggleRightPanel: () => void
}

const LayoutShellContext = createContext<LayoutShellContextValue | null>(null)

export function LayoutShellProvider({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((o) => !o)
  }, [])

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen((o) => !o)
  }, [])

  const value = useMemo(
    () => ({
      mobileSidebarOpen,
      setMobileSidebarOpen,
      toggleMobileSidebar,
      rightPanelOpen,
      setRightPanelOpen,
      toggleRightPanel,
    }),
    [mobileSidebarOpen, rightPanelOpen]
  )

  return <LayoutShellContext.Provider value={value}>{children}</LayoutShellContext.Provider>
}

export function useLayoutShell() {
  const ctx = useContext(LayoutShellContext)
  if (!ctx) throw new Error('useLayoutShell must be used within LayoutShellProvider')
  return ctx
}
