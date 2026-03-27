import { db } from '../db/index.js'
import { userBalances, userBadges, users } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'

export type BadgeType = 'newcomer' | 'resonator' | 'vibe_master' | 'founder'

export const BADGE_THRESHOLDS: { type: BadgeType; threshold: number }[] = [
  { type: 'vibe_master', threshold: 2000 },
  { type: 'resonator', threshold: 500 },
  { type: 'newcomer', threshold: 100 },
]

export function getBadgeFromBalance(balance: number, isFounder = false): BadgeType | null {
  if (isFounder && balance >= 5000) return 'founder'
  if (balance >= 2000) return 'vibe_master'
  if (balance >= 500) return 'resonator'
  if (balance >= 100) return 'newcomer'
  return null
}

export function getNextBadgeThreshold(balance: number): number | null {
  if (balance < 100) return 100
  if (balance < 500) return 500
  if (balance < 2000) return 2000
  if (balance < 5000) return 5000
  return null
}

/**
 * Check a user's current balance and upsert badge records accordingly.
 * Safe to call fire-and-forget.
 */
export async function checkAndUpdateBadge(userId: string): Promise<void> {
  const [row] = await db
    .select({ balance: userBalances.balance, founderNumber: users.founderNumber })
    .from(userBalances)
    .innerJoin(users, eq(userBalances.userId, users.id))
    .where(eq(userBalances.userId, userId))
    .limit(1)

  if (!row) return

  const balance = row.balance
  const isFounder = row.founderNumber !== null

  const allThresholds: { type: BadgeType; threshold: number }[] = [
    ...BADGE_THRESHOLDS,
    ...(isFounder ? [{ type: 'founder' as BadgeType, threshold: 5000 }] : []),
  ]

  for (const { type, threshold } of allThresholds) {
    const shouldBeActive = balance >= threshold

    const [existing] = await db
      .select({ id: userBadges.id, isActive: userBadges.isActive })
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeType, type)))
      .limit(1)

    if (existing) {
      if (existing.isActive !== shouldBeActive) {
        await db
          .update(userBadges)
          .set({
            isActive: shouldBeActive,
            revokedAt: shouldBeActive ? null : new Date(),
          })
          .where(eq(userBadges.id, existing.id))
      }
    } else if (shouldBeActive) {
      await db.insert(userBadges).values({ userId, badgeType: type, isActive: true })
    }
  }
}
