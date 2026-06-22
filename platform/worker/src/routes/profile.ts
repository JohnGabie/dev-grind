import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { userProfiles } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

router.get('/me', requireAuth, async (c) => {
  const db = getDb(c.env)
  const [profile] = await db.select().from(userProfiles)
    .where(eq(userProfiles.user_id, c.get('userId'))).limit(1)

  if (!profile) return c.json({ baseline_done: false })

  return c.json({
    id: profile.id,
    baseline_done: Boolean(profile.baseline_done),
    strengths: JSON.parse(profile.strengths as string ?? '[]'),
    gaps: JSON.parse(profile.gaps as string ?? '[]'),
    level: JSON.parse(profile.level as string ?? '{}'),
    style: JSON.parse(profile.style as string ?? '{}'),
    notes: JSON.parse(profile.notes as string ?? '[]'),
    recommendations: JSON.parse(profile.recommendations as string ?? '[]'),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  })
})

export default router
