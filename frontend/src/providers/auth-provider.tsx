'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { apiClient, bareApi } from '@/lib/api-client'

interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
}

interface AuthContextType {
  user: User | null
  balance: number
  isLoading: boolean
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => Promise<void>
  refreshBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      if (typeof window === 'undefined') return

      const legacy = localStorage.getItem('oasis_token')
      if (legacy && !localStorage.getItem('oasis_access_token')) {
        localStorage.setItem('oasis_access_token', legacy)
        localStorage.removeItem('oasis_token')
      }

      let access = localStorage.getItem('oasis_access_token')
      const refresh = localStorage.getItem('oasis_refresh_token')

      if (!access && !refresh) {
        setIsLoading(false)
        return
      }

      if (!access && refresh) {
        try {
          const { data } = await bareApi.post<{
            accessToken: string
            refreshToken: string
          }>('/api/auth/refresh', { refreshToken: refresh })
          localStorage.setItem('oasis_access_token', data.accessToken)
          localStorage.setItem('oasis_refresh_token', data.refreshToken)
          access = data.accessToken
        } catch {
          localStorage.removeItem('oasis_access_token')
          localStorage.removeItem('oasis_refresh_token')
          setIsLoading(false)
          return
        }
      }

      try {
        const res = await apiClient.get('/api/users/me')
        setUser(res.data)
        setBalance(res.data.balance?.balance ?? 0)
      } catch {
        localStorage.removeItem('oasis_access_token')
        localStorage.removeItem('oasis_refresh_token')
        localStorage.removeItem('oasis_token')
      } finally {
        setIsLoading(false)
      }
    }

    bootstrap()
  }, [])

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('oasis_access_token', accessToken)
    localStorage.setItem('oasis_refresh_token', refreshToken)
    localStorage.removeItem('oasis_token')
    setUser(userData)
  }

  const logout = async () => {
    const rt =
      typeof window !== 'undefined' ? localStorage.getItem('oasis_refresh_token') : null
    try {
      if (rt) {
        await bareApi.post('/api/auth/logout', { refreshToken: rt })
      }
    } catch {
      // still clear local session
    }
    localStorage.removeItem('oasis_access_token')
    localStorage.removeItem('oasis_refresh_token')
    localStorage.removeItem('oasis_token')
    setUser(null)
    setBalance(0)
  }

  const refreshBalance = async () => {
    const res = await apiClient.get('/api/users/me')
    setBalance(res.data.balance?.balance ?? 0)
  }

  return (
    <AuthContext.Provider value={{ user, balance, isLoading, login, logout, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
