import { Hono } from 'hono'
import { and, asc, desc, eq, gte } from 'drizzle-orm'
import { getDb } from '../db'
import { exercises, submissions, testCases } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

const TODAY_FALLBACK_LIMIT = 3

/** `solution` never leaves the server — it is the answer to the exercise. */
function publicExercise(ex: typeof exercises.$inferSelect) {
  const { solution: _solution, ...rest } = ex
  return {
    ...rest,
    tags: JSON.parse(ex.tags ?? '[]'),
    concepts: JSON.parse(ex.concepts ?? '[]'),
    hints: JSON.parse(ex.hints ?? '[]'),
  }
}

type Counts = { total: number; passed: number }

/** Attempt counts for one user — never aggregate across users. */
async function countsByExercise(
  db: ReturnType<typeof getDb>,
  userId: string,
): Promise<Map<string, Counts>> {
  const rows = await db
    .select({ exercise_id: submissions.exercise_id, status: submissions.status })
    .from(submissions)
    .where(eq(submissions.user_id, userId))

  const counts = new Map<string, Counts>()
  for (const row of rows) {
    if (!row.exercise_id) continue
    const cur = counts.get(row.exercise_id) ?? { total: 0, passed: 0 }
    cur.total++
    if (row.status === 'passed') cur.passed++
    counts.set(row.exercise_id, cur)
  }
  return counts
}

function withStatus(ex: typeof exercises.$inferSelect, counts: Counts = { total: 0, passed: 0 }) {
  return {
    ...publicExercise(ex),
    attempt_count: counts.total,
    completion_count: counts.passed,
    user_status: counts.passed > 0 ? 'completed' : counts.total > 0 ? 'attempted' : 'not_attempted',
  }
}

// GET /exercises/today
router.get('/today', requireAuth, async (c) => {
  const db = getDb(c.env)
  const today = new Date().toISOString().split('T')[0]

  let exs = await db.select().from(exercises)
    .where(gte(exercises.created_at, `${today} 00:00:00`))
    .orderBy(asc(exercises.created_at))

  if (exs.length === 0) {
    exs = await db.select().from(exercises)
      .orderBy(desc(exercises.created_at))
      .limit(TODAY_FALLBACK_LIMIT)
  }

  const counts = await countsByExercise(db, c.get('userId'))
  return c.json(exs.map(ex => withStatus(ex, counts.get(ex.id))))
})

// GET /exercises
router.get('/', requireAuth, async (c) => {
  const db = getDb(c.env)
  const [exs, counts] = await Promise.all([
    db.select().from(exercises).orderBy(desc(exercises.created_at)),
    countsByExercise(db, c.get('userId')),
  ])

  return c.json(exs.map(ex => withStatus(ex, counts.get(ex.id))))
})

// GET /exercises/:slug
router.get('/:slug', requireAuth, async (c) => {
  const db = getDb(c.env)
  const slug = c.req.param('slug') ?? ''

  const [ex] = await db.select().from(exercises).where(eq(exercises.slug, slug)).limit(1)
  if (!ex) return c.json({ detail: 'Exercício não encontrado' }, 404)

  // Hidden cases are included: Pyodide runs the full suite in the browser.
  const tcs = await db.select().from(testCases)
    .where(eq(testCases.exercise_id, ex.id))
    .orderBy(asc(testCases.order))

  return c.json({ ...publicExercise(ex), test_cases: tcs })
})

export default router
