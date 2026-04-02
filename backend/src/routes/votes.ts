import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, sql, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { userBalances, votes, coinTransactions, posts, notifications } from '../db/schema.js'
import { authenticate, type AuthVariables } from '../middleware/auth.js'
import { checkAndUpdateBadge } from '../lib/badges.js'

export const voteRoutes = new Hono<{ Variables: AuthVariables }>()

const castVoteSchema = z.object({
  postId: z.string().uuid(),
  amount: z.number().int().min(1).max(10000),
  voteType: z.enum(['agree', 'disagree']).default('agree'),
})

// POST /api/votes — cast a vote (spend coins on a post)
voteRoutes.post('/', authenticate, zValidator('json', castVoteSchema), async (c) => {
  const userId = c.get('userId')
  const { postId, amount, voteType } = c.req.valid('json')

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

      // 3. Check for duplicate vote — per post
      const [existingVote] = await tx
        .select({ id: votes.id })
        .from(votes)
        .where(and(eq(votes.voterId, userId), eq(votes.postId, postId)))
        .limit(1)

      if (existingVote) throw new Error('ALREADY_VOTED')

      // 4. Deduct from voter (both agree and disagree cost coins)
      await tx
        .update(userBalances)
        .set({
          balance: sql`${userBalances.balance} - ${amount}`,
          totalSpent: sql`${userBalances.totalSpent} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, userId))

      // 5. Record the vote with voteType
      const [vote] = await tx
        .insert(votes)
        .values({ voterId: userId, postId, amount, voteType })
        .returning()

      const AUTHOR_EARN_CAP = 200

      let authorAmount = 0

      if (voteType === 'agree') {
        // Check how much the author has already earned from this post (cap enforcement)
        const [earnedRow] = await tx
          .select({ earned: sql<string>`COALESCE(SUM(${coinTransactions.amount}), 0)` })
          .from(coinTransactions)
          .where(
            and(
              eq(coinTransactions.toUserId, post.authorId),
              eq(coinTransactions.relatedPostId, postId),
              eq(coinTransactions.transactionType, 'vote_received'),
            )
          )

        const alreadyEarned = Number(earnedRow?.earned ?? 0)
        const remainingCap = Math.max(0, AUTHOR_EARN_CAP - alreadyEarned)

        // Agree: 80% to author (capped), remainder burned
        authorAmount = Math.min(Math.floor(amount * 0.8), remainingCap)
        const burnAmount = amount - authorAmount

        if (authorAmount > 0) {
          await tx
            .update(userBalances)
            .set({
              balance: sql`${userBalances.balance} + ${authorAmount}`,
              totalEarned: sql`${userBalances.totalEarned} + ${authorAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(userBalances.userId, post.authorId))

          await tx.insert(coinTransactions).values({
            fromUserId: userId,
            toUserId: post.authorId,
            amount: authorAmount,
            transactionType: 'vote_received',
            relatedPostId: postId,
            relatedVoteId: vote.id,
          })

          // Notify author only while cap is not reached
          await tx.insert(notifications).values({
            userId: post.authorId,
            type: 'vote_received',
            actorId: userId,
            relatedPostId: postId,
            content: `有人给你的帖子投了 ${amount} 枚认同币`,
          })
        }

        // Record burn (may be 20% standard fee, or more if cap was hit)
        await tx.insert(coinTransactions).values({
          fromUserId: userId,
          toUserId: null, // burned
          amount: burnAmount,
          transactionType: 'transaction_fee_burned',
          relatedPostId: postId,
          relatedVoteId: vote.id,
        })

        // Update post stats: agree path
        // temperature = (totalVoteAmount + amount - disagreeVoteAmount) / GREATEST(viewCount, 1) * 1000
        await tx
          .update(posts)
          .set({
            voterCount: sql`${posts.voterCount} + 1`,
            totalVoteAmount: sql`${posts.totalVoteAmount} + ${amount}`,
            temperature: sql`((${posts.totalVoteAmount} + ${amount} - ${posts.disagreeVoteAmount})::numeric / GREATEST(${posts.viewCount}::numeric, 1)) * 1000`,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId))
      } else {
        // Disagree: 100% burned, no author reward
        await tx.insert(coinTransactions).values({
          fromUserId: userId,
          toUserId: null, // burned
          amount,
          transactionType: 'disagree_burned',
          relatedPostId: postId,
          relatedVoteId: vote.id,
        })

        // Update post stats: disagree path
        // temperature = (totalVoteAmount - (disagreeVoteAmount + amount)) / GREATEST(viewCount, 1) * 1000
        await tx
          .update(posts)
          .set({
            voterCount: sql`${posts.voterCount} + 1`,
            disagreeVoteAmount: sql`${posts.disagreeVoteAmount} + ${amount}`,
            temperature: sql`((${posts.totalVoteAmount} - (${posts.disagreeVoteAmount} + ${amount}))::numeric / GREATEST(${posts.viewCount}::numeric, 1)) * 1000`,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId))
      }

      return { vote, authorAmount, burnAmount: amount - authorAmount }
    })

    // Fire-and-forget: check if voter's balance drop triggered a badge downgrade
    checkAndUpdateBadge(userId).catch(() => {})

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
