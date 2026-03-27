import { Hono } from 'hono'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { tags, postTags, posts, users } from '../db/schema.js'

export const tagRoutes = new Hono()

// GET /api/tags — list popular tags
tagRoutes.get('/', async (c) => {
  const list = await db
    .select({
      id: tags.id,
      name: tags.name,
      postCount: tags.postCount,
    })
    .from(tags)
    .orderBy(desc(tags.postCount))
    .limit(30)

  return c.json(list)
})

// GET /api/tags/:name — tag detail + posts
tagRoutes.get('/:name', async (c) => {
  const name = c.req.param('name').toLowerCase()

  const [tag] = await db
    .select()
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1)

  if (!tag) return c.json({ error: 'Tag not found' }, 404)

  // Get post IDs for this tag
  const taggedPostIds = await db
    .select({ postId: postTags.postId })
    .from(postTags)
    .where(eq(postTags.tagId, tag.id))

  if (taggedPostIds.length === 0) {
    return c.json({ tag, posts: [] })
  }

  const ids = taggedPostIds.map((r) => r.postId)

  const tagPosts = await db
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
    .where(and(inArray(posts.id, ids), eq(posts.status, 'published')))
    .orderBy(desc(posts.temperature), desc(posts.createdAt))
    .limit(20)

  return c.json({ tag, posts: tagPosts })
})
