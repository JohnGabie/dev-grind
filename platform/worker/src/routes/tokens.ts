import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../db'
import { personalTokens, users } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { honorToRank } from '../lib/rank'
import { TOOLS } from '../lib/tools'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// POST /auth/tokens — the raw token is shown once, only the hash is stored
router.post('/', requireAuth, async (c) => {
  const body = await c.req.json<{ name?: string }>().catch(() => ({ name: undefined }))
  const raw = randomToken()
  const id = crypto.randomUUID()
  const created_at = new Date().toISOString()

  await getDb(c.env).insert(personalTokens).values({
    id,
    user_id: c.get('userId'),
    token_hash: await sha256Hex(raw),
    name: body.name || 'Claude Code',
    created_at,
  })

  return c.json({ id, name: body.name || 'Claude Code', created_at, token: raw })
})

router.get('/', requireAuth, async (c) => {
  const rows = await getDb(c.env).select().from(personalTokens)
    .where(eq(personalTokens.user_id, c.get('userId')))

  return c.json(rows.map(t => ({
    id: t.id, name: t.name, created_at: t.created_at, last_used_at: t.last_used_at,
  })))
})

// Instructions the user pastes into their model's config. Tool list is derived
// from the registry so it can never drift from what /mcp actually serves.
router.get('/claude-md', requireAuth, async (c) => {
  const db = getDb(c.env)
  const [user] = await db.select().from(users).where(eq(users.id, c.get('userId'))).limit(1)
  const toolList = TOOLS.map(t => `- \`${t.name}\` — ${t.description.split('.')[0]}`).join('\n')

  return c.text(`# DevGrind — Kata Development via MCP

You are connected to ${user?.name ?? 'the user'}'s DevGrind.

## On session start
Call \`get_context()\` to read the current learning state.

## Available tools
${toolList}

## How to solve a kata
1. Call \`get_exercise(slug)\` to read the problem and test cases
2. Write a Python solution
3. Run the tests locally against the test cases
4. Call \`submit_solution\` with code + test results
5. Show the result to the user

## Rules
- NEVER submit without explicit user confirmation
- Always run tests before submitting
- Show test results (pass/fail per case) before asking to submit
- Do not modify platform exercises
- Only access this user's data (enforced by auth token)

## User context
- Name: ${user?.name ?? '—'}
- Current rank: ${honorToRank(user?.honor ?? 0)}
- Honor: ${user?.honor ?? 0}
`)
})

router.delete('/:token_id', requireAuth, async (c) => {
  const db = getDb(c.env)
  const token_id = c.req.param('token_id') ?? ''

  const [found] = await db.select({ id: personalTokens.id }).from(personalTokens)
    .where(and(eq(personalTokens.id, token_id), eq(personalTokens.user_id, c.get('userId'))))
    .limit(1)
  if (!found) return c.json({ detail: 'Token not found' }, 404)

  await db.delete(personalTokens).where(eq(personalTokens.id, token_id))
  return c.body(null, 204)
})

export default router
