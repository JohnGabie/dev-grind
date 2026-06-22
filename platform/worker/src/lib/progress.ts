import { eq, and, gte, sql } from 'drizzle-orm'
import type { getDb } from '../db'
import { dailyProgress } from '../db/schema'

export async function recordAttempt(db: ReturnType<typeof getDb>, userId: string, completed: boolean) {
  const today = new Date().toISOString().split('T')[0]
  await db.insert(dailyProgress)
    .values({
      user_id: userId,
      date: today,
      exercises_attempted: 1,
      exercises_completed: completed ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: [dailyProgress.user_id, dailyProgress.date],
      set: {
        exercises_attempted: sql`${dailyProgress.exercises_attempted} + 1`,
        exercises_completed: sql`${dailyProgress.exercises_completed} + ${completed ? 1 : 0}`,
      },
    })
}

export async function getSummary(db: ReturnType<typeof getDb>, userId: string, days = 7) {
  const today = new Date()
  const since = new Date(today)
  since.setDate(since.getDate() - (days - 1))
  const sinceStr = since.toISOString().split('T')[0]

  const rows = await db.select()
    .from(dailyProgress)
    .where(and(eq(dailyProgress.user_id, userId), gte(dailyProgress.date, sinceStr)))
    .orderBy(dailyProgress.date)

  const completedLast7 = rows.reduce((s, r) => s + r.exercises_completed, 0)
  const cutoff3 = new Date(today)
  cutoff3.setDate(cutoff3.getDate() - 2)
  const cutoff3Str = cutoff3.toISOString().split('T')[0]
  const completedLast3 = rows
    .filter(r => r.date >= cutoff3Str)
    .reduce((s, r) => s + r.exercises_completed, 0)

  let streak = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dStr = d.toISOString().split('T')[0]
    const match = rows.find(r => r.date === dStr)
    if (match && match.exercises_completed > 0) streak++
    else break
  }

  return {
    completed_last_3_days: completedLast3,
    completed_last_7_days: completedLast7,
    current_streak: streak,
    daily_breakdown: rows.map(r => ({ date: r.date, completed: r.exercises_completed, attempted: r.exercises_attempted })),
  }
}
