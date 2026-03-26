import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { userBalances, votes, coinTransactions, posts, users } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'

export const voteRoutes = new Hono()

const castVoteSchema = z.object({
  postId: z.string().uuid(),
  amount: z.number().int().min(1).max(10000),
})

// POST /api/votes — cast a vote (spend coins on a post)
voteRoutes.post('/', authenticate, zValidator('json', castVoteSchema), async (c) => {
  const userId = c.get('userId')
  const { postId, amount } = c.req.valid('json')

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Lock voter's balance row (FOR UPDATE prevents concurrent votes)
      const [voterBalance] = await tx
        .select()
        .from(userBalances)
        .where(eq(userBalances.userId, userId))
        .for('update')

      if (!voterBalance || voterBalance.balance < amount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      // 2. Get post author (ensure post exists and voter is not the author)
      const [post] = await tx
        .select({ id: posts.id, authorId: posts.authorId })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1)

      if (!post) throw new Error('POST_NOT_FOUND')
      if (post.authorId === userId) throw new Error('CANNOT_VOTE_OWN_POST')

      // 3. Check for duplicate vote
      const [existingVote] = await tx
        .select({ id: votes.id })
        .from(votes)
        .where(eq(votes.voterId, userId))
        .limit(1)

      if (existingVote) throw new Error('ALREADY_VOTED')

      // 4. Calculate split: 80% to author, 20% burned
      const authorAmount = Math.floor(amount * 0.8)
      const burnAmount = amount - authorAmount

      // 5. Deduct from voter
      await tx
        .update(userBalances)
        .set({
          balance: sql`${userBalances.balance} - ${amount}`,
          totalSpent: sql`${userBalances.totalSpent} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, userId))

      // 6. Add to author (80%)
      await tx
        .update(userBalances)
        .set({
          balance: sql`${userBalances.balance} + ${authorAmount}`,
          totalEarned: sql`${userBalances.totalEarned} + ${authorAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, post.authorId))

      // 7. Record the vote
      const [vote] = await tx
        .insert(votes)
        .values({ voterId: userId, postId, amount })
        .returning()

      // 8. Immutable audit log — two entries
      await tx.insert(coinTransactions).values([
        {
          fromUserId: userId,
          toUserId: post.authorId,
          amount: authorAmount,
          transactionType: 'vote_received',
          relatedPostId: postId,
          relatedVoteId: vote.id,
        },
        {
          fromUserId: userId,
          toUserId: null, // burned
          amount: burnAmount,
          transactionType: 'transaction_fee_burned',
          relatedPostId: postId,
          relatedVoteId: vote.id,
        },
      ])

      // 9. Update post stats
      await tx
        .update(posts)
        .set({
          voterCount: sql`${posts.voterCount} + 1`,
          totalVoteAmount: sql`${posts.totalVoteAmount} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId))

      return { vote, authorAmount, burnAmount }
    })

    return c.json({
      success: true,
      voteId: result.vote.id,
      authorReceived: result.authorAmount,
      burned: result.burnAmount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR'

    const statusMap: Record<string, number> = {
      INSUFFICIENT_BALANCE: 402,
      POST_NOT_FOUND: 404,
      CANNOT_VOTE_OWN_POST: 403,
      ALREADY_VOTED: 409,
    }

    return c.json({ error: message }, (statusMap[message] ?? 500) as 402 | 403 | 404 | 409 | 500)
  }
})
