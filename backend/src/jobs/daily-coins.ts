import { sql, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { userBalances, coinTransactions, users } from '../db/schema.js'
import { checkAndUpdateBadge } from '../lib/badges.js'

const DAILY_AMOUNT = 20

/**
 * Distribute daily coins to all active users.
 * Called once per day at midnight.
 */
export async function distributeDailyCoins(): Promise<{
  usersAffected: number
  totalCoins: number
}> {
  // Get all active users with balance accounts
  const activeUsers = await db
    .select({ userId: userBalances.userId })
    .from(userBalances)
    .innerJoin(users, eq(userBalances.userId, users.id))
    .where(eq(users.isActive, true))

  if (activeUsers.length === 0) return { usersAffected: 0, totalCoins: 0 }

  await db.transaction(async (tx) => {
    // Bulk update all balances
    await tx
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + ${DAILY_AMOUNT}`,
        totalEarned: sql`${userBalances.totalEarned} + ${DAILY_AMOUNT}`,
        updatedAt: new Date(),
      })

    // Insert transaction records for all users
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
 * Call this once at server startup.
 */
export function scheduleDailyCoins(): void {
  function msUntilMidnight(): number {
    const now = new Date()
    const next = new Date(now)
    next.setHours(24, 0, 0, 0)
    return next.getTime() - now.getTime()
  }

  function runAndReschedule() {
    distributeDailyCoins()
      .then(({ usersAffected, totalCoins }) => {
        console.log(`[daily-coins] Distributed ${totalCoins} coins to ${usersAffected} users`)
      })
      .catch((err) => console.error('[daily-coins] Error:', err))

    // Schedule next run in exactly 24h
    setTimeout(runAndReschedule, 24 * 60 * 60 * 1000)
  }

  setTimeout(runAndReschedule, msUntilMidnight())
  console.log(`[daily-coins] Next distribution in ${Math.round(msUntilMidnight() / 60000)} minutes`)
}
