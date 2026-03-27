import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET!

export interface JWTPayload {
  userId: string
  username: string
}

/** Short-lived access JWT (default 15m, not configurable via env for security clarity). */
export function signAccessToken(payload: JWTPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' } as any)
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

/** Opaque refresh token: return raw for client, hash for DB storage. */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url')
  return { raw, hash: hashRefreshToken(raw) }
}
