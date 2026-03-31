import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

/** No interceptors — used for refresh/logout to avoid recursion. */
export const bareApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null

function isAuthPublicPath(url?: string): boolean {
  if (!url) return false
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout')
  )
}

async function runRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const rt =
          typeof window !== 'undefined' ? localStorage.getItem('oasis_refresh_token') : null
        if (!rt) return null
        const { data } = await bareApi.post<{
          accessToken: string
          refreshToken: string
        }>('/api/auth/refresh', { refreshToken: rt })
        if (typeof window !== 'undefined') {
          localStorage.setItem('oasis_access_token', data.accessToken)
          localStorage.setItem('oasis_refresh_token', data.refreshToken)
        }
        return { accessToken: data.accessToken, refreshToken: data.refreshToken }
      } catch {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('oasis_access_token')
          localStorage.removeItem('oasis_refresh_token')
          localStorage.removeItem('oasis_token')
        }
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('oasis_access_token')
  localStorage.removeItem('oasis_refresh_token')
  localStorage.removeItem('oasis_token')
}

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('oasis_access_token') ?? localStorage.getItem('oasis_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const status = err.response?.status
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (status !== 401 || !originalRequest || typeof window === 'undefined') {
      return Promise.reject(err)
    }

    const url = originalRequest.url?.toString() ?? ''
    if (isAuthPublicPath(url)) {
      if (url.includes('/api/auth/refresh')) {
        clearAuthStorage()
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }

    if (originalRequest._retry) {
      clearAuthStorage()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    originalRequest._retry = true

    const tokens = await runRefresh()
    if (!tokens) {
      clearAuthStorage()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
    return apiClient(originalRequest)
  }
)
