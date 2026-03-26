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
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
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
      const res = await apiClient.post('/api/auth/login', data)
      login(res.data.token, res.data.user)
      router.replace('/feed')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg ?? 'Login failed')
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold text-emerald-400 mb-1">Oasis</div>
        <p className="text-zinc-500 text-sm">Where ideas find consensus</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input
            {...register('email')}
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors text-sm"
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <input
            {...register('password')}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-700 transition-colors text-sm"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors text-sm mt-1"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-zinc-600 text-sm">
        No account?{' '}
        <Link href="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">
          Create one
        </Link>
      </p>
    </div>
  )
}
