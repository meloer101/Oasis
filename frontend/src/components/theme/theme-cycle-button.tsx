'use client'

import { useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'

export function ThemeCycleButton() {
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const cycle = useCallback(() => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }, [theme, setTheme])

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg border border-border-subtle shrink-0" aria-hidden />
    )
  }

  const icon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'

  return (
    <button
      type="button"
      onClick={cycle}
      title={t('theme.cycleAria')}
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-subtle text-base hover:bg-nav-hover transition-colors shrink-0"
      aria-label={t('theme.cycleAria')}
    >
      {icon}
    </button>
  )
}
