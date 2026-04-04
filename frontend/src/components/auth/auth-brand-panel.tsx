'use client'

import { useLocale } from '@/hooks/use-locale'

export function AuthBrandPanel() {
  const { t } = useLocale()

  return (
    <div className="relative lg:w-[46%] min-h-[200px] lg:min-h-0 p-8 lg:p-10 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-muted/80 via-[var(--surface)] to-rose/10 dark:from-[#0f172a] dark:via-[#111827] dark:to-[#082f2e]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:hidden"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgb(110 127 156 / 0.25) 0, transparent 45%),
            radial-gradient(circle at 85% 70%, rgb(212 176 181 / 0.2) 0, transparent 40%),
            linear-gradient(135deg, transparent 40%, rgb(156 175 136 / 0.12) 100%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block opacity-[0.55]"
        style={{
          backgroundImage: `radial-gradient(circle at 72% 88%, rgb(45 212 191 / 0.18) 0, transparent 52%),
            radial-gradient(circle at 18% 22%, rgb(45 212 191 / 0.06) 0, transparent 42%),
            linear-gradient(165deg, transparent 30%, rgb(19 78 74 / 0.35) 100%)`,
        }}
        aria-hidden
      />
      <div className="relative z-[1]">
        <div className="flex items-center gap-2.5 mb-8">
          <span
            className="inline-flex size-9 rounded-md bg-brand shadow-sm dark:bg-gradient-to-br dark:from-emerald-500 dark:to-[#2dd4bf]"
            aria-hidden
          />
          <span className="text-xl font-bold tracking-tight text-text-primary">Oasis</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight tracking-tight">
          {t('auth.brand.headlineLead')}{' '}
          <span className="text-brand italic">{t('auth.brand.headlineAccent')}</span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-text-secondary leading-relaxed max-w-md">
          {t('auth.brand.description')}
        </p>
      </div>
      <div className="relative z-[1] mt-10 lg:mt-0 pt-6 border-t border-border-subtle/60">
        <div
          className="h-0.5 w-8 rounded-full bg-brand mb-2 dark:bg-gradient-to-r dark:from-emerald-400 dark:to-[#2dd4bf]"
          aria-hidden
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          {t('auth.brand.protocolStatus')}
        </p>
        <p className="text-sm font-bold text-text-primary dark:text-brand mt-0.5 tabular-nums">
          {t('auth.brand.synchronized')}
        </p>
      </div>
    </div>
  )
}
