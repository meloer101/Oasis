import { db } from '../db/index.js'
import { refreshTokens } from '../db/schema.js'
import { signAccessToken, generateRefreshToken } from './jwt.js'

function refreshExpiresAt(): Date {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30)
  const ms = Math.max(1, days) * 24 * 60 * 60 * 1000
  return new Date(Date.now() + ms)
}

export async function issueSession(
  userId: string,
  username: string,
  tokenVersion: number
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({ userId, username })
  const { raw, hash } = generateRefreshToken()
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hash,
    tokenVersion,
    expiresAt: refreshExpiresAt(),
  })
  return { accessToken, refreshToken: raw }
}
