import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { getDb } from '../db'
import { courses } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

router.get('/', requireAuth, async (c) => {
  const db = getDb(c.env)
  const rows = await db.select().from(courses)
    .where(eq(courses.user_id, c.get('userId')))
    .orderBy(desc(courses.created_at))

  return c.json(rows.map(c => ({
    id: c.id,
    title: c.title,
    book_slug: c.book_slug,
    description: c.description,
    modules: JSON.parse(c.modules as string ?? '[]'),
    is_complete: Boolean(c.is_complete),
    created_at: c.created_at,
  })))
})

export default router
