# Roadmaps Worker (Part 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Worker roadmaps (ordered folders of courses): two tables, a library with all the bookkeeping, eight MCP tools the AI uses, and the two routes the app needs (list roadmaps, delete roadmap, delete course).

**Architecture:** One new library `src/lib/roadmaps.ts` holds every rule (ownership, validation, position bookkeeping, deletion); the MCP tools and the routes are thin wrappers over it, so there is a single implementation. Order is stored as `roadmap_courses.position` and rewritten contiguous after every change with one `db.batch`. No frontend work here (Part 3b).

**Tech Stack:** Cloudflare Workers, Hono, D1, Drizzle (`drizzle-orm/d1`, `db.batch`), Vitest with `@cloudflare/vitest-pool-workers`.

**Spec:** `docs/superpowers/specs/2026-10-21-courses.md`, Part 3 ("Data", "Worker API", "MCP tools" and the "Worker scenarios"). Approved by João on 2026-10-21.

## Global Constraints

- English for code, comments, tool descriptions, commits. Tool and route error strings are English.
- Every query is scoped by `user_id` taken from the JWT or personal token (`ctx.userId` / `c.get('userId')`); never from the request body.
- Position bookkeeping lives only in `lib/roadmaps.ts` (`writeOrder`/`compact`); positions are 0-based and contiguous after every change.
- Limits: at most 100 course ids per call, at most 100 courses per roadmap, title 1-200 chars (trimmed), description at most 2000 chars. D1 allows at most 100 bound parameters per statement, which is why `inArray` lists stay at or below 100.
- Deleting is permanent. `delete_roadmap` defaults `delete_courses` to `false`; the tool description says `true` deletes the courses and their progress for good.
- Do not change `create_course`, `append_course_modules`, the `modules` JSON, or any frontend file.
- Migrations are plain SQL files in `platform/worker/drizzle/` (the test pool reads the folder; the journal is not used). The new file is `0006_roadmaps.sql`, statements separated by `--> statement-breakpoint` like `0005`.
- Commit per task, explicit staging, English imperative subject ≤ 72 chars, no amend, no `--no-verify`. Branch `feat/course-lesson-progress` (stay on it). Commit messages end with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Models: Sonnet for Tasks 1-3; final review on Opus.

## Review Focus

- A course id that belongs to another user must be rejected everywhere (create, add), and a foreign roadmap id must behave as "not found" in every tool and route.
- `reorder_roadmap_courses` must reject a list that is missing a member, has an extra id, or repeats an id, and leave the order untouched.
- Deleting a course (route, or via `delete_roadmap` with `delete_courses`) must remove its lesson progress and its membership in every roadmap, then compact the other roadmaps' positions.
- Failed calls must change nothing (validation happens before the batch; the batch is atomic).
- A roadmap with 100 members refuses a 101st; a call with 101 ids is refused; neither touches `inArray` with more than 100 values.
- Blank, whitespace-only and over-long titles; `description: null` clears it.

## File Structure

| File | Responsibility |
|---|---|
| `drizzle/0006_roadmaps.sql` (new) | The two tables and their indexes |
| `src/db/schema.ts` | Drizzle definitions `roadmaps` and `roadmapCourses` |
| `src/lib/roadmaps.ts` (new) | All roadmap and course-deletion rules |
| `src/lib/tools.ts` | Eight new tools wrapping the library |
| `src/routes/roadmaps.ts` (new) | `GET /roadmaps`, `DELETE /roadmaps/:id` |
| `src/routes/courses.ts` | `DELETE /courses/:id` |
| `src/index.ts` | Register `/roadmaps` |
| `test/helpers.ts` | `seedCourse`, and the two new tables in `resetDb` |
| `test/roadmaps.test.ts` (new) | Library behaviour |
| `test/roadmapTools.test.ts` (new) | The MCP tools through `/mcp` |
| `test/roadmapRoutes.test.ts` (new) | The routes |

Paths are relative to `platform/worker/`.

---

### Task 1: Tables and the roadmap library

**Files:**
- Create: `drizzle/0006_roadmaps.sql`, `src/lib/roadmaps.ts`, `test/roadmaps.test.ts`
- Modify: `src/db/schema.ts`, `test/helpers.ts`

**Interfaces:**
- Produces from `src/lib/roadmaps.ts` (all take `db: ReturnType<typeof getDb>` first and `userId: string` second):
  - `type Failure = { error: string }`, `failed(value): value is Failure`
  - `interface RoadmapOut { id: string; title: string; description: string | null; created_at: string; course_ids: string[] }`
  - `listRoadmaps(db, userId): Promise<RoadmapOut[]>` (newest roadmap first)
  - `createRoadmap(db, userId, input: { title?: unknown; description?: unknown; course_ids?: unknown }): Promise<RoadmapOut | Failure>`
  - `updateRoadmap(db, userId, id: string, patch: { title?: unknown; description?: unknown }): Promise<RoadmapOut | Failure>`
  - `addCourses(db, userId, id: string, courseIds: unknown, position?: unknown): Promise<RoadmapOut | Failure>`
  - `removeCourses(db, userId, id: string, courseIds: unknown): Promise<RoadmapOut | Failure>`
  - `reorderCourses(db, userId, id: string, courseIds: unknown): Promise<RoadmapOut | Failure>`
  - `deleteRoadmap(db, userId, id: string, deleteCourses?: boolean): Promise<{ deleted_roadmap: string; deleted_courses: number } | Failure>`
  - `deleteCourse(db, userId, courseId: string): Promise<{ deleted_course: string } | Failure>`
  - `listCourseSummaries(db, userId): Promise<Array<{ id: string; title: string; description: string | null; lesson_count: number; created_at: string }>>`
- Produces from `test/helpers.ts`: `seedCourse(id: string, userId?: string, title?: string): Promise<void>`.

- [ ] **Step 1: Migration.** `drizzle/0006_roadmaps.sql`:

```sql
CREATE TABLE `roadmaps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roadmap_courses` (
	`roadmap_id` text NOT NULL,
	`course_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`roadmap_id`, `course_id`),
	FOREIGN KEY (`roadmap_id`) REFERENCES `roadmaps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_roadmaps_user` ON `roadmaps` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_roadmap_courses_course` ON `roadmap_courses` (`course_id`);
```

- [ ] **Step 2: Drizzle schema.** In `src/db/schema.ts`, after `courseLessonProgress`, add (import `primaryKey` from `drizzle-orm/sqlite-core` next to the existing sqlite-core imports):

```ts
// ─── roadmaps ─────────────────────────────────────────────────────────────────
export const roadmaps = sqliteTable('roadmaps', {
  id:          text('id').primaryKey(),
  user_id:     text('user_id').notNull().references(() => users.id),
  title:       text('title').notNull(),
  description: text('description'),
  created_at:  text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, (t) => [
  index('idx_roadmaps_user').on(t.user_id),
])

export const roadmapCourses = sqliteTable('roadmap_courses', {
  roadmap_id: text('roadmap_id').notNull().references(() => roadmaps.id),
  course_id:  text('course_id').notNull().references(() => courses.id),
  position:   integer('position').notNull(),
}, (t) => [
  primaryKey({ columns: [t.roadmap_id, t.course_id] }),
  index('idx_roadmap_courses_course').on(t.course_id),
])
```

- [ ] **Step 3: Test helpers.** In `test/helpers.ts` add `'roadmap_courses', 'roadmaps',` at the **start** of `TABLES_IN_FK_ORDER` (children first), and add:

```ts
export async function seedCourse(id: string, userId = USER_ID, title = `Course ${id}`) {
  const modules = JSON.stringify([{ title: 'S', lessons: [{ title: 'L', steps: [{ type: 'text', body: 'x' }] }] }])
  await env.DB.prepare('INSERT INTO courses (id, user_id, title, modules) VALUES (?, ?, ?, ?)')
    .bind(id, userId, title, modules).run()
}
```

- [ ] **Step 4: Failing tests.** `test/roadmaps.test.ts`:

```ts
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

  it('lists course summaries with lesson counts, newest first', async () => {
    const list = await listCourseSummaries(db(), USER_ID)
    expect(list).toHaveLength(4)
    expect(list[0]).toMatchObject({ lesson_count: 1 })
    expect(Object.keys(list[0]).sort()).toEqual(['created_at', 'description', 'id', 'lesson_count', 'title'])
  })
})
```

- [ ] **Step 5: Run, expect FAIL** (module not found): `npx vitest run test/roadmaps.test.ts` in `platform/worker`.

- [ ] **Step 6: Implement** `src/lib/roadmaps.ts`:

```ts
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
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

async function unknownCourses(db: Db, userId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const rows = await db.select({ id: courses.id }).from(courses)
    .where(and(eq(courses.user_id, userId), inArray(courses.id, ids)))
  const found = new Set(rows.map(row => row.id))
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
  const rows = await db.select().from(roadmaps).where(eq(roadmaps.user_id, userId)).orderBy(desc(roadmaps.created_at))
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
  const ids = cleanIds(input.course_ids)
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
  const filters = [inArray(roadmapCourses.course_id, courseIds)]
  if (exceptRoadmapId) filters.push(ne(roadmapCourses.roadmap_id, exceptRoadmapId))
  const rows = await db.selectDistinct({ id: roadmapCourses.roadmap_id }).from(roadmapCourses).where(and(...filters))
  return rows.map(row => row.id)
}

export async function deleteRoadmap(db: Db, userId: string, id: string, deleteCourses = false): Promise<{ deleted_roadmap: string; deleted_courses: number } | Failure> {
  if (!(await ownedRoadmap(db, userId, id))) return notFound(id)
  const ids = await memberIds(db, id)
  const toDelete = deleteCourses ? ids : []
  const affected = await otherRoadmapsHolding(db, toDelete, id)
  await db.batch([
    db.delete(roadmapCourses).where(eq(roadmapCourses.roadmap_id, id)),
    ...(toDelete.length > 0 ? [
      db.delete(roadmapCourses).where(inArray(roadmapCourses.course_id, toDelete)),
      db.delete(courseLessonProgress).where(and(eq(courseLessonProgress.user_id, userId), inArray(courseLessonProgress.course_id, toDelete))),
      db.delete(courses).where(and(eq(courses.user_id, userId), inArray(courses.id, toDelete))),
    ] : []),
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
```

If `db.batch` rejects the spread arrays for typing reasons, cast the array once with `as unknown as Parameters<Db['batch']>[0]` and keep the code otherwise as written.

- [ ] **Step 7: Run tests and checks.** `npx vitest run test/roadmaps.test.ts` then `npx tsc --noEmit` and `npm test` in `platform/worker`; all exit 0.

- [ ] **Step 8: Prove the tests bite.** Temporarily make `writeOrder` skip the `delete` statement; confirm a bookkeeping test fails; restore.

- [ ] **Step 9: Commit.** `git add platform/worker/drizzle/0006_roadmaps.sql platform/worker/src/db/schema.ts platform/worker/src/lib/roadmaps.ts platform/worker/test/helpers.ts platform/worker/test/roadmaps.test.ts` then commit "Add roadmaps tables and the roadmap library".

---

### Task 2: The eight MCP tools

**Files:**
- Modify: `src/lib/tools.ts`
- Create: `test/roadmapTools.test.ts`

**Interfaces:**
- Consumes: everything exported by `src/lib/roadmaps.ts` (Task 1).
- Produces tools (each `run(ctx, args)` returns the library result as JSON; a `Failure` is returned as `{ error }`):
  - `list_courses {}` → array from `listCourseSummaries`
  - `list_roadmaps {}` → array from `listRoadmaps`
  - `create_roadmap { title, description?, course_ids? }`
  - `update_roadmap { roadmap_id, title?, description? }`
  - `add_courses_to_roadmap { roadmap_id, course_ids, position? }`
  - `remove_courses_from_roadmap { roadmap_id, course_ids }`
  - `reorder_roadmap_courses { roadmap_id, course_ids }`
  - `delete_roadmap { roadmap_id, delete_courses? }`

- [ ] **Step 1: Failing tests.** `test/roadmapTools.test.ts`:

```ts
import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { TOOLS } from '../src/lib/tools'
import { callTool, personalToken, resetDb, seedCourse, seedUser } from './helpers'

describe('roadmap MCP tools', () => {
  let token: string

  beforeEach(async () => {
    await resetDb()
    await seedUser()
    token = await personalToken()
    for (const id of ['A', 'B', 'C', 'D']) await seedCourse(id)
  })

  it('registers the eight tools with a delete warning', () => {
    const names = TOOLS.map(t => t.name)
    for (const name of ['list_courses', 'list_roadmaps', 'create_roadmap', 'update_roadmap', 'add_courses_to_roadmap', 'remove_courses_from_roadmap', 'reorder_roadmap_courses', 'delete_roadmap']) {
      expect(names).toContain(name)
    }
    const del = TOOLS.find(t => t.name === 'delete_roadmap')!
    expect(del.description).toMatch(/permanent|for good/i)
    expect(JSON.stringify(del.inputSchema)).toMatch(/delete_courses/)
  })

  it('list_courses gives the AI the ids it needs', async () => {
    const list = await callTool(token, 'list_courses')
    expect(list).toHaveLength(4)
    expect(Object.keys(list[0]).sort()).toEqual(['created_at', 'description', 'id', 'lesson_count', 'title'])
  })

  it('creates a folder with or without courses', async () => {
    const empty = await callTool(token, 'create_roadmap', { title: 'Backend' })
    expect(empty.course_ids).toEqual([])
    const web = await callTool(token, 'create_roadmap', { title: 'Web', course_ids: ['B', 'A'] })
    expect(web.course_ids).toEqual(['B', 'A'])
    const listed = await callTool(token, 'list_roadmaps')
    expect(listed.map((r: { title: string }) => r.title).sort()).toEqual(['Backend', 'Web'])
  })

  it('add, remove and reorder keep the order consistent', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B', 'C'] })
    const added = await callTool(token, 'add_courses_to_roadmap', { roadmap_id: r.id, course_ids: ['D'], position: 1 })
    expect(added.course_ids).toEqual(['A', 'D', 'B', 'C'])
    const removed = await callTool(token, 'remove_courses_from_roadmap', { roadmap_id: r.id, course_ids: ['D'] })
    expect(removed.course_ids).toEqual(['A', 'B', 'C'])
    const reordered = await callTool(token, 'reorder_roadmap_courses', { roadmap_id: r.id, course_ids: ['C', 'A', 'B'] })
    expect(reordered.course_ids).toEqual(['C', 'A', 'B'])
  })

  it('reorder must name exactly the members', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B'] })
    const bad = await callTool(token, 'reorder_roadmap_courses', { roadmap_id: r.id, course_ids: ['A'] })
    expect(bad.error).toMatch(/missing/)
    const same = await callTool(token, 'list_roadmaps')
    expect(same[0].course_ids).toEqual(['A', 'B'])
  })

  it('unknown or foreign course ids fail the whole call', async () => {
    await seedUser('other')
    await seedCourse('theirs', 'other')
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A'] })
    for (const ids of [['B', 'nope'], ['theirs']]) {
      const res = await callTool(token, 'add_courses_to_roadmap', { roadmap_id: r.id, course_ids: ids })
      expect(res.error).toMatch(/Unknown course ids/)
    }
    const same = await callTool(token, 'list_roadmaps')
    expect(same[0].course_ids).toEqual(['A'])
  })

  it('update_roadmap changes title and keeps the courses', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'Old', course_ids: ['A'] })
    const updated = await callTool(token, 'update_roadmap', { roadmap_id: r.id, title: 'New' })
    expect(updated).toMatchObject({ title: 'New', course_ids: ['A'] })
    const empty = await callTool(token, 'update_roadmap', { roadmap_id: r.id })
    expect(empty.error).toMatch(/nothing to update/)
  })

  it('delete_roadmap keeps courses unless asked', async () => {
    const r = await callTool(token, 'create_roadmap', { title: 'R', course_ids: ['A', 'B'] })
    const kept = await callTool(token, 'delete_roadmap', { roadmap_id: r.id })
    expect(kept).toEqual({ deleted_roadmap: r.id, deleted_courses: 0 })
    expect(await callTool(token, 'list_courses')).toHaveLength(4)

    const r2 = await callTool(token, 'create_roadmap', { title: 'R2', course_ids: ['A', 'B'] })
    const gone = await callTool(token, 'delete_roadmap', { roadmap_id: r2.id, delete_courses: true })
    expect(gone).toEqual({ deleted_roadmap: r2.id, deleted_courses: 2 })
    expect(await callTool(token, 'list_courses')).toHaveLength(2)
  })

  it('another user\'s roadmap is not found', async () => {
    await seedUser('other')
    const otherToken = await personalToken('other')
    const r = await callTool(token, 'create_roadmap', { title: 'Mine', course_ids: ['A'] })
    for (const [name, args] of [
      ['update_roadmap', { roadmap_id: r.id, title: 'x' }],
      ['add_courses_to_roadmap', { roadmap_id: r.id, course_ids: ['A'] }],
      ['remove_courses_from_roadmap', { roadmap_id: r.id, course_ids: ['A'] }],
      ['reorder_roadmap_courses', { roadmap_id: r.id, course_ids: ['A'] }],
      ['delete_roadmap', { roadmap_id: r.id, delete_courses: true }],
    ] as const) {
      const res = await callTool(otherToken, name, args)
      expect(res.error).toMatch(/not found or not yours/)
    }
    expect(await callTool(otherToken, 'list_roadmaps')).toEqual([])
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(row?.n).toBe(4)
  })
})
```

- [ ] **Step 2: Run, expect FAIL** (tools unknown): `npx vitest run test/roadmapTools.test.ts`.

- [ ] **Step 3: Implement.** In `src/lib/tools.ts` add the import `import { addCourses, createRoadmap, deleteRoadmap, listCourseSummaries, listRoadmaps, removeCourses, reorderCourses, updateRoadmap } from './roadmaps'` and append these entries to `TOOLS` after `append_course_modules` (the library functions return `Failure | value`, which already is the JSON the tools should return):

```ts
  {
    name: 'list_courses',
    description: 'List the user\'s courses with id, title, description, lesson count and creation date. Use the ids with the roadmap tools.',
    inputSchema: { type: 'object', properties: {} },
    run: (ctx) => listCourseSummaries(ctx.db, ctx.userId),
  },
  {
    name: 'list_roadmaps',
    description: 'List the user\'s roadmaps. A roadmap is a folder that groups courses; each entry has id, title, description, created_at and course_ids in order.',
    inputSchema: { type: 'object', properties: {} },
    run: (ctx) => listRoadmaps(ctx.db, ctx.userId),
  },
  {
    name: 'create_roadmap',
    description: 'Create a roadmap, a folder that groups courses (for example "Backend with Python"). You decide what goes in it and in what order. course_ids is optional; use ids from list_courses. A course can be in several roadmaps.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '1-200 characters' },
        description: { type: 'string', description: 'At most 2000 characters (optional)' },
        course_ids: { type: 'array', items: { type: 'string' }, description: 'Course ids in order (optional, at most 100)' },
      },
      required: ['title'],
    },
    run: (ctx, args) => createRoadmap(ctx.db, ctx.userId, args),
  },
  {
    name: 'update_roadmap',
    description: 'Change a roadmap\'s title and/or description. Does not touch its courses. description: null clears it.',
    inputSchema: {
      type: 'object',
      properties: {
        roadmap_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: ['string', 'null'] },
      },
      required: ['roadmap_id'],
    },
    run: (ctx, args) => updateRoadmap(ctx.db, ctx.userId, String(args.roadmap_id ?? ''), args),
  },
  {
    name: 'add_courses_to_roadmap',
    description: 'Add courses to a roadmap. Appends at the end, or inserts at position (0-based). Ids already in the roadmap are ignored. If any id is unknown or not the user\'s the whole call fails and nothing changes.',
    inputSchema: {
      type: 'object',
      properties: {
        roadmap_id: { type: 'string' },
        course_ids: { type: 'array', items: { type: 'string' } },
        position: { type: 'integer', minimum: 0 },
      },
      required: ['roadmap_id', 'course_ids'],
    },
    run: (ctx, args) => addCourses(ctx.db, ctx.userId, String(args.roadmap_id ?? ''), args.course_ids, args.position),
  },
  {
    name: 'remove_courses_from_roadmap',
    description: 'Remove courses from a roadmap. Only the link is removed; the courses themselves stay.',
    inputSchema: {
      type: 'object',
      properties: { roadmap_id: { type: 'string' }, course_ids: { type: 'array', items: { type: 'string' } } },
      required: ['roadmap_id', 'course_ids'],
    },
    run: (ctx, args) => removeCourses(ctx.db, ctx.userId, String(args.roadmap_id ?? ''), args.course_ids),
  },
  {
    name: 'reorder_roadmap_courses',
    description: 'Set the order of a roadmap\'s courses. course_ids must be exactly the current members, each once, in the new order; otherwise the call fails and the order stays.',
    inputSchema: {
      type: 'object',
      properties: { roadmap_id: { type: 'string' }, course_ids: { type: 'array', items: { type: 'string' } } },
      required: ['roadmap_id', 'course_ids'],
    },
    run: (ctx, args) => reorderCourses(ctx.db, ctx.userId, String(args.roadmap_id ?? ''), args.course_ids),
  },
  {
    name: 'delete_roadmap',
    description: 'Delete a roadmap. By default only the folder is deleted and its courses stay. With delete_courses: true the roadmap\'s courses are deleted too, with their lesson progress and their links in other roadmaps. This is permanent and cannot be undone; use delete_courses: true only when the user clearly asked for the courses to be deleted.',
    inputSchema: {
      type: 'object',
      properties: {
        roadmap_id: { type: 'string' },
        delete_courses: { type: 'boolean', description: 'Default false. true deletes the courses for good.' },
      },
      required: ['roadmap_id'],
    },
    run: (ctx, args) => deleteRoadmap(ctx.db, ctx.userId, String(args.roadmap_id ?? ''), args.delete_courses === true),
  },
```

If the `ToolDef`/`run` type in `tools.ts` requires a `Json` return, wrap with `as unknown as Json` or widen the return type of `run` to `Promise<unknown> | unknown` the way the other tools do; do not change any existing tool.

- [ ] **Step 4: Run.** `npx vitest run test/roadmapTools.test.ts`, then `npx tsc --noEmit` and `npm test`; all exit 0. The existing test `lists every registered tool` keeps passing because it compares against `TOOLS.length`.

- [ ] **Step 5: Commit.** `git add platform/worker/src/lib/tools.ts platform/worker/test/roadmapTools.test.ts` then commit "Add the roadmap MCP tools for the AI".

---

### Task 3: Routes for the app

**Files:**
- Create: `src/routes/roadmaps.ts`, `test/roadmapRoutes.test.ts`
- Modify: `src/routes/courses.ts`, `src/index.ts`

**Interfaces:**
- Consumes: `listRoadmaps`, `deleteRoadmap`, `deleteCourse`, `failed` from `../lib/roadmaps`.
- Produces: `GET /roadmaps` → `RoadmapOut[]`; `DELETE /roadmaps/:id?delete_courses=true|false` → `{ deleted_roadmap, deleted_courses }` or 404 `{ detail }`; `DELETE /courses/:id` → `{ deleted_course }` or 404 `{ detail }`. Both require auth.

- [ ] **Step 1: Failing tests.** `test/roadmapRoutes.test.ts`:

```ts
import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import { USER_ID, anon, authed, callTool, jwtFor, personalToken, resetDb, seedCourse, seedUser } from './helpers'

async function makeRoadmap(token: string, title: string, ids: string[]): Promise<{ id: string }> {
  return await callTool(token, 'create_roadmap', { title, course_ids: ids })
}

describe('roadmap routes', () => {
  let token: string

  beforeEach(async () => {
    await resetDb()
    await seedUser()
    token = await personalToken()
    for (const id of ['A', 'B', 'C']) await seedCourse(id)
  })

  it('requires a login', async () => {
    expect((await anon('/roadmaps')).status).toBe(401)
    expect((await anon('/roadmaps/x', { method: 'DELETE' })).status).toBe(401)
    expect((await anon('/courses/A', { method: 'DELETE' })).status).toBe(401)
  })

  it('lists the user\'s roadmaps with ordered course ids', async () => {
    const r = await makeRoadmap(token, 'Backend', ['B', 'A'])
    const res = await authed('/roadmaps')
    expect(res.status).toBe(200)
    const rows = await res.json<Array<{ id: string; title: string; course_ids: string[] }>>()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: r.id, title: 'Backend', course_ids: ['B', 'A'] })
  })

  it('deleting a roadmap keeps its courses by default', async () => {
    const r = await makeRoadmap(token, 'R', ['A', 'B'])
    const res = await authed(`/roadmaps/${r.id}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted_roadmap: r.id, deleted_courses: 0 })
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(count?.n).toBe(3)
  })

  it('delete_courses=true deletes the courses too', async () => {
    const r = await makeRoadmap(token, 'R', ['A', 'B'])
    const res = await authed(`/roadmaps/${r.id}?delete_courses=true`, { method: 'DELETE' })
    expect(await res.json()).toEqual({ deleted_roadmap: r.id, deleted_courses: 2 })
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(count?.n).toBe(1)
  })

  it('another user gets 404 and nothing changes', async () => {
    await seedUser('other')
    const r = await makeRoadmap(token, 'Mine', ['A'])
    const otherJwt = await jwtFor('other')
    expect((await authed(`/roadmaps/${r.id}?delete_courses=true`, { method: 'DELETE', token: otherJwt })).status).toBe(404)
    expect((await authed('/courses/A', { method: 'DELETE', token: otherJwt })).status).toBe(404)
    expect(await (await authed('/roadmaps', { token: otherJwt })).json()).toEqual([])
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM courses').first<{ n: number }>()
    expect(count?.n).toBe(3)
  })

  it('an unknown roadmap or course is a 404', async () => {
    expect((await authed('/roadmaps/nope', { method: 'DELETE' })).status).toBe(404)
    expect((await authed('/courses/nope', { method: 'DELETE' })).status).toBe(404)
  })

  it('DELETE /courses/:id removes progress and every roadmap link, and compacts', async () => {
    const one = await makeRoadmap(token, 'One', ['A', 'B', 'C'])
    await env.DB.prepare("INSERT INTO course_lesson_progress (user_id, course_id, lesson_key) VALUES (?, 'B', '0-0')").bind(USER_ID).run()
    const res = await authed('/courses/B', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ deleted_course: 'B' })
    const progress = await env.DB.prepare("SELECT COUNT(*) AS n FROM course_lesson_progress WHERE course_id = 'B'").first<{ n: number }>()
    expect(progress?.n).toBe(0)
    const rows = await (await authed('/roadmaps')).json<Array<{ id: string; course_ids: string[] }>>()
    expect(rows.find(r => r.id === one.id)?.course_ids).toEqual(['A', 'C'])
    const list = await (await authed('/courses')).json<Array<{ id: string }>>()
    expect(list.map(c => c.id).sort()).toEqual(['A', 'C'])
  })
})
```

- [ ] **Step 2: Run, expect FAIL** (404 on `/roadmaps`): `npx vitest run test/roadmapRoutes.test.ts`.

- [ ] **Step 3: Implement.** `src/routes/roadmaps.ts`:

```ts
import { Hono } from 'hono'
import { getDb } from '../db'
import { deleteRoadmap, failed, listRoadmaps } from '../lib/roadmaps'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const router = new Hono<AppEnv>()

router.get('/', requireAuth, async (c) => {
  return c.json(await listRoadmaps(getDb(c.env), c.get('userId')))
})

router.delete('/:id', requireAuth, async (c) => {
  const deleteCourses = c.req.query('delete_courses') === 'true'
  const result = await deleteRoadmap(getDb(c.env), c.get('userId'), c.req.param('id'), deleteCourses)
  if (failed(result)) return c.json({ detail: result.error }, 404)
  return c.json(result)
})

export default router
```

In `src/routes/courses.ts` add `import { deleteCourse, failed } from '../lib/roadmaps'` and before `export default router`:

```ts
router.delete('/:id', requireAuth, async (c) => {
  const result = await deleteCourse(getDb(c.env), c.get('userId'), c.req.param('id'))
  if (failed(result)) return c.json({ detail: result.error }, 404)
  return c.json(result)
})
```

In `src/index.ts` add `import roadmapsRoutes from './routes/roadmaps'` next to the other route imports and `app.route('/roadmaps', roadmapsRoutes)` after `app.route('/courses', coursesRoutes)`.

- [ ] **Step 4: Run.** `npx vitest run test/roadmapRoutes.test.ts`, then in `platform/worker` `npx tsc --noEmit` and `npm test`; all exit 0.

- [ ] **Step 5: Commit.** `git add platform/worker/src/routes/roadmaps.ts platform/worker/src/routes/courses.ts platform/worker/src/index.ts platform/worker/test/roadmapRoutes.test.ts` then commit "Add the roadmap list and delete routes".

---

## Self-Review

- **Spec coverage:** tables and indexes (Task 1), every library rule and the nine "worker scenarios" of the spec (Tasks 1-3 tests: create, add/remove/reorder, reorder exactness, unknown/foreign ids, update, delete keeps/deletes courses, other users, `DELETE /courses/:id`, `list_courses`), eight tools (Task 2), `GET /roadmaps`, `DELETE /roadmaps/:id`, `DELETE /courses/:id` (Task 3). Frontend is Part 3b.
- **Placeholders:** none; full code for the library, tools, routes and tests.
- **Types:** `Failure`, `failed`, `RoadmapOut` and the function signatures are defined in Task 1 and used with the same names in Tasks 2-3.
- **Review Focus:** foreign ids, reorder exactness, course deletion cascade and compaction, atomic batches, the 100 limits, blank titles and `description: null` all have a test.
