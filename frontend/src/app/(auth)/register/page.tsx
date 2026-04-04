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
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores')
    .transform((s) => s.trim().toLowerCase()),
  displayName: z
    .string()
    .min(1, 'Display name required')
    .max(100)
    .transform((s) => s.trim()),
  email: z.string().email('Invalid email').transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8, 'At least 8 characters'),
})
type FormData = z.infer<typeof schema>

const inputClass =
  'w-full bg-input border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors text-sm'

export default function RegisterPage() {
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
      const res = await apiClient.post('/api/auth/register', data)
      login(res.data.accessToken, res.data.refreshToken, res.data.user)
      router.replace('/feed')
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } }
      }
      const status = axiosErr.response?.status
      const msg = axiosErr.response?.data?.error
      if (status === 429) {
        setError(t('auth.register.rateLimit'))
      } else {
        setError(msg ?? t('auth.register.failed'))
      }
    }
  }

  return (
    <div className="w-full max-w-[960px] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_20px_50px_-20px_rgb(0_0_0/0.12)] dark:shadow-[0_20px_50px_-20px_rgb(0_0_0/0.4)] overflow-hidden flex flex-col lg:flex-row">
      <AuthBrandPanel />

      <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          {t('auth.register.sessionTitle')}
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary">{t('auth.register.sessionSubtitle')}</p>

        <div className="mt-6">
          <OAuthButtons variant="row" />
        </div>

        <OAuthManualDivider />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div>
            <label htmlFor="reg-username" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted mb-1.5">
              {t('auth.register.usernameLabel')}
            </label>
            <input
              id="reg-username"
              {...register('username')}
              autoComplete="username"
              placeholder={t('auth.register.usernamePlaceholder')}
              className={inputClass}
            />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-display" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted mb-1.5">
              {t('auth.register.displayNameLabel')}
            </label>
            <input
              id="reg-display"
              {...register('displayName')}
              autoComplete="nickname"
              placeholder={t('auth.register.displayNamePlaceholder')}
              className={inputClass}
            />
            {errors.displayName && (
              <p className="mt-1 text-xs text-red-500">{errors.displayName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted mb-1.5">
              {t('auth.register.emailLabel')}
            </label>
            <input
              id="reg-email"
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder={t('auth.register.emailPlaceholder')}
              className={inputClass}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted mb-1.5">
              {t('auth.register.passwordLabel')}
            </label>
            <PasswordField
              id="reg-password"
              {...register('password')}
              autoComplete="new-password"
              placeholder={t('auth.register.passwordPlaceholder')}
              className={inputClass}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <p className="text-xs text-text-muted text-center">{t('auth.register.bonus')}</p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-soft hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-cta-text font-bold uppercase tracking-[0.12em] text-sm rounded-xl px-4 py-3.5 transition-opacity border border-brand/20"
          >
            {isSubmitting ? t('auth.register.creating') : t('auth.register.createAccount')}
          </button>
        </form>

        <p className="mt-6 text-center text-text-muted text-sm">
          {t('auth.register.hasAccount')}{' '}
          <Link href="/login" className="font-bold text-brand hover:text-brand-hover transition-colors">
            {t('auth.register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}
