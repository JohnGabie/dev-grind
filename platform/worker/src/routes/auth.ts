import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { users } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const TOKEN_EXPIRE_DAYS = 30

const auth = new Hono<AppEnv>()

async function verifyGoogleToken(credential: string, clientId: string) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
  if (!res.ok) throw new Error('invalid token')
  const info = await res.json() as Record<string, string>
  if (info.aud !== clientId) throw new Error('wrong audience')
  return info
}

async function upsertUser(
  db: ReturnType<typeof getDb>,
  googleId: string,
  email: string,
  name: string,
  avatarUrl: string | null,
) {
  const now = new Date().toISOString()
  const existing = await db.select().from(users).where(eq(users.id, googleId)).limit(1)

  if (existing.length > 0) {
    await db.update(users)
      .set({ last_login: now, name, avatar_url: avatarUrl })
      .where(eq(users.id, googleId))
    return { ...existing[0], last_login: now, name, avatar_url: avatarUrl }
  }

  await db.insert(users).values({ id: googleId, email, name, avatar_url: avatarUrl })
  const [user] = await db.select().from(users).where(eq(users.id, googleId)).limit(1)
  return user
}

async function makeToken(userId: string, secret: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRE_DAYS * 24 * 60 * 60
  return sign({ sub: userId, exp }, secret, 'HS256')
}

function userOut(user: typeof users.$inferSelect) {
  return { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, honor: user.honor }
}

auth.post('/google', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID) return c.json({ detail: 'Google OAuth não configurado' }, 503)

  const { credential } = await c.req.json<{ credential: string }>()

  let info: Record<string, string>
  try {
    info = await verifyGoogleToken(credential, c.env.GOOGLE_CLIENT_ID)
  } catch {
    return c.json({ detail: 'Token inválido' }, 401)
  }

  const email = info.email ?? ''
  const allowed = (c.env.ALLOWED_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (allowed.length > 0 && !allowed.includes(email)) {
    return c.json({ detail: 'Email não autorizado' }, 403)
  }

  const db = getDb(c.env)
  const user = await upsertUser(db, info.sub, email, info.name ?? '', info.picture ?? null)
  const token = await makeToken(user.id, c.env.JWT_SECRET)

  return c.json({ token, user: userOut(user) })
})

auth.post('/dev', async (c) => {
  if (c.env.ENV === 'production') return c.json({ detail: 'Not found' }, 404)
  const db = getDb(c.env)
  const user = await upsertUser(db, 'dev-user-joao', 'joao@devgrind.dev', 'João Gabie', null)
  const token = await makeToken(user.id, c.env.JWT_SECRET)
  return c.json({ token, user: userOut(user) })
})

auth.get('/me', requireAuth, async (c) => {
  const db = getDb(c.env)
  const [user] = await db.select().from(users).where(eq(users.id, c.get('userId'))).limit(1)
  if (!user) return c.json({ detail: 'Usuário não encontrado' }, 401)
  return c.json(userOut(user))
})

export default auth
