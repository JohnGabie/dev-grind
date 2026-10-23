import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { getDb } from '../db'
import { courseLessonProgress, courses, roadmapCourses, roadmaps } from '../db/schema'

type Db = ReturnType<typeof getDb>
type Json = Record<string, unknown>

export type Failure = { error: string }
export interface RoadmapOut {
  id: string
  title: string
  description: string | null
  created_at: string
  course_ids: string[]
}

const MAX_IDS = 100
const MAX_MEMBERS = 100
const CHUNK = 90 // D1 allows 100 bound parameters per statement
const MAX_TITLE = 200
const MAX_DESCRIPTION = 2000

export const failed = (value: unknown): value is Failure =>
  typeof value === 'object' && value !== null && 'error' in value

const notFound = (id: string): Failure => ({ error: `Roadmap '${id}' not found or not yours` })

function cleanTitle(value: unknown): string | Failure {
  if (typeof value !== 'string' || !value.trim()) return { error: 'title is required' }
  const title = value.trim()
  return title.length > MAX_TITLE ? { error: `title is at most ${MAX_TITLE} characters` } : title
}

function cleanDescription(value: unknown): string | null | Failure {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return { error: 'description must be a string' }
  const text = value.trim()
  if (text.length > MAX_DESCRIPTION) return { error: `description is at most ${MAX_DESCRIPTION} characters` }
  return text || null
}

function cleanIds(value: unknown, rawCheck = false): string[] | Failure {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item === '')) {
    return { error: 'course_ids must be an array of non-empty strings' }
  }
  const ids = [...new Set(value as string[])]
  if (rawCheck && ids.length !== value.length) return { error: 'course_ids must not repeat an id' }
  if (ids.length > MAX_IDS) return { error: `at most ${MAX_IDS} course ids per call` }
  return ids
}

async function ownedRoadmap(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(roadmaps)
    .where(and(eq(roadmaps.id, id), eq(roadmaps.user_id, userId))).limit(1)
  return row ?? null
}

async function memberIds(db: Db, roadmapId: string): Promise<string[]> {
  const rows = await db.select({ id: roadmapCourses.course_id }).from(roadmapCourses)
    .where(eq(roadmapCourses.roadmap_id, roadmapId)).orderBy(asc(roadmapCourses.position))
  return rows.map(row => row.id)
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK))
  return out
}

async function unknownCourses(db: Db, userId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const found = new Set<string>()
  for (const part of chunks(ids)) {
    const rows = await db.select({ id: courses.id }).from(courses)
      .where(and(eq(courses.user_id, userId), inArray(courses.id, part)))
    for (const row of rows) found.add(row.id)
  }
  return ids.filter(id => !found.has(id))
}

async function writeOrder(db: Db, roadmapId: string, ids: string[]): Promise<void> {
  await db.batch([
    db.delete(roadmapCourses).where(eq(roadmapCourses.roadmap_id, roadmapId)),
    ...ids.map((course_id, position) => db.insert(roadmapCourses).values({ roadmap_id: roadmapId, course_id, position })),
  ])
}

async function compact(db: Db, roadmapId: string): Promise<void> {
  await writeOrder(db, roadmapId, await memberIds(db, roadmapId))
}

async function readRoadmap(db: Db, userId: string, id: string): Promise<RoadmapOut | null> {
  const row = await ownedRoadmap(db, userId, id)
  if (!row) return null
  return { id: row.id, title: row.title, description: row.description, created_at: row.created_at, course_ids: await memberIds(db, id) }
}

export async function listRoadmaps(db: Db, userId: string): Promise<RoadmapOut[]> {
  const rows = await db.select().from(roadmaps).where(eq(roadmaps.user_id, userId)).orderBy(desc(roadmaps.created_at), desc(sql`rowid`))
  const links = await db.select({ roadmap_id: roadmapCourses.roadmap_id, course_id: roadmapCourses.course_id })
    .from(roadmapCourses)
    .innerJoin(roadmaps, eq(roadmaps.id, roadmapCourses.roadmap_id))
    .where(eq(roadmaps.user_id, userId))
    .orderBy(asc(roadmapCourses.position))
  const byRoadmap = new Map<string, string[]>()
  for (const link of links) byRoadmap.set(link.roadmap_id, [...(byRoadmap.get(link.roadmap_id) ?? []), link.course_id])
  return rows.map(row => ({
    id: row.id, title: row.title, description: row.description, created_at: row.created_at,
    course_ids: byRoadmap.get(row.id) ?? [],
  }))
}

export async function createRoadmap(db: Db, userId: string, input: Json): Promise<RoadmapOut | Failure> {
  const title = cleanTitle(input.title)
  if (typeof title !== 'string') return title
  const description = cleanDescription(input.description)
  if (description !== null && typeof description !== 'string') return description
  const ids = cleanIds(input.course_ids ?? undefined)
  if (failed(ids)) return ids
  if (ids.length > MAX_MEMBERS) return { error: `a roadmap holds at most ${MAX_MEMBERS} courses` }
  const unknown = await unknownCourses(db, userId, ids)
  if (unknown.length) return { error: `Unknown course ids: ${unknown.join(', ')}` }
  const id = crypto.randomUUID()
  await db.batch([
    db.insert(roadmaps).values({ id, user_id: userId, title, description }),
    ...ids.map((course_id, position) => db.insert(roadmapCourses).values({ roadmap_id: id, course_id, position })),
  ])
  return (await readRoadmap(db, userId, id))!
}

export async function updateRoadmap(db: Db, userId: string, id: string, patch: Json): Promise<RoadmapOut | Failure> {
  if (!(await ownedRoadmap(db, userId, id))) return notFound(id)
  const set: { title?: string; description?: string | null } = {}
  if (patch.title !== undefined) {
    const title = cleanTitle(patch.title)
    if (typeof title !== 'string') return title
    set.title = title
  }
  if (patch.description !== undefined) {
    const description = cleanDescription(patch.description)
    if (description !== null && typeof description !== 'string') return description
    set.description = description
  }
  if (Object.keys(set).length === 0) return { error: 'nothing to update: send title and/or description' }
  await db.update(roadmaps).set(set).where(and(eq(roadmaps.id, id), eq(roadmaps.user_id, userId)))
  return (await readRoadmap(db, userId, id))!
}

export async function addCourses(db: Db, userId: string, id: string, courseIds: unknown, position?: unknown): Promise<RoadmapOut | Failure> {
  if (!(await ownedRoadmap(db, userId, id))) return notFound(id)
  const ids = cleanIds(courseIds)
  if (failed(ids)) return ids
  if (ids.length === 0) return { error: 'course_ids is required' }
  const unknown = await unknownCourses(db, userId, ids)
  if (unknown.length) return { error: `Unknown course ids: ${unknown.join(', ')}` }
  const current = await memberIds(db, id)
  const fresh = ids.filter(courseId => !current.includes(courseId))
  if (current.length + fresh.length > MAX_MEMBERS) return { error: `a roadmap holds at most ${MAX_MEMBERS} courses` }
  let at = current.length
  if (position !== undefined) {
    if (!Number.isInteger(position) || (position as number) < 0) return { error: 'position must be an integer of 0 or more' }
    at = Math.min(position as number, current.length)
  }
  if (fresh.length > 0) await writeOrder(db, id, [...current.slice(0, at), ...fresh, ...current.slice(at)])
  return (await readRoadmap(db, userId, id))!
}

export async function removeCourses(db: Db, userId: string, id: string, courseIds: unknown): Promise<RoadmapOut | Failure> {
  if (!(await ownedRoadmap(db, userId, id))) return notFound(id)
  const ids = cleanIds(courseIds)
  if (failed(ids)) return ids
  if (ids.length === 0) return { error: 'course_ids is required' }
  const current = await memberIds(db, id)
  const next = current.filter(courseId => !ids.includes(courseId))
  if (next.length !== current.length) await writeOrder(db, id, next)
  return (await readRoadmap(db, userId, id))!
}

export async function reorderCourses(db: Db, userId: string, id: string, courseIds: unknown): Promise<RoadmapOut | Failure> {
  if (!(await ownedRoadmap(db, userId, id))) return notFound(id)
  const ids = cleanIds(courseIds, true)
  if (failed(ids)) return ids
  const current = await memberIds(db, id)
  const missing = current.filter(courseId => !ids.includes(courseId))
  const extra = ids.filter(courseId => !current.includes(courseId))
  if (missing.length || extra.length) {
    return { error: `course_ids must be exactly the current members; missing: [${missing.join(', ')}] unexpected: [${extra.join(', ')}]` }
  }
  await writeOrder(db, id, ids)
  return (await readRoadmap(db, userId, id))!
}

async function otherRoadmapsHolding(db: Db, courseIds: string[], exceptRoadmapId?: string): Promise<string[]> {
  if (courseIds.length === 0) return []
  const found = new Set<string>()
  for (const part of chunks(courseIds)) {
    const filters = [inArray(roadmapCourses.course_id, part)]
    if (exceptRoadmapId) filters.push(ne(roadmapCourses.roadmap_id, exceptRoadmapId))
    const rows = await db.selectDistinct({ id: roadmapCourses.roadmap_id }).from(roadmapCourses).where(and(...filters))
    for (const row of rows) found.add(row.id)
  }
  return [...found]
}

export async function deleteRoadmap(db: Db, userId: string, id: string, deleteCourses = false): Promise<{ deleted_roadmap: string; deleted_courses: number } | Failure> {
  if (!(await ownedRoadmap(db, userId, id))) return notFound(id)
  const ids = await memberIds(db, id)
  const toDelete = deleteCourses ? ids : []
  const affected = await otherRoadmapsHolding(db, toDelete, id)
  await db.batch([
    db.delete(roadmapCourses).where(eq(roadmapCourses.roadmap_id, id)),
    ...chunks(toDelete).flatMap(part => [
      db.delete(roadmapCourses).where(inArray(roadmapCourses.course_id, part)),
      db.delete(courseLessonProgress).where(and(eq(courseLessonProgress.user_id, userId), inArray(courseLessonProgress.course_id, part))),
      db.delete(courses).where(and(eq(courses.user_id, userId), inArray(courses.id, part))),
    ]),
    db.delete(roadmaps).where(and(eq(roadmaps.id, id), eq(roadmaps.user_id, userId))),
  ])
  for (const other of affected) await compact(db, other)
  return { deleted_roadmap: id, deleted_courses: toDelete.length }
}

export async function deleteCourse(db: Db, userId: string, courseId: string): Promise<{ deleted_course: string } | Failure> {
  const [course] = await db.select({ id: courses.id }).from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.user_id, userId))).limit(1)
  if (!course) return { error: `Course '${courseId}' not found or not yours` }
  const affected = await otherRoadmapsHolding(db, [courseId])
  await db.batch([
    db.delete(roadmapCourses).where(eq(roadmapCourses.course_id, courseId)),
    db.delete(courseLessonProgress).where(and(eq(courseLessonProgress.user_id, userId), eq(courseLessonProgress.course_id, courseId))),
    db.delete(courses).where(and(eq(courses.id, courseId), eq(courses.user_id, userId))),
  ])
  for (const roadmapId of affected) await compact(db, roadmapId)
  return { deleted_course: courseId }
}

export async function listCourseSummaries(db: Db, userId: string) {
  const rows = await db.select().from(courses).where(eq(courses.user_id, userId)).orderBy(desc(courses.created_at))
  return rows.map(row => {
    let lessons = 0
    try {
      const modules = JSON.parse(row.modules as string) as Array<{ lessons?: unknown[] }>
      lessons = modules.reduce((n, section) => n + (Array.isArray(section.lessons) ? section.lessons.length : 0), 0)
    } catch { /* a malformed modules column counts as 0 lessons */ }
    return { id: row.id, title: row.title, description: row.description, lesson_count: lessons, created_at: row.created_at }
  })
}
