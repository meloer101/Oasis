import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, userBalances } from '../db/schema.js'
import { signToken } from '../lib/jwt.js'

export const authRoutes = new Hono()

const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(100).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

// POST /api/auth/register
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, email, password, displayName } = c.req.valid('json')

  // Check uniqueness
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

  // Create user + balance atomically
  const newUser = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        displayName: displayName ?? username,
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })

    await tx.insert(userBalances).values({
      userId: user.id,
      balance: 100, // welcome bonus
      totalEarned: 100,
      totalSpent: 0,
    })

    return user
  })

  const token = signToken({ userId: newUser.id, username: newUser.username })

  return c.json({ user: newUser, token }, 201)
})

// POST /api/auth/login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
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

  const token = signToken({ userId: user.id, username: user.username })

  const { passwordHash: _, ...safeUser } = user
  return c.json({ user: safeUser, token })
})
