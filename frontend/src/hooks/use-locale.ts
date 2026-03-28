'use client'

import { useLocaleContext, type Locale } from '@/providers/locale-provider'

export function useLocale(): {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
} {
  return useLocaleContext()
}

export function useTranslation() {
  return useLocaleContext()
}
