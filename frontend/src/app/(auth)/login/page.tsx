'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/hooks/use-locale'
import { OAuthButtons, OAuthManualDivider } from '@/components/auth/oauth-buttons'
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel'
import { PasswordField } from '@/components/auth/password-field'

const schema = z.object({
  email: z.string().email('Invalid email').transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

const inputClass =
  'w-full bg-input border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors text-sm'

export default function LoginPage() {
  const { login } = useAuth()
  const { t } = useLocale()
  const router = useRouter()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setError('')
    try {
      const res = await apiClient.post('/api/auth/login', data)
      login(res.data.accessToken, res.data.refreshToken, res.data.user)
      router.replace('/feed')
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } }
      }
      const status = axiosErr.response?.status
      const msg = axiosErr.response?.data?.error
      if (status === 429) {
        setError(t('auth.login.rateLimit'))
      } else {
        setError(msg ?? t('auth.login.failed'))
      }
    }
  }

  return (
    <div className="w-full max-w-[960px] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_20px_50px_-20px_rgb(0_0_0/0.12)] dark:shadow-[0_20px_50px_-20px_rgb(0_0_0/0.4)] overflow-hidden flex flex-col lg:flex-row">
      <AuthBrandPanel />

      <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          {t('auth.login.sessionTitle')}
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary">{t('auth.login.sessionSubtitle')}</p>

        <div className="mt-8">
          <OAuthButtons variant="row" />
        </div>

        <OAuthManualDivider />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted mb-1.5">
              {t('auth.login.emailLabel')}
            </label>
            <input
              id="login-email"
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder={t('auth.login.emailPlaceholder')}
              className={inputClass}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="login-password" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                {t('auth.login.passwordLabel')}
              </label>
              <button
                type="button"
                className="text-[10px] font-bold uppercase tracking-wide text-brand hover:text-brand-hover transition-colors"
              >
                {t('auth.login.recover')}
              </button>
            </div>
            <PasswordField
              id="login-password"
              {...register('password')}
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-soft hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-cta-text font-bold uppercase tracking-[0.12em] text-sm rounded-xl px-4 py-3.5 transition-opacity border border-brand/20"
          >
            {isSubmitting ? t('auth.login.signingIn') : t('auth.login.authorize')}
          </button>
        </form>

        <p className="mt-8 text-center text-text-muted text-sm">
          {t('auth.login.noAccount')}{' '}
          <Link href="/register" className="font-bold text-brand hover:text-brand-hover transition-colors">
            {t('auth.login.createOne')}
          </Link>
        </p>
      </div>
    </div>
  )
}
