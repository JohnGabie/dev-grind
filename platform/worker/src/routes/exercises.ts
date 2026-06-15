import { Hono } from 'hono'
import { desc, asc, gte, eq } from 'drizzle-orm'
import { getDb } from '../db'
import { exercises, testCases, submissions } from '../db/schema'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

function parseExercise(ex: typeof exercises.$inferSelect) {
  return {
    ...ex,
    tags: JSON.parse(ex.tags as string ?? '[]'),
    concepts: JSON.parse(ex.concepts as string ?? '[]'),
    hints: JSON.parse(ex.hints as string ?? '[]'),
  }
}

// GET /exercises/today
router.get('/today', async (c) => {
  const db = getDb(c.env)
  const today = new Date().toISOString().split('T')[0]

  let exs = await db.select().from(exercises)
    .where(gte(exercises.created_at, today + ' 00:00:00'))
    .orderBy(asc(exercises.created_at))

  if (exs.length === 0) {
    exs = await db.select().from(exercises)
      .orderBy(desc(exercises.created_at))
      .limit(3)
  }

  return c.json(exs.map(ex => ({ ...parseExercise(ex), attempt_count: 0, completion_count: 0, user_status: 'not_attempted' })))
})

// GET /exercises
router.get('/', async (c) => {
  const db = getDb(c.env)
  const exs = await db.select().from(exercises).orderBy(desc(exercises.created_at))
  const subs = await db.select({ exercise_id: submissions.exercise_id, status: submissions.status }).from(submissions)

  const subMap = new Map<string, { total: number; passed: number }>()
  for (const s of subs) {
    if (!s.exercise_id) continue
    const cur = subMap.get(s.exercise_id) ?? { total: 0, passed: 0 }
    cur.total++
    if (s.status === 'passed') cur.passed++
    subMap.set(s.exercise_id, cur)
  }

  return c.json(exs.map(ex => {
    const counts = subMap.get(ex.id) ?? { total: 0, passed: 0 }
    return {
      ...parseExercise(ex),
      attempt_count: counts.total,
      completion_count: counts.passed,
      user_status: counts.passed > 0 ? 'completed' : counts.total > 0 ? 'attempted' : 'not_attempted',
    }
  }))
})

// GET /exercises/:slug
router.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env)

  const [ex] = await db.select().from(exercises).where(eq(exercises.slug, slug)).limit(1)
  if (!ex) return c.json({ detail: 'Exercício não encontrado' }, 404)

  const tcs = await db.select().from(testCases)
    .where(eq(testCases.exercise_id, ex.id))
    .orderBy(asc(testCases.order))

  return c.json({ ...parseExercise(ex), test_cases: tcs })
})

export default router
