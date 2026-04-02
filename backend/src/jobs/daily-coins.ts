import { sql, eq, and, gte, lt, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { userBalances, coinTransactions, users } from '../db/schema.js'
import { checkAndUpdateBadge } from '../lib/badges.js'

const DAILY_AMOUNT = 20

/**
 * Distribute daily coins to all active users.
 * Idempotent: skips if today's distribution has already run.
 * Called once per day at midnight, and once on server startup (to catch missed runs).
 */
export async function distributeDailyCoins(): Promise<{
  usersAffected: number
  totalCoins: number
  skipped?: boolean
}> {
  // Idempotency check: skip if we already distributed today (UTC)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const [existing] = await db
    .select({ id: coinTransactions.id })
    .from(coinTransactions)
    .where(
      and(
        eq(coinTransactions.transactionType, 'daily_distribution'),
        gte(coinTransactions.createdAt, todayStart),
        lt(coinTransactions.createdAt, todayEnd),
      )
    )
    .limit(1)

  if (existing) {
    console.log('[daily-coins] Already distributed today, skipping')
    return { usersAffected: 0, totalCoins: 0, skipped: true }
  }

  // Get all active users with balance accounts
  const activeUsers = await db
    .select({ userId: userBalances.userId })
    .from(userBalances)
    .innerJoin(users, eq(userBalances.userId, users.id))
    .where(eq(users.isActive, true))

  if (activeUsers.length === 0) return { usersAffected: 0, totalCoins: 0 }

  const activeUserIds = activeUsers.map((u) => u.userId)

  await db.transaction(async (tx) => {
    // Bulk update only active users' balances
    await tx
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + ${DAILY_AMOUNT}`,
        totalEarned: sql`${userBalances.totalEarned} + ${DAILY_AMOUNT}`,
        updatedAt: new Date(),
      })
      .where(inArray(userBalances.userId, activeUserIds))

    // Insert transaction records for all active users
    await tx.insert(coinTransactions).values(
      activeUsers.map(({ userId }) => ({
        fromUserId: null as null,
        toUserId: userId,
        amount: DAILY_AMOUNT,
        transactionType: 'daily_distribution',
        note: `每日签到奖励 ${DAILY_AMOUNT} 枚认同币`,
      }))
    )
  })

  // Update badges for all users (fire-and-forget)
  for (const { userId } of activeUsers) {
    checkAndUpdateBadge(userId).catch(() => {})
  }

  return { usersAffected: activeUsers.length, totalCoins: activeUsers.length * DAILY_AMOUNT }
}

/**
 * Schedule daily coin distribution.
 * On startup: runs immediately (idempotent, skips if already done today).
 * Then schedules the next run at midnight, repeating every 24h.
 */
export function scheduleDailyCoins(): void {
  function msUntilMidnight(): number {
    const now = new Date()
    const next = new Date(now)
    next.setUTCHours(24, 0, 0, 0)
    return next.getTime() - now.getTime()
  }

  function runAndReschedule() {
    distributeDailyCoins()
      .then(({ usersAffected, totalCoins, skipped }) => {
        if (skipped) return
        console.log(`[daily-coins] Distributed ${totalCoins} coins to ${usersAffected} users`)
      })
      .catch((err) => console.error('[daily-coins] Error:', err))

    // Schedule next run at next UTC midnight
    setTimeout(runAndReschedule, msUntilMidnight())
  }

  // Run immediately on startup (idempotent — skips if today's already done)
  distributeDailyCoins()
    .then(({ usersAffected, totalCoins, skipped }) => {
      if (skipped) {
        console.log('[daily-coins] Startup check: already distributed today')
      } else {
        console.log(`[daily-coins] Startup run: distributed ${totalCoins} coins to ${usersAffected} users`)
      }
    })
    .catch((err) => console.error('[daily-coins] Startup run error:', err))

  // Schedule nightly runs
  setTimeout(runAndReschedule, msUntilMidnight())
  console.log(`[daily-coins] Next scheduled distribution in ${Math.round(msUntilMidnight() / 60000)} minutes`)
}
