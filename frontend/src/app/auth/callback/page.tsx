'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { apiClient } from '@/lib/api-client'
import { useLocale } from '@/hooks/use-locale'

function OAuthCallbackInner() {
  const { login } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState(false)

  useEffect(() => {
    async function handle() {
      const errorParam = searchParams.get('error')
      if (errorParam) {
        setError(true)
        setTimeout(() => router.replace('/login'), 3000)
        return
      }

      const accessToken = searchParams.get('accessToken')
      const refreshToken = searchParams.get('refreshToken')

      if (!accessToken || !refreshToken) {
        router.replace('/login')
        return
      }

      // Clear tokens from URL immediately to prevent history/referer leakage
      window.history.replaceState({}, '', '/auth/callback')

      localStorage.setItem('oasis_access_token', accessToken)
      localStorage.setItem('oasis_refresh_token', refreshToken)

      try {
        const res = await apiClient.get('/api/users/me')
        login(accessToken, refreshToken, res.data)
        router.replace('/feed')
      } catch {
        localStorage.removeItem('oasis_access_token')
        localStorage.removeItem('oasis_refresh_token')
        setError(true)
        setTimeout(() => router.replace('/login'), 3000)
      }
    }

    handle()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const baseClass = 'min-h-screen bg-background flex items-center justify-center'

  if (error) {
    return (
      <div className={baseClass}>
        <p className="text-red-400 text-sm">{t('auth.oauth.callbackError')}</p>
      </div>
    )
  }

  return (
    <div className={baseClass}>
      <p className="text-text-muted text-sm">{t('auth.oauth.processing')}</p>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-text-muted text-sm">Loading…</p>
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  )
}
