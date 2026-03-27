import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, desc, or } from 'drizzle-orm'
import { db } from '../db/index.js'
import { userBalances, userBadges, coinTransactions } from '../db/schema.js'
import { authenticate } from '../middleware/auth.js'
import { getBadgeFromBalance, getNextBadgeThreshold } from '../lib/badges.js'

export const walletRoutes = new Hono()

// GET /api/wallet — current user's wallet summary
walletRoutes.get('/', authenticate, async (c) => {
  const userId = c.get('userId')

  const [balance] = await db
    .select()
    .from(userBalances)
    .where(eq(userBalances.userId, userId))
    .limit(1)

  if (!balance) return c.json({ error: 'Balance not found' }, 404)

  const activeBadges = await db
    .select({ badgeType: userBadges.badgeType })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))

  const currentBalance = balance.balance
  const currentBadge = getBadgeFromBalance(currentBalance)
  const nextBadgeThreshold = getNextBadgeThreshold(currentBalance)

  return c.json({
    balance: currentBalance,
    totalEarned: balance.totalEarned,
    totalSpent: balance.totalSpent,
    currentBadge,
    nextBadgeThreshold,
    badges: activeBadges.map((b) => b.badgeType),
  })
})

const txQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /api/wallet/transactions — paginated transaction history
walletRoutes.get(
  '/transactions',
  authenticate,
  zValidator('query', txQuerySchema),
  async (c) => {
    const userId = c.get('userId')
    const { limit, offset } = c.req.valid('query')

    const txs = await db
      .select({
        id: coinTransactions.id,
        amount: coinTransactions.amount,
        transactionType: coinTransactions.transactionType,
        fromUserId: coinTransactions.fromUserId,
        toUserId: coinTransactions.toUserId,
        relatedPostId: coinTransactions.relatedPostId,
        note: coinTransactions.note,
        createdAt: coinTransactions.createdAt,
      })
      .from(coinTransactions)
      .where(
        or(
          eq(coinTransactions.toUserId, userId),
          eq(coinTransactions.fromUserId, userId)
        )
      )
      .orderBy(desc(coinTransactions.createdAt))
      .limit(limit)
      .offset(offset)

    const result = txs.map((tx) => ({
      ...tx,
      isCredit: tx.toUserId === userId,
      displayAmount: tx.toUserId === userId ? tx.amount : -tx.amount,
    }))

    return c.json(result)
  }
)
