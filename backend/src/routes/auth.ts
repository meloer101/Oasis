import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { count, eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, userBalances, refreshTokens, coinTransactions } from '../db/schema.js'
import { checkAndUpdateBadge } from '../lib/badges.js'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../lib/jwt.js'
import { extractConflictField, isUniqueViolation } from '../lib/db-errors.js'
import { rateLimiter } from '../middleware/rate-limit.js'
import { authenticate } from '../middleware/auth.js'

export const authRoutes = new Hono()

/** Welcome bonus on registration (must match user_balances + coin_transactions). */
const WELCOME_BONUS = 100
/** First N registered users get a unique founder_number (profile badge eligibility). */
const MAX_FOUNDERS = 100
/** Serialize founder assignment across concurrent registrations. */
const FOUNDER_REGISTRATION_LOCK = 90210

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed')
    .transform((s) => s.trim().toLowerCase()),
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8).max(100),
  displayName: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .transform((s) => (s === undefined ? undefined : s.trim())),
})

const loginSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string(),
})

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
})

const logoutBodySchema = z.object({
  refreshToken: z.string().min(1),
})

const registerLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many registrations, please try again later',
})

const loginLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many login attempts, please try again later',
})

const refreshLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many refresh attempts, please try again later',
})

const logoutLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many logout attempts, please try again later',
})

function refreshExpiresAt(): Date {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30)
  const ms = Math.max(1, days) * 24 * 60 * 60 * 1000
  return new Date(Date.now() + ms)
}

async function issueSession(
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

// POST /api/auth/register
authRoutes.post(
  '/register',
  registerLimiter,
  zValidator('json', registerSchema),
  async (c) => {
    const { username, email, password, displayName } = c.req.valid('json')

    const resolvedDisplayName =
      displayName && displayName.length > 0 ? displayName : username

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 409)
    }

    const [existingUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (existingUsername) {
      return c.json({ error: 'Username already taken' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    let newUser
    try {
      newUser = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(${FOUNDER_REGISTRATION_LOCK})`)

        const [user] = await tx
          .insert(users)
          .values({
            username,
            email,
            passwordHash,
            displayName: resolvedDisplayName,
          })
          .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            displayName: users.displayName,
            createdAt: users.createdAt,
          })

        const [countRow] = await tx.select({ value: count() }).from(users)
        const userCount = Number(countRow.value)

        if (userCount <= MAX_FOUNDERS) {
          await tx
            .update(users)
            .set({ founderNumber: userCount, updatedAt: new Date() })
            .where(eq(users.id, user.id))
        }

        await tx.insert(userBalances).values({
          userId: user.id,
          balance: WELCOME_BONUS,
          totalEarned: WELCOME_BONUS,
          totalSpent: 0,
        })

        await tx.insert(coinTransactions).values({
          fromUserId: null,
          toUserId: user.id,
          amount: WELCOME_BONUS,
          transactionType: 'system_mint',
          note: '注册欢迎奖励',
        })

        const [finalUser] = await tx
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            displayName: users.displayName,
            founderNumber: users.founderNumber,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1)

        return finalUser
      })
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        const field = extractConflictField(err)
        if (field === 'email') {
          return c.json({ error: 'Email already registered' }, 409)
        }
        if (field === 'username') {
          return c.json({ error: 'Username already taken' }, 409)
        }
        return c.json({ error: 'Account already exists' }, 409)
      }
      throw err
    }

    checkAndUpdateBadge(newUser.id).catch(() => {})

    const { accessToken, refreshToken } = await issueSession(
      newUser.id,
      newUser.username,
      0
    )

    return c.json({ user: newUser, accessToken, refreshToken }, 201)
  }
)

// POST /api/auth/login
authRoutes.post('/login', loginLimiter, zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user || !user.isActive) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const { accessToken, refreshToken } = await issueSession(
    user.id,
    user.username,
    user.tokenVersion
  )

  const { passwordHash: _, tokenVersion: __, ...safeUser } = user
  return c.json({ user: safeUser, accessToken, refreshToken })
})

// POST /api/auth/refresh — rotate refresh token
authRoutes.post(
  '/refresh',
  refreshLimiter,
  zValidator('json', refreshBodySchema),
  async (c) => {
    const { refreshToken: rawRefresh } = c.req.valid('json')
    const tokenHash = hashRefreshToken(rawRefresh)

    try {
      const result = await db.transaction(async (tx) => {
        const [row] = await tx
          .select()
          .from(refreshTokens)
          .where(eq(refreshTokens.tokenHash, tokenHash))
          .limit(1)

        if (!row) {
          return { error: 'invalid' as const }
        }

        if (row.expiresAt.getTime() <= Date.now()) {
          await tx.delete(refreshTokens).where(eq(refreshTokens.id, row.id))
          return { error: 'expired' as const }
        }

        const [u] = await tx
          .select({
            tokenVersion: users.tokenVersion,
            username: users.username,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.id, row.userId))
          .limit(1)

        if (!u || !u.isActive || u.tokenVersion !== row.tokenVersion) {
          await tx.delete(refreshTokens).where(eq(refreshTokens.id, row.id))
          return { error: 'invalid' as const }
        }

        await tx.delete(refreshTokens).where(eq(refreshTokens.id, row.id))

        const accessToken = signAccessToken({
          userId: row.userId,
          username: u.username,
        })
        const { raw: newRaw, hash: newHash } = generateRefreshToken()
        await tx.insert(refreshTokens).values({
          userId: row.userId,
          tokenHash: newHash,
          tokenVersion: u.tokenVersion,
          expiresAt: refreshExpiresAt(),
        })

        return { accessToken, refreshToken: newRaw }
      })

      if ('error' in result && result.error) {
        return c.json({ error: 'Invalid or expired refresh token' }, 401)
      }

      if ('accessToken' in result && 'refreshToken' in result) {
        return c.json({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        })
      }

      return c.json({ error: 'Invalid or expired refresh token' }, 401)
    } catch {
      return c.json({ error: 'Invalid or expired refresh token' }, 401)
    }
  }
)

// POST /api/auth/logout — revoke one refresh session
authRoutes.post(
  '/logout',
  logoutLimiter,
  zValidator('json', logoutBodySchema),
  async (c) => {
    const { refreshToken: rawRefresh } = c.req.valid('json')
    const tokenHash = hashRefreshToken(rawRefresh)
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))
    return c.json({ ok: true })
  }
)

// POST /api/auth/logout-all — revoke all sessions for current user
authRoutes.post('/logout-all', logoutLimiter, authenticate, async (c) => {
  const userId = c.get('userId')

  await db.transaction(async (tx) => {
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
    await tx
      .update(users)
      .set({
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  })

  return c.json({ ok: true })
})
