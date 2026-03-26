'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

interface AuthContextType {
  user: User | null
  balance: number
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refreshBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('oasis_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    apiClient
      .get('/api/users/me')
      .then((res) => {
        setUser(res.data)
        setBalance(res.data.balance?.balance ?? 0)
      })
      .catch(() => {
        localStorage.removeItem('oasis_token')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = (token: string, userData: User) => {
    localStorage.setItem('oasis_token', token)
    setUser(userData)
  }

  const logout = () => {
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
