import { lt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { refreshTokens } from '../db/schema.js'
import { createLogger } from '../lib/logger.js'

const log = createLogger('cleanup-tokens')

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
          log.info('Removed expired refresh tokens', { deleted })
        }
      })
      .catch((err) => log.error('Cleanup error', err))

    setTimeout(runAndReschedule, msUntilNextRun())
  }

  const firstDelay = msUntilNextRun()
  setTimeout(runAndReschedule, firstDelay)
  log.info('Next cleanup scheduled', { inMinutes: Math.round(firstDelay / 60000) })
}
