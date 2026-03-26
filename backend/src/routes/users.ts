import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, userBalances, userBadges } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'

export const userRoutes = new Hono()

// GET /api/users/me — current user profile + balance
userRoutes.get('/me', authenticate, async (c) => {
  const userId = c.get('userId')

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      founderNumber: users.founderNumber,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return c.json({ error: 'User not found' }, 404)

  // Balance is ALWAYS queried from DB — never cached
  const [balance] = await db
    .select()
    .from(userBalances)
    .where(eq(userBalances.userId, userId))
    .limit(1)

  const badges = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.userId, userId))

  return c.json({ ...user, balance, badges })
})

// GET /api/users/:username — public profile
userRoutes.get('/:username', async (c) => {
  const username = c.req.param('username')

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      founderNumber: users.founderNumber,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!user) return c.json({ error: 'User not found' }, 404)

  const badges = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.userId, user.id))

  return c.json({ ...user, badges })
})
