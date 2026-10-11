import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '../db'
import { courseLessonProgress, courses } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { recordAttempt } from '../lib/progress'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

function lessonKeys(modules: unknown): Set<string> {
  if (!Array.isArray(modules)) return new Set()
  const keys = new Set<string>()
  modules.forEach((section, si) => {
    const lessons = (section as { lessons?: unknown }).lessons
    if (!Array.isArray(lessons)) return
    lessons.forEach((_, li) => keys.add(`${si}-${li}`))
  })
  return keys
}

function lessonStepCount(modules: unknown, lessonKey: string): number | null {
  const pieces = lessonKey.split('-')
  if (pieces.length !== 2) return null
  const sectionIndex = Number(pieces[0])
  const lessonIndex = Number(pieces[1])
  if (!Number.isInteger(sectionIndex) || !Number.isInteger(lessonIndex)) return null
  if (!Array.isArray(modules)) return null
  const section = modules[sectionIndex] as { lessons?: unknown } | undefined
  const lessons = section?.lessons
  if (!Array.isArray(lessons)) return null
  const lesson = lessons[lessonIndex] as { steps?: unknown } | undefined
  if (!lesson || typeof lesson !== 'object') return null
  return Array.isArray(lesson.steps) ? lesson.steps.length : null
}

router.get('/', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const rows = await db.select().from(courses)
    .where(eq(courses.user_id, userId))
    .orderBy(desc(courses.created_at))
  const done = await db.select().from(courseLessonProgress)
    .where(eq(courseLessonProgress.user_id, userId))
  const byCourse = new Map<string, string[]>()
  const partsByCourse = new Map<string, Record<string, number>>()
  for (const row of done) {
    if (row.finished) {
      const list = byCourse.get(row.course_id) ?? []
      list.push(row.lesson_key)
      byCourse.set(row.course_id, list)
      continue
    }
    if (row.parts_done <= 0) continue
    const parts = partsByCourse.get(row.course_id) ?? {}
    parts[row.lesson_key] = row.parts_done
    partsByCourse.set(row.course_id, parts)
  }

  return c.json(rows.map(row => ({
    id: row.id,
    title: row.title,
    book_slug: row.book_slug,
    description: row.description,
    modules: JSON.parse(row.modules as string ?? '[]'),
    is_complete: Boolean(row.is_complete),
    completed_lessons: byCourse.get(row.id) ?? [],
    lesson_parts: partsByCourse.get(row.id) ?? {},
    created_at: row.created_at,
  })))
})

router.post('/:id/lessons/:lessonKey/progress', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const courseId = c.req.param('id')
  const lessonKey = c.req.param('lessonKey')
  if (!courseId || !lessonKey) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json().catch(() => null) as { parts_done?: unknown } | null
  const partsDone = body?.parts_done
  if (!Number.isInteger(partsDone) || (partsDone as number) < 0) {
    return c.json({ error: 'parts_done must be an integer' }, 400)
  }

  const [course] = await db.select().from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.user_id, userId)))
    .limit(1)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const modules = JSON.parse(course.modules as string ?? '[]')
  const stepCount = lessonStepCount(modules, lessonKey)
  if (stepCount === null) return c.json({ error: 'Lesson not found' }, 404)
  if ((partsDone as number) >= stepCount) return c.json({ error: 'parts_done is past the last open part' }, 400)

  const [existing] = await db.select().from(courseLessonProgress)
    .where(and(
      eq(courseLessonProgress.user_id, userId),
      eq(courseLessonProgress.course_id, courseId),
      eq(courseLessonProgress.lesson_key, lessonKey),
    ))
    .limit(1)
  if (existing?.finished) return c.json({ finished: true, parts_done: stepCount })

  const next = Math.max(existing?.parts_done ?? 0, partsDone as number)
  if (existing) {
    await db.update(courseLessonProgress)
      .set({ parts_done: next })
      .where(eq(courseLessonProgress.id, existing.id))
  } else {
    await db.insert(courseLessonProgress).values({
      user_id: userId,
      course_id: courseId,
      lesson_key: lessonKey,
      parts_done: next,
      finished: false,
    })
  }
  return c.json({ finished: false, parts_done: next })
})

router.post('/:id/lessons/:lessonKey/complete', requireAuth, async (c) => {
  const db = getDb(c.env)
  const userId = c.get('userId')
  const courseId = c.req.param('id')
  const lessonKey = c.req.param('lessonKey')
  if (!courseId || !lessonKey) return c.json({ error: 'Not found' }, 404)
  const [course] = await db.select().from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.user_id, userId)))
    .limit(1)
  if (!course) return c.json({ error: 'Course not found' }, 404)

  const modules = JSON.parse(course.modules as string ?? '[]')
  if (!lessonKeys(modules).has(lessonKey)) return c.json({ error: 'Lesson not found' }, 404)

  const [existing] = await db.select().from(courseLessonProgress)
    .where(and(
      eq(courseLessonProgress.user_id, userId),
      eq(courseLessonProgress.course_id, courseId),
      eq(courseLessonProgress.lesson_key, lessonKey),
    ))
    .limit(1)
  if (existing?.finished) return c.json({ completed: true, already: true })

  if (existing) {
    await db.update(courseLessonProgress)
      .set({ finished: true })
      .where(eq(courseLessonProgress.id, existing.id))
  } else {
    await db.insert(courseLessonProgress).values({
      user_id: userId,
      course_id: courseId,
      lesson_key: lessonKey,
      finished: true,
    })
  }
  await recordAttempt(db, userId, true)
  return c.json({ completed: true, already: false })
})

export default router
