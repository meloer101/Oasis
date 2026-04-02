import { sql, eq, and, gte, lt, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { userBalances, coinTransactions, users } from '../db/schema.js'
import { checkAndUpdateBadge } from '../lib/badges.js'

const DAILY_AMOUNT = 20
/** Stable advisory lock key for daily distribution (arbitrary but fixed). */
const ADVISORY_LOCK_KEY = 902106531

type TxResult =
  | { kind: 'skipped' }
  | { kind: 'empty' }
  | { kind: 'distributed'; activeUsers: { userId: string }[] }

/**
 * Distribute daily coins to all active users.
 * Idempotent: skips if today's distribution has already run.
 * Uses pg_advisory_xact_lock so only one instance runs the payout per UTC day.
 */
export async function distributeDailyCoins(): Promise<{
  usersAffected: number
  totalCoins: number
  skipped?: boolean
}> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const txResult = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`)

    const [existing] = await tx
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
      return { kind: 'skipped' } satisfies TxResult
    }

    const activeUsers = await tx
      .select({ userId: userBalances.userId })
      .from(userBalances)
      .innerJoin(users, eq(userBalances.userId, users.id))
      .where(eq(users.isActive, true))

    if (activeUsers.length === 0) {
      return { kind: 'empty' } satisfies TxResult
    }

    const activeUserIds = activeUsers.map((u) => u.userId)

    await tx
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + ${DAILY_AMOUNT}`,
        totalEarned: sql`${userBalances.totalEarned} + ${DAILY_AMOUNT}`,
        updatedAt: new Date(),
      })
      .where(inArray(userBalances.userId, activeUserIds))

    await tx.insert(coinTransactions).values(
      activeUsers.map(({ userId }) => ({
        fromUserId: null as null,
        toUserId: userId,
        amount: DAILY_AMOUNT,
        transactionType: 'daily_distribution',
        note: `每日签到奖励 ${DAILY_AMOUNT} 枚认同币`,
      }))
    )

    return { kind: 'distributed', activeUsers } satisfies TxResult
  })

  if (txResult.kind === 'skipped') {
    return { usersAffected: 0, totalCoins: 0, skipped: true }
  }
  if (txResult.kind === 'empty') {
    return { usersAffected: 0, totalCoins: 0 }
  }

  for (const { userId } of txResult.activeUsers) {
    checkAndUpdateBadge(userId).catch(() => {})
  }

  return {
    usersAffected: txResult.activeUsers.length,
    totalCoins: txResult.activeUsers.length * DAILY_AMOUNT,
  }
}

/**
 * Schedule daily coin distribution.
 * On startup: runs immediately (idempotent, skips if already done today).
 * Then schedules the next run at UTC midnight, recomputing delay each time.
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

    setTimeout(runAndReschedule, msUntilMidnight())
  }

  distributeDailyCoins()
    .then(({ usersAffected, totalCoins, skipped }) => {
      if (skipped) {
        console.log('[daily-coins] Startup check: already distributed today')
      } else {
        console.log(`[daily-coins] Startup run: distributed ${totalCoins} coins to ${usersAffected} users`)
      }
    })
    .catch((err) => console.error('[daily-coins] Startup run error:', err))

  setTimeout(runAndReschedule, msUntilMidnight())
  console.log(`[daily-coins] Next scheduled distribution in ${Math.round(msUntilMidnight() / 60000)} minutes`)
}
