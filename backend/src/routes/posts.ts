import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, sql, and, or, lt, inArray, ilike, ne } from 'drizzle-orm'
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
  circles,
  circleMembers,
} from '../db/schema.js'
import { authenticate, type AuthVariables } from '../middleware/auth.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { sanitizePostRichHtml } from '../lib/sanitize-post-html.js'

export const postRoutes = new Hono<{ Variables: AuthVariables }>()

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
const createPostSchema = z
  .object({
    title: z.string().min(1).max(300),
    content: z.string().min(1),
    contentType: z.enum(['markdown', 'link', 'image', 'rich']).default('markdown'),
    category: z.enum(['idea', 'tech', 'else']).default('else'),
    circleId: z.string().uuid().optional(),
    linkUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    visibility: z.enum(['public', 'circle_only']).default('public'),
    tags: z.array(z.string().min(1).max(50)).max(5).optional().default([]),
  })
  .refine((d) => d.visibility !== 'circle_only' || Boolean(d.circleId), {
    message: 'circle_only posts require circleId',
    path: ['visibility'],
  })

const feedQuerySchema = z.object({
  feed: z.enum(['hot', 'fresh', 'follow']).default('hot'),
  category: z.enum(['idea', 'tech', 'else']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
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
  category: posts.category,
  linkUrl: posts.linkUrl,
  imageUrl: posts.imageUrl,
  circleId: posts.circleId,
  circleName: circles.name,
  visibility: posts.visibility,
  viewCount: posts.viewCount,
  commentCount: posts.commentCount,
  voterCount: posts.voterCount,
  totalVoteAmount: posts.totalVoteAmount,
  disagreeVoteAmount: posts.disagreeVoteAmount,
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
    return verifyAccessToken(authHeader.slice(7)).userId
  } catch {
    return undefined
  }
}

/** Feed/search: hide circle_only unless viewer is a member of that circle. */
function feedCircleVisibilityPredicate(currentUserId: string | undefined) {
  if (!currentUserId) return ne(posts.visibility, 'circle_only')
  return sql`(${posts.visibility} <> 'circle_only' OR EXISTS (
    SELECT 1 FROM circle_members cm
    WHERE cm.circle_id = ${posts.circleId} AND cm.user_id = ${currentUserId}
  ))`
}

type CircleOnlyMeta = {
  visibility: string
  circleId: string | null
  authorId: string
}

async function userCanViewCircleOnlyPost(meta: CircleOnlyMeta, viewerId: string | undefined): Promise<boolean> {
  if (meta.visibility !== 'circle_only' || !meta.circleId) return true
  if (viewerId && viewerId === meta.authorId) return true
  if (!viewerId) return false
  const [row] = await db
    .select({ userId: circleMembers.userId })
    .from(circleMembers)
    .where(and(eq(circleMembers.circleId, meta.circleId), eq(circleMembers.userId, viewerId)))
    .limit(1)
  return Boolean(row)
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

/** Batch-fetch user vote types for given posts */
async function fetchUserVoteMap(
  userId: string,
  postIds: string[],
): Promise<Map<string, 'agree' | 'disagree'>> {
  if (postIds.length === 0) return new Map()
  const rows = await db
    .select({ postId: votes.postId, voteType: votes.voteType })
    .from(votes)
    .where(and(eq(votes.voterId, userId), inArray(votes.postId, postIds), eq(votes.status, 'active')))
  return new Map(rows.map((r) => [r.postId, r.voteType as 'agree' | 'disagree']))
}

// GET /api/posts — feed with cursor pagination
postRoutes.get('/', zValidator('query', feedQuerySchema), async (c) => {
  const { feed, category, limit, cursor } = c.req.valid('query')
  const fetchLimit = limit + 1

  const currentUserId = tryGetUserId(c.req.header('Authorization'))

  // follow feed requires auth
  if (feed === 'follow' && !currentUserId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items: any[]

  // Hot score with time decay: temperature × 0.98^hours_elapsed
  // This prevents old posts from permanently dominating the hot feed
  const hotScoreExpr = sql<string>`(${posts.temperature}::numeric * POWER(0.98, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600))`

  if (feed === 'hot') {
    const conditions = [eq(posts.status, 'published'), feedCircleVisibilityPredicate(currentUserId)]
    if (category) conditions.push(eq(posts.category, category))
    if (cursor) {
      const { value, id } = decodeCursor(cursor)
      if (value && id) {
        conditions.push(
          or(
            sql`(${posts.temperature}::numeric * POWER(0.98, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600)) < ${value}`,
            and(
              sql`(${posts.temperature}::numeric * POWER(0.98, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600)) = ${value}`,
              lt(posts.id, id)
            )
          )!
        )
      }
    }
    items = await db
      .select({ ...postSelect, hotScore: hotScoreExpr })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .leftJoin(circles, eq(posts.circleId, circles.id))
      .where(and(...conditions))
      .orderBy(
        sql`(${posts.temperature}::numeric * POWER(0.98, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600)) DESC`,
        desc(posts.id),
      )
      .limit(fetchLimit)
  } else if (feed === 'fresh') {
    const conditions = [eq(posts.status, 'published'), feedCircleVisibilityPredicate(currentUserId)]
    if (category) conditions.push(eq(posts.category, category))
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
      .leftJoin(circles, eq(posts.circleId, circles.id))
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
      // Cold start: no follows yet — return hot feed items as fallback
      const fbConditions = [eq(posts.status, 'published'), feedCircleVisibilityPredicate(currentUserId)]
      const hotItems = await db
        .select(postSelect)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .leftJoin(circles, eq(posts.circleId, circles.id))
        .where(and(...fbConditions))
        .orderBy(
          sql`(${posts.temperature}::numeric * POWER(0.98, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600)) DESC`,
          desc(posts.id),
        )
        .limit(limit)

      const fallbackIds = hotItems.map((p) => p.id)
      const [fallbackTagMap, fallbackVoteMap] = await Promise.all([
        fetchTagsForPosts(fallbackIds),
        currentUserId
          ? fetchUserVoteMap(currentUserId, fallbackIds)
          : Promise.resolve(new Map<string, 'agree' | 'disagree'>()),
      ])
      const fallbackEnriched = hotItems.map(({ circleName, ...p }) => ({
        ...p,
        circle: p.circleId && circleName ? { id: p.circleId, name: circleName } : null,
        tags: fallbackTagMap[p.id] ?? [],
        userVoteType: fallbackVoteMap.get(p.id) ?? null,
      }))
      return c.json({ items: fallbackEnriched, nextCursor: null, followFallback: true })
    }

    const followingIds = following.map((f) => f.followingId)
    const conditions = [
      eq(posts.status, 'published'),
      inArray(posts.authorId, followingIds),
      feedCircleVisibilityPredicate(currentUserId),
    ]
    if (category) conditions.push(eq(posts.category, category))
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
      .leftJoin(circles, eq(posts.circleId, circles.id))
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
        ? encodeCursor({ value: last.hotScore ?? last.temperature, id: last.id })
        : encodeCursor({ value: (last.createdAt as Date).toISOString(), id: last.id })
  }

  // Batch-enrich with tags and hasVoted
  const postIds = page.map((p) => p.id)
  const [tagMap, voteMap] = await Promise.all([
    fetchTagsForPosts(postIds),
    currentUserId ? fetchUserVoteMap(currentUserId, postIds) : Promise.resolve(new Map<string, 'agree' | 'disagree'>()),
  ])

  const enriched = page.map(({ circleName, ...p }) => ({
    ...p,
    circle: p.circleId && circleName ? { id: p.circleId, name: circleName } : null,
    tags: tagMap[p.id] ?? [],
    userVoteType: voteMap.get(p.id) ?? null,
  }))

  return c.json({ items: enriched, nextCursor })
})

// GET /api/posts/search?q=...
postRoutes.get('/search', zValidator('query', searchQuerySchema), async (c) => {
  const { q, limit, cursor } = c.req.valid('query')
  const currentUserId = tryGetUserId(c.req.header('Authorization'))
  const fetchLimit = limit + 1
  const pattern = `%${q}%`

  const tagMatchSubquery = db
    .select({ postId: postTags.postId })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(ilike(tags.name, pattern))

  const conditions = [
    eq(posts.status, 'published'),
    feedCircleVisibilityPredicate(currentUserId),
    or(
      ilike(posts.title, pattern),
      ilike(posts.content, pattern),
      inArray(posts.id, tagMatchSubquery)
    )!,
  ]

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

  const items = await db
    .select(postSelect)
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(circles, eq(posts.circleId, circles.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(fetchLimit)

  const hasMore = items.length > limit
  const page = hasMore ? items.slice(0, limit) : items
  let nextCursor: string | null = null
  if (hasMore) {
    const last = page[page.length - 1]
    nextCursor = encodeCursor({ value: (last.createdAt as Date).toISOString(), id: last.id })
  }

  const postIds = page.map((p) => p.id)
  const [tagMap, voteMap] = await Promise.all([
    fetchTagsForPosts(postIds),
    currentUserId ? fetchUserVoteMap(currentUserId, postIds) : Promise.resolve(new Map<string, 'agree' | 'disagree'>()),
  ])

  const enriched = page.map(({ circleName, ...p }) => ({
    ...p,
    circle: p.circleId && circleName ? { id: p.circleId, name: circleName } : null,
    tags: tagMap[p.id] ?? [],
    userVoteType: voteMap.get(p.id) ?? null,
  }))

  return c.json({ items: enriched, nextCursor })
})

// GET /api/posts/:id
postRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const currentUserId = tryGetUserId(c.req.header('Authorization'))

  const [row] = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      contentType: posts.contentType,
      linkUrl: posts.linkUrl,
      imageUrl: posts.imageUrl,
      circleId: posts.circleId,
      visibility: posts.visibility,
      authorId: posts.authorId,
      viewCount: posts.viewCount,
      commentCount: posts.commentCount,
      voterCount: posts.voterCount,
      totalVoteAmount: posts.totalVoteAmount,
      disagreeVoteAmount: posts.disagreeVoteAmount,
      temperature: posts.temperature,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
      gateCircleName: circles.name,
      gateCircleSlug: circles.slug,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(circles, eq(posts.circleId, circles.id))
    .where(and(eq(posts.id, id), eq(posts.status, 'published')))
    .limit(1)

  if (!row) return c.json({ error: 'Post not found' }, 404)

  const canView = await userCanViewCircleOnlyPost(
    {
      visibility: row.visibility,
      circleId: row.circleId,
      authorId: row.authorId,
    },
    currentUserId,
  )
  if (!canView) {
    return c.json(
      {
        error: 'circle_only',
        circle: {
          id: row.circleId!,
          name: row.gateCircleName ?? 'Circle',
          slug: row.gateCircleSlug ?? '',
        },
      },
      403,
    )
  }

  const { authorId: _a, gateCircleName: _gn, gateCircleSlug: _gs, ...post } = row

  // Increment view count (fire-and-forget, non-critical)
  db.update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, id))
    .catch(() => {})

  const [tagMap, voteMap] = await Promise.all([
    fetchTagsForPosts([id]),
    currentUserId ? fetchUserVoteMap(currentUserId, [id]) : Promise.resolve(new Map<string, 'agree' | 'disagree'>()),
  ])

  return c.json({
    ...post,
    tags: tagMap[id] ?? [],
    userVoteType: voteMap.get(id) ?? null,
  })
})

// POST /api/posts — create post
postRoutes.post('/', authenticate, zValidator('json', createPostSchema), async (c) => {
  const userId = c.get('userId')
  const { tags: tagNames, ...postData } = c.req.valid('json')

  const payload =
    postData.contentType === 'rich'
      ? { ...postData, content: sanitizePostRichHtml(postData.content) }
      : postData

  const newPost = await db.transaction(async (tx) => {
    const [post] = await tx
      .insert(posts)
      .values({ authorId: userId, ...payload })
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

    if (payload.circleId) {
      await tx
        .update(circles)
        .set({ postCount: sql`${circles.postCount} + 1` })
        .where(eq(circles.id, payload.circleId))
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
  const currentUserId = tryGetUserId(c.req.header('Authorization'))

  const [post] = await db
    .select({
      id: posts.id,
      visibility: posts.visibility,
      circleId: posts.circleId,
      authorId: posts.authorId,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.status, 'published')))
    .limit(1)

  if (!post) return c.json({ error: 'Post not found' }, 404)

  const canView = await userCanViewCircleOnlyPost(
    { visibility: post.visibility, circleId: post.circleId, authorId: post.authorId },
    currentUserId,
  )
  if (!canView) {
    const [circ] = post.circleId
      ? await db
          .select({ name: circles.name, slug: circles.slug })
          .from(circles)
          .where(eq(circles.id, post.circleId))
          .limit(1)
      : [null]
    return c.json(
      {
        error: 'circle_only',
        circle: {
          id: post.circleId!,
          name: circ?.name ?? 'Circle',
          slug: circ?.slug ?? '',
        },
      },
      403,
    )
  }

  const result = await db
    .select({
      id: comments.id,
      content: comments.content,
      parentId: comments.parentId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      status: comments.status,
      author: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.postId, postId), inArray(comments.status, ['published', 'removed'])))
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
      .select({
        id: posts.id,
        authorId: posts.authorId,
        visibility: posts.visibility,
        circleId: posts.circleId,
      })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.status, 'published')))
      .limit(1)

    if (!post) return c.json({ error: 'Post not found' }, 404)

    const canView = await userCanViewCircleOnlyPost(
      { visibility: post.visibility, circleId: post.circleId, authorId: post.authorId },
      userId,
    )
    if (!canView) {
      const [circ] = post.circleId
        ? await db
            .select({ name: circles.name, slug: circles.slug })
            .from(circles)
            .where(eq(circles.id, post.circleId))
            .limit(1)
        : [null]
      return c.json(
        {
          error: 'circle_only',
          circle: {
            id: post.circleId!,
            name: circ?.name ?? 'Circle',
            slug: circ?.slug ?? '',
          },
        },
        403,
      )
    }

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

      // Notify parent comment author on reply (if different from post author and commenter)
      if (parentId) {
        const [parentComment] = await tx
          .select({ authorId: comments.authorId })
          .from(comments)
          .where(eq(comments.id, parentId))
          .limit(1)

        if (
          parentComment &&
          parentComment.authorId !== userId &&
          parentComment.authorId !== post.authorId
        ) {
          await tx.insert(notifications).values({
            userId: parentComment.authorId,
            type: 'comment_on_post',
            actorId: userId,
            relatedPostId: postId,
            relatedCommentId: comment.id,
            content: '有人回复了你的评论',
          })
        }
      }

      return comment
    })

    return c.json(newComment, 201)
  }
)
