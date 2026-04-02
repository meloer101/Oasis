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
 * Next run at 00:30 UTC (after daily-coins at midnight UTC).
 */
function msUntilNextRun(): number {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(0, 30, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return next.getTime() - now.getTime()
}

/**
 * Run cleanup on a UTC-aligned schedule (same idea as daily-coins).
 */
export function scheduleCleanupRefreshTokens(): void {
  function runAndReschedule() {
    cleanupExpiredRefreshTokens()
      .then(({ deleted }) => {
        if (deleted > 0) {
          console.log(`[cleanup-tokens] Removed ${deleted} expired refresh token(s)`)
        }
      })
      .catch((err) => console.error('[cleanup-tokens] Error:', err))

    setTimeout(runAndReschedule, msUntilNextRun())
  }

  const firstDelay = msUntilNextRun()
  setTimeout(runAndReschedule, firstDelay)
  console.log(
    `[cleanup-tokens] Next expired-token cleanup (00:30 UTC) in ${Math.round(firstDelay / 60000)} minutes`
  )
}
