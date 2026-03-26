'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'

const schema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  displayName: z.string().min(1, 'Display name required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { login } = useAuth()
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
      login(res.data.token, res.data.user)
      router.replace('/feed')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Registration failed')
    }
  }

  const inputClass =
    'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors text-sm'

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold text-emerald-400 mb-1">Oasis</div>
        <p className="text-zinc-500 text-sm">Join the consensus</p>
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

        <p className="text-xs text-zinc-600 text-center">
          You'll receive 100 Agreecoins to get started 🎉
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors text-sm"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-zinc-600 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
