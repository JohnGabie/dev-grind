import { Hono } from 'hono'
import { eq, and, inArray, sql, desc } from 'drizzle-orm'
import { getDb } from '../db'
import { submissions, exercises } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { getSummary } from '../lib/progress'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

// GET /progress/summary?days=7
router.get('/summary', requireAuth, async (c) => {
  const days = Math.min(90, Math.max(1, Number(c.req.query('days') ?? 7)))
  const db = getDb(c.env)
  return c.json(await getSummary(db, c.get('userId'), days))
})

// GET /progress/resume — last unfinished exercise
router.get('/resume', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')

  const [lastSub] = await db.select()
    .from(submissions)
    .where(eq(submissions.user_id, userId))
    .orderBy(desc(submissions.submitted_at))
    .limit(1)

  if (!lastSub) return c.json(null)

  const [exercise] = await db.select().from(exercises)
    .where(eq(exercises.id, lastSub.exercise_id)).limit(1)
  if (!exercise) return c.json(null)

  const [alreadyPassed] = await db.select({ id: submissions.id })
    .from(submissions)
    .where(and(
      eq(submissions.user_id, userId),
      eq(submissions.exercise_id, exercise.id),
      eq(submissions.status, 'passed'),
    )).limit(1)

  if (alreadyPassed) return c.json(null)

  const testResults: { passed?: boolean }[] = JSON.parse(lastSub.test_results as string ?? '[]')

  return c.json({
    exercise: { title: exercise.title, slug: exercise.slug, difficulty: exercise.difficulty },
    passed_count: testResults.filter(t => t.passed).length,
    total_count: testResults.length,
    submitted_at: lastSub.submitted_at,
  })
})

// GET /progress/recent-exercises?limit=20
router.get('/recent-exercises', requireAuth, async (c) => {
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 20)))
  const db = getDb(c.env)
  const userId = c.get('userId')

  const latestPerExercise = await db.select({
    exercise_id: submissions.exercise_id,
    latest_at: sql<string>`MAX(${submissions.submitted_at})`,
    status: submissions.status,
  })
    .from(submissions)
    .where(eq(submissions.user_id, userId))
    .groupBy(submissions.exercise_id)
    .orderBy(sql`MAX(${submissions.submitted_at}) DESC`)
    .limit(limit)

  if (latestPerExercise.length === 0) return c.json([])

  const exerciseIds = latestPerExercise.map(r => r.exercise_id).filter(Boolean) as string[]

  const exRows = await db.select().from(exercises).where(inArray(exercises.id, exerciseIds))
  const exMap = new Map(exRows.map(e => [e.id, e]))

  const passedSubs = await db.select({ exercise_id: submissions.exercise_id })
    .from(submissions)
    .where(and(
      eq(submissions.user_id, userId),
      eq(submissions.status, 'passed'),
      inArray(submissions.exercise_id, exerciseIds),
    ))
  const passedSet = new Set(passedSubs.map(s => s.exercise_id))

  return c.json(latestPerExercise.map(row => {
    const ex = exMap.get(row.exercise_id!)
    if (!ex) return null
    return {
      id: ex.id,
      title: ex.title,
      slug: ex.slug,
      difficulty: ex.difficulty,
      tags: JSON.parse(ex.tags as string ?? '[]'),
      status: passedSet.has(ex.id) ? 'passed' : row.status,
      submitted_at: row.latest_at,
    }
  }).filter(Boolean))
})

export default router
