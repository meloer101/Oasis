import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  circles,
  circleMembers,
  posts,
  users,
  userBalances,
  coinTransactions,
} from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { checkAndUpdateBadge } from '../lib/badges.js'

export const circleRoutes = new Hono()

const createCircleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private', 'invite_only']).default('public'),
  joinFee: z.number().int().min(0).default(0),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 100)
}

// GET /api/circles — list circles (paginated)
circleRoutes.get('/', async (c) => {
  const list = await db
    .select({
      id: circles.id,
      name: circles.name,
      slug: circles.slug,
      description: circles.description,
      avatarUrl: circles.avatarUrl,
      visibility: circles.visibility,
      joinFee: circles.joinFee,
      memberCount: circles.memberCount,
      postCount: circles.postCount,
      createdAt: circles.createdAt,
      creator: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(circles)
    .innerJoin(users, eq(circles.creatorId, users.id))
    .orderBy(desc(circles.memberCount))
    .limit(20)

  return c.json(list)
})

// POST /api/circles — create circle
circleRoutes.post('/', authenticate, zValidator('json', createCircleSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  const slug = slugify(data.name)

  const result = await db.transaction(async (tx) => {
    const [circle] = await tx
      .insert(circles)
      .values({ ...data, slug, creatorId: userId, memberCount: 1 })
      .returning()

    // Creator auto-joins as 'creator'
    await tx.insert(circleMembers).values({
      circleId: circle.id,
      userId,
      role: 'creator',
    })

    return circle
  })

  return c.json(result, 201)
})

// GET /api/circles/:id — circle detail
circleRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  let currentUserId: string | undefined
  try {
    const authHeader = c.req.header('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      currentUserId = verifyAccessToken(authHeader.slice(7)).userId
    }
  } catch {}

  const [circle] = await db
    .select({
      id: circles.id,
      name: circles.name,
      slug: circles.slug,
      description: circles.description,
      avatarUrl: circles.avatarUrl,
      visibility: circles.visibility,
      joinFee: circles.joinFee,
      memberCount: circles.memberCount,
      postCount: circles.postCount,
      createdAt: circles.createdAt,
      creator: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(circles)
    .innerJoin(users, eq(circles.creatorId, users.id))
    .where(eq(circles.id, id))
    .limit(1)

  if (!circle) return c.json({ error: 'Circle not found' }, 404)

  let isMember = false
  let memberRole: string | null = null
  if (currentUserId) {
    const [member] = await db
      .select({ role: circleMembers.role })
      .from(circleMembers)
      .where(and(eq(circleMembers.circleId, id), eq(circleMembers.userId, currentUserId)))
      .limit(1)
    if (member) {
      isMember = true
      memberRole = member.role
    }
  }

  return c.json({ ...circle, isMember, memberRole })
})

// GET /api/circles/:id/posts — posts in this circle
circleRoutes.get('/:id/posts', async (c) => {
  const id = c.req.param('id')

  const [circle] = await db.select({ id: circles.id }).from(circles).where(eq(circles.id, id)).limit(1)
  if (!circle) return c.json({ error: 'Circle not found' }, 404)

  const circlePosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      contentType: posts.contentType,
      linkUrl: posts.linkUrl,
      viewCount: posts.viewCount,
      commentCount: posts.commentCount,
      voterCount: posts.voterCount,
      totalVoteAmount: posts.totalVoteAmount,
      temperature: posts.temperature,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.circleId, id), eq(posts.status, 'published')))
    .orderBy(desc(posts.temperature), desc(posts.createdAt))
    .limit(20)

  return c.json(circlePosts)
})

// POST /api/circles/:id/join — join circle
circleRoutes.post('/:id/join', authenticate, async (c) => {
  const circleId = c.req.param('id')
  const userId = c.get('userId')

  const [circle] = await db
    .select({ id: circles.id, joinFee: circles.joinFee, creatorId: circles.creatorId })
    .from(circles)
    .where(eq(circles.id, circleId))
    .limit(1)

  if (!circle) return c.json({ error: 'Circle not found' }, 404)

  const [existing] = await db
    .select({ role: circleMembers.role })
    .from(circleMembers)
    .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)))
    .limit(1)

  if (existing) return c.json({ error: 'Already a member' }, 409)

  if (circle.joinFee > 0) {
    await db.transaction(async (tx) => {
      const [balance] = await tx
        .select({ balance: userBalances.balance })
        .from(userBalances)
        .where(eq(userBalances.userId, userId))
        .for('update')

      if (!balance || balance.balance < circle.joinFee) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      await tx
        .update(userBalances)
        .set({
          balance: sql`${userBalances.balance} - ${circle.joinFee}`,
          totalSpent: sql`${userBalances.totalSpent} + ${circle.joinFee}`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, userId))

      await tx.insert(coinTransactions).values({
        fromUserId: userId,
        toUserId: circle.creatorId,
        amount: circle.joinFee,
        transactionType: 'circle_join_fee',
        relatedCircleId: circleId,
      })

      await tx.insert(circleMembers).values({ circleId, userId, role: 'member' })
      await tx
        .update(circles)
        .set({ memberCount: sql`${circles.memberCount} + 1` })
        .where(eq(circles.id, circleId))
    })
    // Fire-and-forget: check if join fee triggered a badge downgrade
    checkAndUpdateBadge(userId).catch(() => {})
  } else {
    await db.insert(circleMembers).values({ circleId, userId, role: 'member' })
    await db
      .update(circles)
      .set({ memberCount: sql`${circles.memberCount} + 1` })
      .where(eq(circles.id, circleId))
  }

  return c.json({ success: true, costCoins: circle.joinFee })
})

// DELETE /api/circles/:id/join — leave circle
circleRoutes.delete('/:id/join', authenticate, async (c) => {
  const circleId = c.req.param('id')
  const userId = c.get('userId')

  const [member] = await db
    .select({ role: circleMembers.role })
    .from(circleMembers)
    .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)))
    .limit(1)

  if (!member) return c.json({ error: 'Not a member' }, 404)
  if (member.role === 'creator') return c.json({ error: 'Creator cannot leave their own circle' }, 403)

  await db
    .delete(circleMembers)
    .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)))

  await db
    .update(circles)
    .set({ memberCount: sql`${circles.memberCount} - 1` })
    .where(eq(circles.id, circleId))

  return c.json({ success: true })
})
