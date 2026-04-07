'use client'

import { useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLocale()

  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--text-primary)_7%,var(--card-bg))] flex items-center justify-center text-2xl mb-5 border border-[var(--card-border)]">
        ⚡
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">{t('error.title')}</h2>
      <p className="text-sm text-text-muted max-w-sm leading-relaxed mb-6">
        {t('error.description')}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {t('error.retry')}
        </button>
        <a
          href="/"
          className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-text-secondary text-sm font-semibold hover:bg-nav-hover transition-colors"
        >
          {t('error.goHome')}
        </a>
      </div>
      {error.digest && (
        <p className="mt-6 text-[11px] text-text-muted font-mono opacity-60">
          digest: {error.digest}
        </p>
      )}
    </div>
  )
}
