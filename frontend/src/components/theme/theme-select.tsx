'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'

const OPTIONS = ['light', 'dark', 'system'] as const

export function ThemeSelect() {
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-10 rounded-lg bg-surface border border-border-subtle animate-pulse" />
  }

  return (
    <div className="flex rounded-lg border border-border-subtle p-0.5 gap-0.5">
      {OPTIONS.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
            theme === value
              ? 'bg-nav-active text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {value === 'light' ? t('theme.light') : value === 'dark' ? t('theme.dark') : t('theme.system')}
        </button>
      ))}
    </div>
  )
}
