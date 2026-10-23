import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '../src/db'
import {
  addCourses, createRoadmap, deleteCourse, deleteRoadmap, failed, listCourseSummaries, listRoadmaps,
  removeCourses, reorderCourses, updateRoadmap, type RoadmapOut,
} from '../src/lib/roadmaps'
import { USER_ID, resetDb, seedCourse, seedUser } from './helpers'

const db = () => getDb(env)

async function make(title: string, ids: string[] = []): Promise<RoadmapOut> {
  const result = await createRoadmap(db(), USER_ID, { title, course_ids: ids })
  if (failed(result)) throw new Error(result.error)
  return result
}

async function order(id: string): Promise<string[] | undefined> {
  return (await listRoadmaps(db(), USER_ID)).find(r => r.id === id)?.course_ids
}

async function positions(id: string): Promise<number[]> {
  const { results } = await env.DB.prepare('SELECT position FROM roadmap_courses WHERE roadmap_id = ? ORDER BY position')
    .bind(id).all<{ position: number }>()
  return results.map(r => r.position)
}

async function courseExists(id: string): Promise<boolean> {
  return (await env.DB.prepare('SELECT id FROM courses WHERE id = ?').bind(id).first()) !== null
}

describe('roadmaps library', () => {
  beforeEach(async () => {
    await resetDb()
    await seedUser()
    await seedUser('other')
    for (const id of ['A', 'B', 'C', 'D']) await seedCourse(id)
  })

  it('creates an empty folder or one with ordered courses', async () => {
    const empty = await make('Backend')
    expect(empty).toMatchObject({ title: 'Backend', description: null, course_ids: [] })
    const web = await make('Web', ['B', 'A'])
    expect(web.course_ids).toEqual(['B', 'A'])
    expect(await positions(web.id)).toEqual([0, 1])
  })

  it('adds at a position, ignores members already in, keeps positions contiguous', async () => {
    const r = await make('R', ['A', 'B', 'C'])
    const added = await addCourses(db(), USER_ID, r.id, ['D'], 1)
    expect(failed(added)).toBe(false)
    expect(await order(r.id)).toEqual(['A', 'D', 'B', 'C'])
    await addCourses(db(), USER_ID, r.id, ['A', 'B'])
    expect(await order(r.id)).toEqual(['A', 'D', 'B', 'C'])
    await addCourses(db(), USER_ID, r.id, ['D'], 99)
    expect(await positions(r.id)).toEqual([0, 1, 2, 3])
  })

  it('appends at the end when no position is given', async () => {
    const r = await make('R', ['A'])
    await addCourses(db(), USER_ID, r.id, ['C', 'B'])
    expect(await order(r.id)).toEqual(['A', 'C', 'B'])
  })

  it('removes members and closes the gap', async () => {
    const r = await make('R', ['A', 'D', 'B', 'C'])
    await removeCourses(db(), USER_ID, r.id, ['D'])
    expect(await order(r.id)).toEqual(['A', 'B', 'C'])
    expect(await positions(r.id)).toEqual([0, 1, 2])
    expect(await courseExists('D')).toBe(true)
  })

  it('reorders only with exactly the current members', async () => {
    const r = await make('R', ['A', 'B'])
    expect(failed(await reorderCourses(db(), USER_ID, r.id, ['B', 'A']))).toBe(false)
    expect(await order(r.id)).toEqual(['B', 'A'])

    for (const bad of [['A'], ['A', 'B', 'C'], ['A', 'A'], ['A', 'X']]) {
      const result = await reorderCourses(db(), USER_ID, r.id, bad)
      expect(failed(result)).toBe(true)
    }
    expect(await order(r.id)).toEqual(['B', 'A'])
  })

  it('rejects unknown and foreign course ids and changes nothing', async () => {
    await seedCourse('theirs', 'other')
    const r = await make('R', ['A'])
    const unknown = await addCourses(db(), USER_ID, r.id, ['B', 'nope'])
    expect(failed(unknown) && unknown.error).toMatch(/nope/)
    const foreign = await addCourses(db(), USER_ID, r.id, ['theirs'])
    expect(failed(foreign)).toBe(true)
    expect(await order(r.id)).toEqual(['A'])
    expect(failed(await createRoadmap(db(), USER_ID, { title: 'X', course_ids: ['theirs'] }))).toBe(true)
    expect((await listRoadmaps(db(), USER_ID)).map(x => x.title)).toEqual(['R'])
  })

  it('updates title and description without touching the courses', async () => {
    const r = await make('Old', ['A', 'B'])
    const updated = await updateRoadmap(db(), USER_ID, r.id, { title: '  New  ', description: 'About' })
    expect(updated).toMatchObject({ title: 'New', description: 'About', course_ids: ['A', 'B'] })
    const cleared = await updateRoadmap(db(), USER_ID, r.id, { description: null })
    expect(cleared).toMatchObject({ description: null })
    expect(failed(await updateRoadmap(db(), USER_ID, r.id, {}))).toBe(true)
    expect(failed(await updateRoadmap(db(), USER_ID, r.id, { title: '   ' }))).toBe(true)
  })

  it('validates the title and the limits', async () => {
    expect(failed(await createRoadmap(db(), USER_ID, { title: '' }))).toBe(true)
    expect(failed(await createRoadmap(db(), USER_ID, { title: 'x'.repeat(201) }))).toBe(true)
    expect(failed(await createRoadmap(db(), USER_ID, { title: 'ok', description: 'y'.repeat(2001) }))).toBe(true)
    expect(failed(await createRoadmap(db(), USER_ID, { title: 'ok', course_ids: 'A' }))).toBe(true)
    const r = await make('R')
    const tooMany = Array.from({ length: 101 }, (_, i) => `c${i}`)
    expect(failed(await addCourses(db(), USER_ID, r.id, tooMany))).toBe(true)
  })

  it('refuses a 101st member', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `m${i}`)
    for (const id of ids) await seedCourse(id)
    const r = await make('Big', ids.slice(0, 100))
    expect(r.course_ids).toHaveLength(100)
    expect(failed(await addCourses(db(), USER_ID, r.id, [ids[100]]))).toBe(true)
    expect(await order(r.id)).toHaveLength(100)
  })

  it('deleting a roadmap keeps its courses and their progress by default', async () => {
    const r = await make('R', ['A', 'B'])
    await env.DB.prepare("INSERT INTO course_lesson_progress (user_id, course_id, lesson_key) VALUES (?, 'A', '0-0')").bind(USER_ID).run()
    const result = await deleteRoadmap(db(), USER_ID, r.id)
    expect(result).toEqual({ deleted_roadmap: r.id, deleted_courses: 0 })
    expect(await order(r.id)).toBeUndefined()
    expect(await courseExists('A')).toBe(true)
    const progress = await env.DB.prepare("SELECT COUNT(*) AS n FROM course_lesson_progress WHERE course_id = 'A'").first<{ n: number }>()
    expect(progress?.n).toBe(1)
  })

  it('deleting a roadmap with deleteCourses removes courses, progress and other links, and compacts', async () => {
    const r = await make('R', ['A', 'B'])
    const other = await make('Other', ['C', 'A', 'D'])
    await env.DB.prepare("INSERT INTO course_lesson_progress (user_id, course_id, lesson_key) VALUES (?, 'A', '0-0')").bind(USER_ID).run()
    const result = await deleteRoadmap(db(), USER_ID, r.id, true)
    expect(result).toEqual({ deleted_roadmap: r.id, deleted_courses: 2 })
    expect(await courseExists('A')).toBe(false)
    expect(await courseExists('B')).toBe(false)
    expect(await courseExists('C')).toBe(true)
    expect(await order(other.id)).toEqual(['C', 'D'])
    expect(await positions(other.id)).toEqual([0, 1])
    const progress = await env.DB.prepare("SELECT COUNT(*) AS n FROM course_lesson_progress WHERE course_id = 'A'").first<{ n: number }>()
    expect(progress?.n).toBe(0)
  })

  it('deleting a course removes progress and memberships and compacts every roadmap', async () => {
    const one = await make('One', ['A', 'B', 'C'])
    const two = await make('Two', ['B', 'D'])
    await env.DB.prepare("INSERT INTO course_lesson_progress (user_id, course_id, lesson_key) VALUES (?, 'B', '0-0')").bind(USER_ID).run()
    expect(await deleteCourse(db(), USER_ID, 'B')).toEqual({ deleted_course: 'B' })
    expect(await courseExists('B')).toBe(false)
    expect(await order(one.id)).toEqual(['A', 'C'])
    expect(await positions(one.id)).toEqual([0, 1])
    expect(await order(two.id)).toEqual(['D'])
    expect(await positions(two.id)).toEqual([0])
  })

  it('never lets one user see or change another user\'s data', async () => {
    const r = await make('Mine', ['A'])
    await seedCourse('theirs', 'other')
    expect(await listRoadmaps(db(), 'other')).toEqual([])
    expect(failed(await updateRoadmap(db(), 'other', r.id, { title: 'x' }))).toBe(true)
    expect(failed(await addCourses(db(), 'other', r.id, ['theirs']))).toBe(true)
    expect(failed(await removeCourses(db(), 'other', r.id, ['A']))).toBe(true)
    expect(failed(await reorderCourses(db(), 'other', r.id, ['A']))).toBe(true)
    expect(failed(await deleteRoadmap(db(), 'other', r.id, true))).toBe(true)
    expect(failed(await deleteCourse(db(), 'other', 'A'))).toBe(true)
    expect(await courseExists('A')).toBe(true)
    expect(await order(r.id)).toEqual(['A'])
  })

  it('deleting a roadmap of 100 courses with deleteCourses stays under the D1 parameter limit', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `m${i}`)
    for (const id of ids) await seedCourse(id)
    const big = await make('Big', ids)
    const other = await make('Other', ['A', 'm0', 'B', 'm99'])
    const result = await deleteRoadmap(db(), USER_ID, big.id, true)
    expect(result).toEqual({ deleted_roadmap: big.id, deleted_courses: 100 })
    expect(await courseExists('m0')).toBe(false)
    expect(await courseExists('m99')).toBe(false)
    expect(await order(other.id)).toEqual(['A', 'B'])
    expect(await positions(other.id)).toEqual([0, 1])
  })

  it('lists roadmaps created in the same second newest first', async () => {
    const first = await make('First')
    const second = await make('Second')
    const third = await make('Third')
    expect((await listRoadmaps(db(), USER_ID)).map(r => r.id)).toEqual([third.id, second.id, first.id])
  })

  it('treats course_ids null like a missing value', async () => {
    const result = await createRoadmap(db(), USER_ID, { title: 'R', course_ids: null })
    expect(failed(result)).toBe(false)
    expect(failed(result) ? [] : result.course_ids).toEqual([])
  })

  it('lists course summaries with lesson counts, newest first', async () => {
    const list = await listCourseSummaries(db(), USER_ID)
    expect(list).toHaveLength(4)
    expect(list[0]).toMatchObject({ lesson_count: 1 })
    expect(Object.keys(list[0]).sort()).toEqual(['created_at', 'description', 'id', 'lesson_count', 'title'])
  })
})
