import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { authRoutes } from './routes/auth.js'
import { postRoutes } from './routes/posts.js'
import { voteRoutes } from './routes/votes.js'
import { userRoutes } from './routes/users.js'
import { followRoutes } from './routes/follows.js'
import { walletRoutes } from './routes/wallet.js'
import { circleRoutes } from './routes/circles.js'
import { tagRoutes } from './routes/tag-routes.js'
import { notificationRoutes } from './routes/notifications.js'
import { distributeDailyCoins, scheduleDailyCoins } from './jobs/daily-coins.js'
import { scheduleCleanupRefreshTokens } from './jobs/cleanup-tokens.js'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })
)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/posts', postRoutes)
app.route('/api/votes', voteRoutes)
app.route('/api/users', userRoutes)
app.route('/api/users', followRoutes)
app.route('/api/wallet', walletRoutes)
app.route('/api/circles', circleRoutes)
app.route('/api/tags', tagRoutes)
app.route('/api/notifications', notificationRoutes)

// Protected admin endpoint: manually trigger daily coin distribution
app.post('/api/admin/daily-coins', async (c) => {
  const secret = c.req.header('X-Admin-Secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const result = await distributeDailyCoins()
  return c.json(result)
})

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = Number(process.env.PORT ?? 3001)
console.log(`🚀 Oasis API running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

// Start daily coin distribution scheduler
scheduleDailyCoins()

// Expired refresh token cleanup (daily)
scheduleCleanupRefreshTokens()
