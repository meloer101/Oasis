import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { comments } from '../db/schema.js'
import { authenticate, type AuthVariables } from '../middleware/auth.js'

export const commentRoutes = new Hono<{ Variables: AuthVariables }>()

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

// PATCH /api/comments/:id — edit a comment (author only)
commentRoutes.patch('/:id', authenticate, zValidator('json', updateCommentSchema), async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  try {
    z.string().uuid().parse(id)
  } catch {
    return c.json({ error: 'INVALID_COMMENT_ID' }, 400)
  }

  const { content } = c.req.valid('json')

  const [row] = await db
    .select({ authorId: comments.authorId, status: comments.status })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1)

  if (!row) return c.json({ error: 'COMMENT_NOT_FOUND' }, 404)
  if (row.authorId !== userId) return c.json({ error: 'FORBIDDEN' }, 403)
  if (row.status !== 'published') return c.json({ error: 'COMMENT_NOT_EDITABLE' }, 409)

  const [updated] = await db
    .update(comments)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(comments.id, id), eq(comments.authorId, userId)))
    .returning()

  return c.json(updated)
})

// DELETE /api/comments/:id — remove a comment (author only, soft delete)
commentRoutes.delete('/:id', authenticate, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  try {
    z.string().uuid().parse(id)
  } catch {
    return c.json({ error: 'INVALID_COMMENT_ID' }, 400)
  }

  const [row] = await db
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1)

  if (!row) return c.json({ error: 'COMMENT_NOT_FOUND' }, 404)
  if (row.authorId !== userId) return c.json({ error: 'FORBIDDEN' }, 403)

  await db
    .update(comments)
    .set({ status: 'removed', content: '', updatedAt: new Date() })
    .where(and(eq(comments.id, id), eq(comments.authorId, userId)))

  return c.json({ success: true })
})

