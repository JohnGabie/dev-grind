import type { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { AppEnv } from '../types'

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ detail: 'Token ausente' }, 401)
  }
  try {
    const payload = await verify(auth.slice(7), c.env.JWT_SECRET, 'HS256')
    c.set('userId', payload.sub as string)
  } catch (e) {
    console.error('JWT verify error:', e)
    return c.json({ detail: 'Token inválido ou expirado' }, 401)
  }
  await next()
}
