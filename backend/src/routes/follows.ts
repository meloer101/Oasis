import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, userFollows, notifications } from '../db/schema.js'
import { authenticate, type AuthVariables } from '../middleware/auth.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('follows')

export const followRoutes = new Hono<{ Variables: AuthVariables }>()

// POST /api/users/:username/follow
followRoutes.post('/:username/follow', authenticate, async (c) => {
  const currentUserId = c.get('userId')
  const username = c.req.param('username')

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!target) return c.json({ error: 'User not found' }, 404)
  if (target.id === currentUserId) return c.json({ error: 'Cannot follow yourself' }, 400)

  const [inserted] = await db
    .insert(userFollows)
    .values({ followerId: currentUserId, followingId: target.id })
    .onConflictDoNothing()
    .returning()

  if (!inserted) return c.json({ error: 'Already following' }, 409)

  // Notify the followed user
  await db.insert(notifications).values({
    userId: target.id,
    type: 'new_follower',
    actorId: currentUserId,
    content: '有人关注了你',
  }).catch((err) => {
    log.error('Failed to insert follow notification', err)
  })

  return c.json({ success: true })
})

// DELETE /api/users/:username/follow
followRoutes.delete('/:username/follow', authenticate, async (c) => {
  const currentUserId = c.get('userId')
  const username = c.req.param('username')

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!target) return c.json({ error: 'User not found' }, 404)

  await db
    .delete(userFollows)
    .where(
      and(eq(userFollows.followerId, currentUserId), eq(userFollows.followingId, target.id))
    )

  return c.json({ success: true })
})

// GET /api/users/:username/followers
followRoutes.get('/:username/followers', async (c) => {
  const username = c.req.param('username')

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!target) return c.json({ error: 'User not found' }, 404)

  const followers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      followedAt: userFollows.createdAt,
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followerId, users.id))
    .where(eq(userFollows.followingId, target.id))

  return c.json(followers)
})

// GET /api/users/:username/following
followRoutes.get('/:username/following', async (c) => {
  const username = c.req.param('username')

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!target) return c.json({ error: 'User not found' }, 404)

  const following = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      followedAt: userFollows.createdAt,
    })
    .from(userFollows)
    .innerJoin(users, eq(userFollows.followingId, users.id))
    .where(eq(userFollows.followerId, target.id))

  return c.json(following)
})
