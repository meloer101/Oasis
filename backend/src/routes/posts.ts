import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, sql, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { posts, users, userBalances, coinTransactions } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'

export const postRoutes = new Hono()

const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  contentType: z.enum(['markdown', 'link', 'image']).default('markdown'),
  circleId: z.string().uuid().optional(),
  linkUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  visibility: z.enum(['public', 'circle_only']).default('public'),
})

const feedQuerySchema = z.object({
  feed: z.enum(['hot', 'fresh', 'follow']).default('hot'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(), // ISO timestamp or temperature string for pagination
})

// GET /api/posts — feed
postRoutes.get('/', zValidator('query', feedQuerySchema), async (c) => {
  const { feed, limit, cursor } = c.req.valid('query')

  let query = db
    .select({
      id: posts.id,
      title: posts.title,
      contentType: posts.contentType,
      linkUrl: posts.linkUrl,
      imageUrl: posts.imageUrl,
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
    .where(eq(posts.status, 'published'))
    .limit(limit)

  if (feed === 'hot') {
    return c.json(await query.orderBy(desc(posts.temperature)))
  }

  // fresh = newest first
  return c.json(await query.orderBy(desc(posts.createdAt)))
})

// GET /api/posts/:id
postRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      contentType: posts.contentType,
      linkUrl: posts.linkUrl,
      imageUrl: posts.imageUrl,
      circleId: posts.circleId,
      visibility: posts.visibility,
      viewCount: posts.viewCount,
      commentCount: posts.commentCount,
      voterCount: posts.voterCount,
      totalVoteAmount: posts.totalVoteAmount,
      temperature: posts.temperature,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.id, id), eq(posts.status, 'published')))
    .limit(1)

  if (!post) return c.json({ error: 'Post not found' }, 404)

  // Increment view count (fire-and-forget, non-critical)
  db.update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, id))
    .catch(() => {}) // safe to ignore

  return c.json(post)
})

// POST /api/posts — create post
postRoutes.post('/', authenticate, zValidator('json', createPostSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  const newPost = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({ authorId: userId, ...data })
      .returning()

    // Post creation reward: +5 coins
    await tx
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + 5`,
        totalEarned: sql`${userBalances.totalEarned} + 5`,
        updatedAt: new Date(),
      })
      .where(eq(userBalances.userId, userId))

    await tx.insert(coinTransactions).values({
      fromUserId: null, // system mint
      toUserId: userId,
      amount: 5,
      transactionType: 'post_reward',
      relatedPostId: post.id,
    })

    return post
  })

  return c.json(newPost, 201)
})

// DELETE /api/posts/:id
postRoutes.delete('/:id', authenticate, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)

  if (!post) return c.json({ error: 'Post not found' }, 404)
  if (post.authorId !== userId) return c.json({ error: 'Forbidden' }, 403)

  await db
    .update(posts)
    .set({ status: 'removed', updatedAt: new Date() })
    .where(eq(posts.id, id))

  return c.json({ success: true })
})
