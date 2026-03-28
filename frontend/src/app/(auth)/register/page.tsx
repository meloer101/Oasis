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

  const inputClass =
    'w-full bg-surface border border-border-subtle rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-emerald-700 transition-colors text-sm'

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold text-emerald-400 mb-1">Oasis</div>
        <p className="text-text-muted text-sm">{t('auth.register.tagline')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input
            {...register('username')}
            placeholder="Username"
            autoComplete="username"
            className={inputClass}
          />
          {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username.message}</p>}
        </div>

        <div>
          <input
            {...register('displayName')}
            placeholder="Display name"
            className={inputClass}
          />
          {errors.displayName && (
            <p className="mt-1 text-xs text-red-400">{errors.displayName.message}</p>
          )}
        </div>

        <div>
          <input
            {...register('email')}
            type="email"
            placeholder="Email"
            autoComplete="email"
            className={inputClass}
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <input
            {...register('password')}
            type="password"
            placeholder="Password (8+ characters)"
            autoComplete="new-password"
            className={inputClass}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <p className="text-xs text-text-muted text-center">{t('auth.register.bonus')}</p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors text-sm"
        >
          {isSubmitting ? t('auth.register.creating') : t('auth.register.createAccount')}
        </button>
      </form>

      <p className="mt-6 text-center text-text-muted text-sm">
        {t('auth.register.hasAccount')}{' '}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </div>
  )
}
