'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import en from '@/locales/en.json'
import zh from '@/locales/zh.json'

export type Locale = 'en' | 'zh'

const STORAGE_KEY = 'oasis_locale'

const catalogs: Record<Locale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  zh: zh as Record<string, unknown>,
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur !== null && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return cur
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`,
  )
}

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === 'zh' || raw === 'en') return raw
  return 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    setLocaleState(readStoredLocale())
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const table = catalogs[locale]
      const fallbackTable = catalogs.en
      let value = getByPath(table, key)
      if (typeof value !== 'string') {
        value = getByPath(fallbackTable, key)
      }
      const str = typeof value === 'string' ? value : key
      return interpolate(str, vars)
    },
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocaleContext() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocaleContext must be used within LocaleProvider')
  }
  return ctx
}
