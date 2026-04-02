import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'

let cachedJwtSecret: string | null = null

function getJwtSecret(): string {
  if (cachedJwtSecret !== null) return cachedJwtSecret
  const s = process.env.JWT_SECRET
  if (typeof s !== 'string' || s.trim() === '') {
    throw new Error('JWT_SECRET is required')
  }
  cachedJwtSecret = s
  return cachedJwtSecret
}

/** Call after dotenv loads so misconfiguration fails fast at process start. */
export function assertJwtSecretConfigured(): void {
  getJwtSecret()
}

export interface JWTPayload {
  userId: string
  username: string
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

/** Short-lived access JWT (default 15m, not configurable via env for security clarity). */
export function signAccessToken(payload: JWTPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '15m' } as any)
}

export function verifyAccessToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, getJwtSecret())
  if (typeof decoded === 'string' || decoded === null || typeof decoded !== 'object') {
    throw new Error('Invalid token payload')
  }
  const rec = decoded as Record<string, unknown>
  const userId = rec.userId
  const username = rec.username
  if (!isNonEmptyString(userId) || !isNonEmptyString(username)) {
    throw new Error('Invalid token payload')
  }
  return { userId, username }
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

/** Opaque refresh token: return raw for client, hash for DB storage. */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url')
  return { raw, hash: hashRefreshToken(raw) }
}
