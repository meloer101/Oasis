import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, and, count, sum } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, userBalances, userBadges, userFollows, posts } from '../db/schema.js'
import { authenticate, type AuthVariables } from '../middleware/auth.js'
import { verifyAccessToken } from '../lib/jwt.js'

export const userRoutes = new Hono<{ Variables: AuthVariables }>()

const updateProfileSchema = z.object({
  displayName: z.union([z.string().min(1).max(100), z.null()]).optional(),
  bio: z.union([z.string().max(500), z.null()]).optional(),
  avatarUrl: z.union([z.string().url(), z.null()]).optional(),
})

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

  const badges = await db.select().from(userBadges).where(eq(userBadges.userId, userId))

  return c.json({ ...user, balance, badges })
})

// PATCH /api/users/me — update own profile
userRoutes.patch('/me', authenticate, zValidator('json', updateProfileSchema), async (c) => {
  const userId = c.get('userId')
  const raw = c.req.valid('json')
  const data: Record<string, string | null> = {}
  if (raw.displayName !== undefined) data.displayName = raw.displayName
  if (raw.bio !== undefined) data.bio = raw.bio
  if (raw.avatarUrl !== undefined) data.avatarUrl = raw.avatarUrl

  if (Object.keys(data).length === 0) {
    return c.json({ error: 'No fields to update' }, 400)
  }

  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      updatedAt: users.updatedAt,
    })

  return c.json(updated)
})

// GET /api/users/:username — public profile
userRoutes.get('/:username', async (c) => {
  const username = c.req.param('username')

  // Optional auth: detect current user if logged in
  let currentUserId: string | null = null
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyAccessToken(authHeader.slice(7))
      currentUserId = payload.userId
    }
  } catch {}

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

  const badges = await db.select().from(userBadges).where(eq(userBadges.userId, user.id))

  let isFollowing = false
  if (currentUserId && currentUserId !== user.id) {
    const [f] = await db
      .select()
      .from(userFollows)
      .where(and(eq(userFollows.followerId, currentUserId), eq(userFollows.followingId, user.id)))
      .limit(1)
    isFollowing = !!f
  }

  const [followerRow] = await db
    .select({ value: count() })
    .from(userFollows)
    .where(eq(userFollows.followingId, user.id))

  const [followingRow] = await db
    .select({ value: count() })
    .from(userFollows)
    .where(eq(userFollows.followerId, user.id))

  const [postStatsRow] = await db
    .select({ postCount: count(), totalReceived: sum(posts.totalVoteAmount) })
    .from(posts)
    .where(and(eq(posts.authorId, user.id), eq(posts.status, 'published')))

  return c.json({
    ...user,
    badges,
    isFollowing,
    followerCount: followerRow?.value ?? 0,
    followingCount: followingRow?.value ?? 0,
    postCount: postStatsRow?.postCount ?? 0,
    totalReceived: Number(postStatsRow?.totalReceived ?? 0),
  })
})

// GET /api/users/:username/posts — user's published posts
userRoutes.get('/:username/posts', async (c) => {
  const username = c.req.param('username')

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!user) return c.json({ error: 'User not found' }, 404)

  const userPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      contentType: posts.contentType,
      imageUrl: posts.imageUrl,
      viewCount: posts.viewCount,
      commentCount: posts.commentCount,
      voterCount: posts.voterCount,
      totalVoteAmount: posts.totalVoteAmount,
      disagreeVoteAmount: posts.disagreeVoteAmount,
      temperature: posts.temperature,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(eq(posts.authorId, user.id), eq(posts.status, 'published')))
    .orderBy(desc(posts.createdAt))
    .limit(20)

  return c.json(userPosts)
})
