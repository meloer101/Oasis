import { Hono, type Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { GitHub, Google, Apple, generateState, generateCodeVerifier, decodeIdToken } from 'arctic'
import { count, eq } from 'drizzle-orm'
import { randomInt } from 'node:crypto'
import { db } from '../db/index.js'
import { users, userBalances, coinTransactions } from '../db/schema.js'
import { issueSession } from '../lib/session.js'
import { checkAndUpdateBadge } from '../lib/badges.js'
import { rateLimiter } from '../middleware/rate-limit.js'
import { sql } from 'drizzle-orm'

const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '')
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const WELCOME_BONUS = 100
const MAX_FOUNDERS = 100
const FOUNDER_REGISTRATION_LOCK = 90210

function getGitHub(): GitHub {
  return new GitHub(
    process.env.GITHUB_CLIENT_ID!,
    process.env.GITHUB_CLIENT_SECRET!,
    `${BACKEND_URL}/api/auth/oauth/github/callback`
  )
}

function getGoogle(): Google {
  return new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${BACKEND_URL}/api/auth/oauth/google/callback`
  )
}

function getApple(): Apple {
  const pem = (process.env.APPLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  const privateKeyBytes = new TextEncoder().encode(pem)
  return new Apple(
    process.env.APPLE_CLIENT_ID!,
    process.env.APPLE_TEAM_ID!,
    process.env.APPLE_KEY_ID!,
    privateKeyBytes,
    `${BACKEND_URL}/api/auth/oauth/apple/callback`
  )
}

interface OAuthProfile {
  providerId: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 10,
  path: '/',
}

export const oauthRoutes = new Hono()

const oauthInitLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many OAuth attempts, please try again later',
})

// ─── Initiate OAuth flow ───────────────────────────────────────────────────

oauthRoutes.get('/github', oauthInitLimiter, async (c) => {
  const state = generateState()
  setCookie(c, 'oauth_state', state, COOKIE_OPTS)
  const url = getGitHub().createAuthorizationURL(state, ['user:email'])
  return c.redirect(url.toString())
})

oauthRoutes.get('/google', oauthInitLimiter, async (c) => {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  setCookie(c, 'oauth_state', state, COOKIE_OPTS)
  setCookie(c, 'oauth_code_verifier', codeVerifier, COOKIE_OPTS)
  const url = getGoogle().createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email'])
  return c.redirect(url.toString())
})

oauthRoutes.get('/apple', oauthInitLimiter, async (c) => {
  const state = generateState()
  setCookie(c, 'oauth_state', state, COOKIE_OPTS)
  const url = getApple().createAuthorizationURL(state, ['name', 'email'])
  return c.redirect(url.toString())
})

// ─── GitHub callback ───────────────────────────────────────────────────────

oauthRoutes.get('/github/callback', async (c) => {
  const storedState = getCookie(c, 'oauth_state')
  const { state, code } = c.req.query()
  deleteCookie(c, 'oauth_state')

  if (!storedState || storedState !== state || !code) {
    return c.redirect(`${FRONTEND_URL}/login?error=oauth_state_mismatch`)
  }

  let profile: OAuthProfile
  try {
    const tokens = await getGitHub().validateAuthorizationCode(code)
    const ghUser = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
        'User-Agent': 'Oasis',
      },
    }).then((r) => r.json() as Promise<Record<string, unknown>>)

    let email = typeof ghUser.email === 'string' ? ghUser.email : null
    if (!email) {
      const emails = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          'User-Agent': 'Oasis',
        },
      }).then((r) => r.json() as Promise<Array<{ email: string; primary: boolean; verified: boolean }>>)
      email = emails.find((e) => e.primary && e.verified)?.email ?? null
    }

    profile = {
      providerId: String(ghUser.id),
      email: email?.toLowerCase() ?? null,
      displayName: typeof ghUser.name === 'string' ? ghUser.name : (typeof ghUser.login === 'string' ? ghUser.login : null),
      avatarUrl: typeof ghUser.avatar_url === 'string' ? ghUser.avatar_url : null,
    }
  } catch {
    return c.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }

  return finishOAuth(c, 'github', profile)
})

// ─── Google callback ───────────────────────────────────────────────────────

oauthRoutes.get('/google/callback', async (c) => {
  const storedState = getCookie(c, 'oauth_state')
  const storedVerifier = getCookie(c, 'oauth_code_verifier') ?? ''
  const { state, code } = c.req.query()
  deleteCookie(c, 'oauth_state')
  deleteCookie(c, 'oauth_code_verifier')

  if (!storedState || storedState !== state || !code) {
    return c.redirect(`${FRONTEND_URL}/login?error=oauth_state_mismatch`)
  }

  let profile: OAuthProfile
  try {
    const tokens = await getGoogle().validateAuthorizationCode(code, storedVerifier)
    const claims = decodeIdToken(tokens.idToken()) as Record<string, unknown>
    profile = {
      providerId: String(claims.sub),
      email: typeof claims.email === 'string' ? claims.email.toLowerCase() : null,
      displayName: typeof claims.name === 'string' ? claims.name : null,
      avatarUrl: typeof claims.picture === 'string' ? claims.picture : null,
    }
  } catch {
    return c.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }

  return finishOAuth(c, 'google', profile)
})

// ─── Apple callback (POST, response_mode=form_post) ────────────────────────

oauthRoutes.post('/apple/callback', async (c) => {
  const storedState = getCookie(c, 'oauth_state')
  deleteCookie(c, 'oauth_state')

  const body = await c.req.parseBody()
  const code = typeof body['code'] === 'string' ? body['code'] : null
  const state = typeof body['state'] === 'string' ? body['state'] : null
  const userJson = typeof body['user'] === 'string' ? body['user'] : null

  if (!storedState || storedState !== state || !code) {
    return c.redirect(`${FRONTEND_URL}/login?error=oauth_state_mismatch`)
  }

  let profile: OAuthProfile
  try {
    const tokens = await getApple().validateAuthorizationCode(code)
    const claims = decodeIdToken(tokens.idToken()) as Record<string, unknown>

    let displayName: string | null = null
    if (userJson) {
      try {
        const userData = JSON.parse(userJson) as Record<string, unknown>
        const nameObj = userData.name as Record<string, string> | undefined
        const first = nameObj?.firstName ?? ''
        const last = nameObj?.lastName ?? ''
        const full = `${first} ${last}`.trim()
        if (full) displayName = full
      } catch {
        // ignore parse error
      }
    }

    profile = {
      providerId: String(claims.sub),
      email: typeof claims.email === 'string' ? claims.email.toLowerCase() : null,
      displayName,
      avatarUrl: null,
    }
  } catch {
    return c.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }

  return finishOAuth(c, 'apple', profile)
})

// ─── Shared: find or create user, issue session, redirect ─────────────────

type Provider = 'github' | 'google' | 'apple'

async function finishOAuth(c: Context, provider: Provider, profile: OAuthProfile) {
  try {
    const user = await findOrCreateOAuthUser(provider, profile)
    const { accessToken, refreshToken } = await issueSession(user.id, user.username, user.tokenVersion)
    const params = new URLSearchParams({ accessToken, refreshToken })
    return c.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`)
  } catch {
    return c.redirect(`${FRONTEND_URL}/login?error=oauth_failed`)
  }
}

async function findOrCreateOAuthUser(provider: Provider, profile: OAuthProfile) {
  const providerCol = provider === 'github' ? users.githubId
    : provider === 'google' ? users.googleId
    : users.appleId

  return await db.transaction(async (tx) => {
    // 1. Look up by provider ID (most common path)
    const [byProvider] = await tx
      .select()
      .from(users)
      .where(eq(providerCol, profile.providerId))
      .limit(1)
    if (byProvider) return byProvider

    // 2. Email conflict → auto-bind to existing account
    if (profile.email) {
      const isAppleRelay = profile.email.endsWith('@privaterelay.appleid.com')
      if (!isAppleRelay) {
        const [byEmail] = await tx
          .select()
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1)
        if (byEmail) {
          await tx
            .update(users)
            .set({
              ...(provider === 'github' ? { githubId: profile.providerId }
                : provider === 'google' ? { googleId: profile.providerId }
                : { appleId: profile.providerId }),
              updatedAt: new Date(),
            })
            .where(eq(users.id, byEmail.id))
          return { ...byEmail, ...(provider === 'github' ? { githubId: profile.providerId } : provider === 'google' ? { googleId: profile.providerId } : { appleId: profile.providerId }) }
        }
      }
    }

    // 3. New user — create account
    const username = await generateUniqueUsername(tx, profile)
    const displayName = profile.displayName ?? username

    await tx.execute(sql`select pg_advisory_xact_lock(${FOUNDER_REGISTRATION_LOCK})`)

    const providerField = provider === 'github' ? { githubId: profile.providerId }
      : provider === 'google' ? { googleId: profile.providerId }
      : { appleId: profile.providerId }

    const [newUser] = await tx
      .insert(users)
      .values({
        username,
        email: profile.email,
        passwordHash: null,
        displayName,
        avatarUrl: profile.avatarUrl,
        ...providerField,
      })
      .returning()

    const [countRow] = await tx.select({ value: count() }).from(users)
    if (Number(countRow.value) <= MAX_FOUNDERS) {
      await tx
        .update(users)
        .set({ founderNumber: Number(countRow.value), updatedAt: new Date() })
        .where(eq(users.id, newUser.id))
    }

    await tx.insert(userBalances).values({
      userId: newUser.id,
      balance: WELCOME_BONUS,
      totalEarned: WELCOME_BONUS,
      totalSpent: 0,
    })
    await tx.insert(coinTransactions).values({
      fromUserId: null,
      toUserId: newUser.id,
      amount: WELCOME_BONUS,
      transactionType: 'system_mint',
      note: '注册欢迎奖励',
    })

    checkAndUpdateBadge(newUser.id).catch(() => {})
    return newUser
  })
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function generateUniqueUsername(tx: Tx, profile: OAuthProfile): Promise<string> {
  const candidates: string[] = []

  if (profile.displayName) {
    const cleaned = profile.displayName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30)
    if (cleaned.length >= 3) candidates.push(cleaned)
  }

  if (profile.email && !profile.email.endsWith('@privaterelay.appleid.com')) {
    const prefix = profile.email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 30)
    if (prefix.length >= 3) candidates.push(prefix)
  }

  for (const base of candidates) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const name = attempt === 0 ? base : `${base}_${randomInt(1000, 9999)}`
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, name))
        .limit(1)
      if (!existing) return name
    }
  }

  // Fallback: user + 8 random digits
  while (true) {
    const name = `user${randomInt(10000000, 99999999)}`
    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, name))
      .limit(1)
    if (!existing) return name
  }
}
