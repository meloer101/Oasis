import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d'

export interface JWTPayload {
  userId: string
  username: string
}

export function signToken(payload: JWTPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any)
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}
