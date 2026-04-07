import { createMiddleware } from 'hono/factory'
import { createLogger } from '../lib/logger.js'

const httpLog = createLogger('http')

/**
 * Structured HTTP request logger middleware.
 * Replaces hono/logger with a version that feeds into the unified logger pipeline.
 */
export const httpLogger = createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  const durationMs = Date.now() - start

  // routePath is the matched route pattern (e.g. /api/posts/:id); path is the actual URL path
  const route = (c.req as { routePath?: string }).routePath ?? c.req.path

  httpLog.info(`${c.req.method} ${c.req.path} ${c.res.status}`, {
    method: c.req.method,
    path: c.req.path,
    route,
    status: c.res.status,
    durationMs,
  })
})
