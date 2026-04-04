'use client'

import { useLocale } from '@/hooks/use-locale'

export function AuthShellFooter() {
  const { t } = useLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="shrink-0 border-t border-border-subtle bg-[var(--card-bg)]/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs uppercase tracking-[0.15em] text-text-muted">
        <p>{t('auth.layout.footerCopyright', { year })}</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="#" className="hover:text-brand transition-colors">
            {t('auth.layout.privacy')}
          </a>
          <a href="#" className="hover:text-brand transition-colors">
            {t('auth.layout.architecture')}
          </a>
          <a href="#" className="hover:text-brand transition-colors">
            {t('auth.layout.apiDocs')}
          </a>
        </nav>
      </div>
    </footer>
  )
}
