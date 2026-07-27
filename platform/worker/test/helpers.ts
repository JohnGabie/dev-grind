import { env } from 'cloudflare:test'
import { sign } from 'hono/jwt'
import app from '../src/index'

export const USER_ID = 'test-user'

export async function jwtFor(userId = USER_ID): Promise<string> {
  return await sign({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 }, env.JWT_SECRET, 'HS256')
}

/** Request against the real app with a Bearer JWT already attached. */
export async function authed(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, ...rest } = init
  const headers = new Headers(rest.headers)
  headers.set('Authorization', `Bearer ${token ?? await jwtFor()}`)
  if (rest.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return app.fetch(new Request(`http://test${path}`, { ...rest, headers }), env)
}

export const anon = (path: string, init: RequestInit = {}) =>
  app.fetch(new Request(`http://test${path}`, init), env)

export function json(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
}

export async function seedUser(id = USER_ID, email = `${id}@test.dev`) {
  await env.DB.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
    .bind(id, email, 'Test User').run()
}

export async function seedExercise(opts: Partial<{
  id: string; slug: string; difficulty: string; concepts: string[]
}> = {}) {
  const id = opts.id ?? crypto.randomUUID()
  const slug = opts.slug ?? `ex-${id.slice(0, 8)}`
  await env.DB.prepare(`
    INSERT INTO exercises (id, title, slug, difficulty, phase, module, tags, description,
                           rationale, stub, solution, hints, concepts)
    VALUES (?, ?, ?, ?, 1, 'test', '["t"]', 'desc', 'why', 'def f(): pass', 'sol', '[]', ?)
  `).bind(id, `Ex ${slug}`, slug, opts.difficulty ?? '8kyu', JSON.stringify(opts.concepts ?? [])).run()
  return { id, slug }
}

/** Creates a personal token and returns the raw value for MCP calls. */
export async function personalToken(userId = USER_ID): Promise<string> {
  const res = await authed('/auth/tokens', { ...json({ name: 'test' }), token: await jwtFor(userId) })
  return (await res.json<{ token: string }>()).token
}

export async function mcp(token: string, method: string, params: unknown = {}) {
  const res = await anon('/mcp', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return { status: res.status, body: await res.json<any>() }
}

/** tools/call returns the payload JSON-encoded inside content[0].text. */
export async function callTool(token: string, name: string, args: unknown = {}) {
  const { body } = await mcp(token, 'tools/call', { name, arguments: args })
  return JSON.parse(body.result.content[0].text)
}
