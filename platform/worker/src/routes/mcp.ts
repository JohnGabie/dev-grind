/**
 * MCP server — Streamable HTTP transport (2024-11-05 spec).
 * Each POST to /mcp carries one JSON-RPC message; auth via Bearer personal token.
 */
import { Hono, type Context } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { personalTokens } from '../db/schema'
import { TOOLS, dispatch, type ToolCtx } from '../lib/tools'
import { sha256Hex } from './tokens'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

const ok = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result })
const err = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } })

async function authenticate(c: Context<AppEnv>): Promise<string | null> {
  const header = c.req.header('Authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) return null

  const db = getDb(c.env)
  const hash = await sha256Hex(header.slice(7))
  const [token] = await db.select().from(personalTokens)
    .where(eq(personalTokens.token_hash, hash)).limit(1)
  if (!token) return null

  await db.update(personalTokens)
    .set({ last_used_at: new Date().toISOString() })
    .where(eq(personalTokens.id, token.id))

  return token.user_id
}

router.post('/', async (c) => {
  const userId = await authenticate(c)
  if (!userId) {
    return c.json(err(null, -32001, 'Unauthorized — provide a valid personal access token'), 401)
  }

  const body = await c.req.json<unknown>().catch(() => null)
  if (!body) return c.json(err(null, -32700, 'Parse error'), 400)

  const ctx: ToolCtx = { db: getDb(c.env), env: c.env, userId }
  const messages = Array.isArray(body) ? body : [body]
  const responses: unknown[] = []

  for (const msg of messages as Record<string, any>[]) {
    const id = msg.id
    const method = String(msg.method ?? '')
    const params = msg.params ?? {}

    switch (method) {
      case 'initialize':
        responses.push(ok(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'devgrind', version: '1.0.0' },
        }))
        break

      case 'notifications/initialized':
      case 'notifications/cancelled':
        break // notifications have no response

      case 'ping':
        responses.push(ok(id, {}))
        break

      case 'tools/list':
        responses.push(ok(id, {
          tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
        }))
        break

      case 'tools/call': {
        const result = await dispatch(String(params.name ?? ''), params.arguments ?? {}, ctx)
        responses.push(ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }))
        break
      }

      default:
        if (id !== undefined && id !== null) {
          responses.push(err(id, -32601, `Method not found: ${method}`))
        }
    }
  }

  if (!responses.length) return c.body(null, 204)
  return c.json(responses.length === 1 ? responses[0] : responses)
})

export default router
