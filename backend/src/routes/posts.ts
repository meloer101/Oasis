import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, sql, and, or, lt, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import {
  posts,
  users,
  userBalances,
  coinTransactions,
  comments,
  userFollows,
  votes,
  tags,
  postTags,
  notifications,
} from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'
import { verifyToken } from '../lib/jwt.js'

export const postRoutes = new Hono()

// --- Cursor helpers ---
function encodeCursor(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

function decodeCursor(cursor: string): { value: string; id: string } {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'))
  } catch {
    return { value: '', id: '' }
  }
}

// --- Schemas ---
const createPostSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  contentType: z.enum(['markdown', 'link', 'image']).default('markdown'),
  circleId: z.string().uuid().optional(),
  linkUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  visibility: z.enum(['public', 'circle_only']).default('public'),
  tags: z.array(z.string().min(1).max(50)).max(5).optional().default([]),
})

const feedQuerySchema = z.object({
  feed: z.enum(['hot', 'fresh', 'follow']).default('hot'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
})

// Shared select shape for feed items
const postSelect = {
  id: posts.id,
  title: posts.title,
  content: posts.content,
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
}

/** Try to extract current user from optional Bearer header */
function tryGetUserId(authHeader: string | undefined): string | undefined {
  if (!authHeader?.startsWith('Bearer ')) return undefined
  try {
    return verifyToken(authHeader.slice(7)).userId
  } catch {
    return undefined
  }
}

/** Batch-fetch tags for a list of post IDs */
async function fetchTagsForPosts(postIds: string[]): Promise<Record<string, string[]>> {
  if (postIds.length === 0) return {}
  const rows = await db
    .select({ postId: postTags.postId, tagName: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, postIds))
  const map: Record<string, string[]> = {}
  for (const { postId, tagName } of rows) {
    if (!map[postId]) map[postId] = []
    map[postId].push(tagName)
  }
  return map
}

/** Batch-fetch which posts the user has voted on */
async function fetchVotedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set()
  const rows = await db
    .select({ postId: votes.postId })
    .from(votes)
    .where(and(eq(votes.voterId, userId), inArray(votes.postId, postIds)))
  return new Set(rows.map((r) => r.postId))
}

// GET /api/posts — feed with cursor pagination
postRoutes.get('/', zValidator('query', feedQuerySchema), async (c) => {
  const { feed, limit, cursor } = c.req.valid('query')
  const fetchLimit = limit + 1

  const currentUserId = tryGetUserId(c.req.header('Authorization'))

  // follow feed requires auth
  if (feed === 'follow' && !currentUserId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items: any[]

  if (feed === 'hot') {
    const conditions = [eq(posts.status, 'published')]
    if (cursor) {
      const { value, id } = decodeCursor(cursor)
      if (value && id) {
        conditions.push(
          or(
            lt(posts.temperature, value),
            and(eq(posts.temperature, value), lt(posts.id, id))
          )!
        )
      }
    }
    items = await db
      .select(postSelect)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.temperature), desc(posts.id))
      .limit(fetchLimit)
  } else if (feed === 'fresh') {
    const conditions = [eq(posts.status, 'published')]
    if (cursor) {
      const { value, id } = decodeCursor(cursor)
      if (value && id) {
        const cursorDate = new Date(value)
        conditions.push(
          or(
            lt(posts.createdAt, cursorDate),
            and(eq(posts.createdAt, cursorDate), lt(posts.id, id))
          )!
        )
      }
    }
    items = await db
      .select(postSelect)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(fetchLimit)
  } else {
    // follow feed
    const following = await db
      .select({ followingId: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, currentUserId!))

    if (following.length === 0) {
      return c.json({ items: [], nextCursor: null })
    }

    const followingIds = following.map((f) => f.followingId)
    const conditions = [eq(posts.status, 'published'), inArray(posts.authorId, followingIds)]
    if (cursor) {
      const { value, id } = decodeCursor(cursor)
      if (value && id) {
        const cursorDate = new Date(value)
        conditions.push(
          or(
            lt(posts.createdAt, cursorDate),
            and(eq(posts.createdAt, cursorDate), lt(posts.id, id))
          )!
        )
      }
    }
    items = await db
      .select(postSelect)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(fetchLimit)
  }

  const hasMore = items.length > limit
  const page = hasMore ? items.slice(0, limit) : items
  let nextCursor: string | null = null
  if (hasMore) {
    const last = page[page.length - 1]
    nextCursor =
      feed === 'hot'
        ? encodeCursor({ value: last.temperature, id: last.id })
        : encodeCursor({ value: (last.createdAt as Date).toISOString(), id: last.id })
  }

  // Batch-enrich with tags and hasVoted
  const postIds = page.map((p) => p.id)
  const [tagMap, votedIds] = await Promise.all([
    fetchTagsForPosts(postIds),
    currentUserId ? fetchVotedPostIds(currentUserId, postIds) : Promise.resolve(new Set<string>()),
  ])

  const enriched = page.map((p) => ({
    ...p,
    tags: tagMap[p.id] ?? [],
    hasVoted: votedIds.has(p.id),
  }))

  return c.json({ items: enriched, nextCursor })
})

// GET /api/posts/:id
postRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const currentUserId = tryGetUserId(c.req.header('Authorization'))

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
    .catch(() => {})

  const [tagMap, votedIds] = await Promise.all([
    fetchTagsForPosts([id]),
    currentUserId ? fetchVotedPostIds(currentUserId, [id]) : Promise.resolve(new Set<string>()),
  ])

  return c.json({
    ...post,
    tags: tagMap[id] ?? [],
    hasVoted: votedIds.has(id),
  })
})

// POST /api/posts — create post
postRoutes.post('/', authenticate, zValidator('json', createPostSchema), async (c) => {
  const userId = c.get('userId')
  const { tags: tagNames, ...postData } = c.req.valid('json')

  const newPost = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({ authorId: userId, ...postData })
      .returning()

    // Handle tags: upsert each tag and link to post
    for (const name of tagNames) {
      const normalized = name.toLowerCase().trim().replace(/\s+/g, '-')
      const [tag] = await tx
        .insert(tags)
        .values({ name: normalized })
        .onConflictDoUpdate({
          target: tags.name,
          set: { postCount: sql`${tags.postCount} + 1` },
        })
        .returning({ id: tags.id })
      await tx.insert(postTags).values({ postId: post.id, tagId: tag.id })
    }

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
      fromUserId: null,
      toUserId: userId,
      amount: 5,
      transactionType: 'post_reward',
      relatedPostId: post.id,
    })

    return post
  })

  return c.json({ ...newPost, tags: tagNames }, 201)
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

// GET /api/posts/:id/comments
postRoutes.get('/:id/comments', async (c) => {
  const postId = c.req.param('id')

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, 'published')))
    .limit(1)

  if (!post) return c.json({ error: 'Post not found' }, 404)

  const result = await db
    .select({
      id: comments.id,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.postId, postId), eq(comments.status, 'published')))
    .orderBy(comments.createdAt)

  return c.json(result)
})

// POST /api/posts/:id/comments
postRoutes.post(
  '/:id/comments',
  authenticate,
  zValidator('json', createCommentSchema),
  async (c) => {
    const postId = c.req.param('id')
    const userId = c.get('userId')
    const { content, parentId } = c.req.valid('json')

    const [post] = await db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.status, 'published')))
      .limit(1)

    if (!post) return c.json({ error: 'Post not found' }, 404)

    if (parentId) {
      const [parent] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(and(eq(comments.id, parentId), eq(comments.postId, postId)))
        .limit(1)
      if (!parent) return c.json({ error: 'Parent comment not found' }, 404)
    }

    const newComment = await db.transaction(async (tx) => {
      const [comment] = await tx
        .insert(comments)
        .values({ postId, authorId: userId, content, parentId })
        .returning()

      // Comment reward: +2 coins
      await tx
        .update(userBalances)
        .set({
          balance: sql`${userBalances.balance} + 2`,
          totalEarned: sql`${userBalances.totalEarned} + 2`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, userId))

      await tx.insert(coinTransactions).values({
        fromUserId: null,
        toUserId: userId,
        amount: 2,
        transactionType: 'comment_reward',
        relatedPostId: postId,
        relatedCommentId: comment.id,
      })

      await tx
        .update(posts)
        .set({ commentCount: sql`${posts.commentCount} + 1` })
        .where(eq(posts.id, postId))

      // Notify post author if they're not the commenter
      if (post.authorId !== userId) {
        await tx.insert(notifications).values({
          userId: post.authorId,
          type: 'comment_on_post',
          actorId: userId,
          relatedPostId: postId,
          relatedCommentId: comment.id,
          content: '有人评论了你的帖子',
        })
      }

      return comment
    })

    return c.json(newComment, 201)
  }
)
