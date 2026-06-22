import { Hono } from 'hono'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { getDb } from '../db'
import { users, submissions, exercises, dailyProgress } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { honorToRank, rankProgress, RANK_THRESHOLDS } from '../lib/rank'
import { getSummary } from '../lib/progress'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

// PATCH /users/me
router.patch('/me', requireAuth, async (c) => {
  const body = await c.req.json<{ name?: string; bio?: string; social_links?: Record<string, unknown> }>()
  const db = getDb(c.env)
  const userId = c.get('userId')

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim()) return c.json({ detail: 'name cannot be empty' }, 422)
    updates.name = body.name.trim()
  }
  if (body.bio !== undefined) updates.bio = body.bio.trim() || null
  if (body.social_links !== undefined) updates.social_links = JSON.stringify(body.social_links)

  if (Object.keys(updates).length === 0) return c.json({ detail: 'nothing to update' }, 400)

  await db.update(users).set(updates).where(eq(users.id, userId))
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return c.json({ name: user.name, bio: user.bio })
})

// GET /users/me/stats
router.get('/me/stats', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return c.json({ detail: 'Usuário não encontrado' }, 404)

  const allSubs = await db.select({ status: submissions.status })
    .from(submissions).where(eq(submissions.user_id, userId))
  const totalAttempted = allSubs.length
  const totalCompleted = allSubs.filter(s => s.status === 'passed').length

  const rank = honorToRank(user.honor)
  const progress = rankProgress(user.honor)
  const rankIdx = RANK_THRESHOLDS.findIndex(([, name]) => name === rank)
  const honorForNext = RANK_THRESHOLDS[Math.min(rankIdx + 1, RANK_THRESHOLDS.length - 1)][0]

  const daysSinceJoined = user.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
    : 0

  const [{ daysActive }] = await db.select({
    daysActive: sql<number>`COUNT(${dailyProgress.id})`,
  }).from(dailyProgress)
    .where(and(eq(dailyProgress.user_id, userId), sql`${dailyProgress.exercises_completed} > 0`))

  const summary = await getSummary(db, userId, 7)

  const recent = await db.select({
    title: exercises.title,
    slug: exercises.slug,
    difficulty: exercises.difficulty,
    submitted_at: submissions.submitted_at,
  })
    .from(submissions)
    .innerJoin(exercises, eq(submissions.exercise_id, exercises.id))
    .where(and(eq(submissions.user_id, userId), eq(submissions.status, 'passed')))
    .orderBy(desc(submissions.submitted_at))
    .limit(5)

  const since364 = new Date()
  since364.setDate(since364.getDate() - 364)

  const heatmapRows = await db.select({
    day: sql<string>`DATE(${submissions.submitted_at})`,
    count: sql<number>`COUNT(${submissions.id})`,
  })
    .from(submissions)
    .where(and(
      eq(submissions.user_id, userId),
      eq(submissions.status, 'passed'),
      gte(submissions.submitted_at, since364.toISOString().split('T')[0]),
    ))
    .groupBy(sql`DATE(${submissions.submitted_at})`)

  const heatmap: Record<string, { total: number; katas: number; books: number; courses: number }> = {}
  for (const row of heatmapRows) {
    heatmap[row.day] = { total: row.count, katas: row.count, books: 0, courses: 0 }
  }

  return c.json({
    user: {
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      cover_url: user.cover_url,
      bio: user.bio,
      social_links: JSON.parse(user.social_links as string ?? '{}'),
      created_at: user.created_at?.split('T')[0] ?? null,
    },
    rank,
    rank_progress: Math.round(progress * 1000) / 1000,
    honor: user.honor,
    coins: user.coins,
    honor_for_next_rank: honorForNext,
    total_completed: totalCompleted,
    total_attempted: totalAttempted,
    completion_rate: totalAttempted ? Math.round((totalCompleted / totalAttempted) * 100) / 100 : 0,
    current_streak: summary.current_streak,
    days_active: daysActive,
    days_since_joined: daysSinceJoined,
    recent_completions: recent,
    heatmap,
    weekly_summary: summary,
  })
})

export default router
