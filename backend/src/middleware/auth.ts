import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/jwt.js'

type AuthVariables = {
  userId: string
  username: string
}

export const authenticate = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const authorization = c.req.header('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authorization.slice(7)
    try {
      const payload = verifyToken(token)
      c.set('userId', payload.userId)
      c.set('username', payload.username)
      await next()
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }
  }
)
