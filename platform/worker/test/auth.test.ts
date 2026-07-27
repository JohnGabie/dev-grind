import { env } from 'cloudflare:test'
import { describe, expect, it, beforeEach } from 'vitest'
import { sign } from 'hono/jwt'
import { anon, authed, json, resetDb, seedUser } from './helpers'

describe('auth', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('serves a health check without auth', async () => {
    const res = await anon('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', api: 'DevGrind' })
  })

  it('creates the dev user and returns a usable token', async () => {
    const res = await anon('/auth/dev', { method: 'POST' })
    expect(res.status).toBe(200)

    const { token, user } = await res.json<any>()
    expect(user.id).toBe('dev-user-joao')

    const me = await authed('/auth/me', { token })
    expect(me.status).toBe(200)
    expect((await me.json<any>()).id).toBe('dev-user-joao')
  })

  it('rejects requests with no token', async () => {
    expect((await anon('/exercises')).status).toBe(401)
  })

  it('rejects a token signed with the wrong secret', async () => {
    const forged = await sign({ sub: 'attacker', exp: Math.floor(Date.now() / 1000) + 60 }, 'wrong-secret', 'HS256')
    expect((await authed('/exercises', { token: forged })).status).toBe(401)
  })

  it('rejects an expired token', async () => {
    const expired = await sign({ sub: 'someone', exp: Math.floor(Date.now() / 1000) - 60 }, env.JWT_SECRET, 'HS256')
    expect((await authed('/exercises', { token: expired })).status).toBe(401)
  })

  it('blocks dev login when ENV is production', async () => {
    const prodEnv = { ...env, ENV: 'production' }
    const { default: app } = await import('../src/index')
    const res = await app.fetch(new Request('http://test/auth/dev', { method: 'POST' }), prodEnv as any)
    expect(res.status).toBe(404)
  })

  it('rejects a Google login when no client id is configured', async () => {
    await seedUser()
    const res = await anon('/auth/google', json({ credential: 'whatever' }))
    expect(res.status).toBe(503)
  })
})
