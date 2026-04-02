import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { notifications, users } from '../db/schema.js'
import { authenticate, type AuthVariables } from '../middleware/auth.js'

export const notificationRoutes = new Hono<{ Variables: AuthVariables }>()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /api/notifications — list for current user
notificationRoutes.get('/', authenticate, zValidator('query', listQuerySchema), async (c) => {
  const userId = c.get('userId')
  const { limit, offset } = c.req.valid('query')

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      content: notifications.content,
      isRead: notifications.isRead,
      relatedPostId: notifications.relatedPostId,
      relatedCommentId: notifications.relatedCommentId,
      relatedCircleId: notifications.relatedCircleId,
      createdAt: notifications.createdAt,
      actor: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset)

  // Count unread
  const unreadCount = rows.filter((r) => !r.isRead).length

  return c.json({ notifications: rows, unreadCount })
})

// POST /api/notifications/read-all — mark all as read
notificationRoutes.post('/read-all', authenticate, async (c) => {
  const userId = c.get('userId')

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

  return c.json({ success: true })
})
