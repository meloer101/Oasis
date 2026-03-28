'use client'

import { useLocale } from '@/hooks/use-locale'

export function LangSwitch({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale()

  const btn =
    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors border border-border-subtle'

  return (
    <div className={compact ? 'flex items-center' : 'space-y-2'}>
      {!compact && (
        <label className="text-sm text-text-secondary block">{t('sidebar.language')}</label>
      )}
      <div className="flex rounded-lg border border-border-subtle p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => setLocale('en')}
          className={`${btn} ${locale === 'en' ? 'bg-nav-active text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLocale('zh')}
          className={`${btn} ${locale === 'zh' ? 'bg-nav-active text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
        >
          中文
        </button>
      </div>
    </div>
  )
}
