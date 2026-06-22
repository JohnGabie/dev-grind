import { Hono } from 'hono'
import { desc, eq, and } from 'drizzle-orm'
import { getDb } from '../db'
import { exercises, submissions } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { recordAttempt } from '../lib/progress'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

// POST /submissions
router.post('/', requireAuth, async (c) => {
  const body = await c.req.json<{
    exercise_id: string
    code: string
    status: string
    test_results: unknown[]
    time_spent_seconds?: number
  }>()

  const db = getDb(c.env)

  const [exercise] = await db.select().from(exercises).where(eq(exercises.id, body.exercise_id)).limit(1)
  if (!exercise) return c.json({ detail: 'Exercício não encontrado' }, 404)

  const id = crypto.randomUUID()
  const submitted_at = new Date().toISOString()

  await db.insert(submissions).values({
    id,
    user_id: c.get('userId'),
    exercise_id: body.exercise_id,
    code: body.code,
    status: body.status,
    test_results: JSON.stringify(body.test_results),
    submitted_at,
    time_spent_seconds: body.time_spent_seconds ?? null,
  })

  await recordAttempt(db, c.get('userId'), body.status === 'passed')

  return c.json({ id, exercise_id: body.exercise_id, status: body.status, submitted_at }, 201)
})

// GET /submissions/exercise/:exercise_id
router.get('/exercise/:exercise_id', requireAuth, async (c) => {
  const exercise_id = c.req.param('exercise_id')
  const db = getDb(c.env)

  const subs = await db.select().from(submissions)
    .where(and(eq(submissions.user_id, c.get('userId')), eq(submissions.exercise_id, exercise_id)))
    .orderBy(desc(submissions.submitted_at))

  return c.json(subs)
})

export default router
