import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db'
import { agentInsights } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

const INSIGHT_LIMIT = 5

// GET /agent/insights — most recent first; the agent writes these via MCP
router.get('/insights', requireAuth, async (c) => {
  const rows = await getDb(c.env).select().from(agentInsights)
    .where(eq(agentInsights.user_id, c.get('userId')))
    .orderBy(desc(agentInsights.generated_at))
    .limit(INSIGHT_LIMIT)

  return c.json(rows.map(r => ({
    message: r.message,
    generated_at: r.generated_at,
    highlights: JSON.parse(r.highlights),
    gaps: JSON.parse(r.gaps),
  })))
})

export default router
