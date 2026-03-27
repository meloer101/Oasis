import { lt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { refreshTokens } from '../db/schema.js'

/**
 * Remove expired refresh token rows (DB hygiene).
 */
export async function cleanupExpiredRefreshTokens(): Promise<{ deleted: number }> {
  const result = await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, new Date()))
    .returning({ id: refreshTokens.id })

  return { deleted: result.length }
}

/**
 * Run cleanup once per day after server start (aligned with daily-coins pattern).
 */
export function scheduleCleanupRefreshTokens(): void {
  function msUntilNextRun(): number {
    const now = new Date()
    const next = new Date(now)
    next.setHours(24, 30, 0, 0) // 00:30 UTC daily, offset from midnight coins job
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1)
    }
    return next.getTime() - now.getTime()
  }

  function runAndReschedule() {
    cleanupExpiredRefreshTokens()
      .then(({ deleted }) => {
        if (deleted > 0) {
          console.log(`[cleanup-tokens] Removed ${deleted} expired refresh token(s)`)
        }
      })
      .catch((err) => console.error('[cleanup-tokens] Error:', err))

    setTimeout(runAndReschedule, 24 * 60 * 60 * 1000)
  }

  const firstDelay = msUntilNextRun()
  setTimeout(runAndReschedule, firstDelay)
  console.log(
    `[cleanup-tokens] Next expired-token cleanup in ${Math.round(firstDelay / 60000)} minutes`
  )
}
