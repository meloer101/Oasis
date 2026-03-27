import { createMiddleware } from 'hono/factory'

export interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
}

export function rateLimiter(opts: RateLimitOptions) {
  const store = new Map<string, { count: number; resetAt: number }>()

  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of store) {
      if (val.resetAt <= now) store.delete(key)
    }
  }, 60_000)

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown'

    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || entry.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + opts.windowMs })
      await next()
      return
    }

    entry.count++
    if (entry.count > opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json({ error: opts.message ?? 'Too many requests' }, 429)
    }

    await next()
  })
}
