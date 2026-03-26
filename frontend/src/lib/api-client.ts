import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('oasis_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle 401 globally
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('oasis_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
