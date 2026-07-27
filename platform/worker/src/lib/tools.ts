/**
 * Tool registry shared by the MCP server (/mcp) and the in-app chat (/chat).
 * One definition, two transports — a tool added here shows up in both.
 */
import { and, count, eq, gte } from 'drizzle-orm'
import { getDb } from '../db'
import {
  agentInsights, books, courses, dailyProgress, exercises, submissions, testCases,
  userProfiles, users,
} from '../db/schema'
import { awardHonor } from './honor'
import { recordAttempt } from './progress'
import { honorToRank } from './rank'
import type { Env } from '../types'

export interface ToolCtx {
  db: ReturnType<typeof getDb>
  env: Env
  userId: string
}

type Json = Record<string, unknown>

const parse = <T>(raw: unknown, fallback: T): T => {
  try { return JSON.parse((raw as string) ?? '') as T } catch { return fallback }
}

const today = () => new Date().toISOString().split('T')[0]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

async function loadUser(ctx: ToolCtx) {
  const [user] = await ctx.db.select().from(users).where(eq(users.id, ctx.userId)).limit(1)
  return user
}

async function streakDays(ctx: ToolCtx): Promise<number> {
  const rows = await ctx.db.select().from(dailyProgress)
    .where(and(eq(dailyProgress.user_id, ctx.userId), gte(dailyProgress.date, daysAgo(29))))
  const byDate = new Map(rows.map(r => [r.date, r.exercises_completed]))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    if ((byDate.get(daysAgo(i)) ?? 0) > 0) streak++
    else break
  }
  return streak
}

// ─── Tools ────────────────────────────────────────────────────────────────────

async function getContext(ctx: ToolCtx): Promise<Json> {
  const user = await loadUser(ctx)
  const [{ total }] = await ctx.db.select({ total: count() }).from(exercises)
  const [profile] = await ctx.db.select().from(userProfiles)
    .where(eq(userProfiles.user_id, ctx.userId)).limit(1)

  const profile_summary: Json = profile?.baseline_done
    ? (() => {
        const gaps = parse<Json[]>(profile.gaps, [])
        return {
          baseline_done: true,
          gaps_count: gaps.length,
          top_gaps: gaps.filter(g => Number(g.severity ?? 1) >= 2).map(g => g.concept).slice(0, 3),
          strengths_count: parse<unknown[]>(profile.strengths, []).length,
          recommendations_pending: parse<unknown[]>(profile.recommendations, []).length,
        }
      })()
    : {
        baseline_done: false,
        tip: 'No profile yet. Conduct a brief diagnostic (3-5 open questions about code/concepts) then call create_profile() to enable personalization.',
      }

  return {
    user: user?.name ?? 'unknown',
    rank: honorToRank(user?.honor ?? 0),
    honor: user?.honor ?? 0,
    streak_days: await streakDays(ctx),
    total_exercises_available: total,
    profile_summary,
    tip: 'Use get_exercises() to browse katas or get_exercise(slug) to start one.',
  }
}

async function getExercises(ctx: ToolCtx, args: Json): Promise<Json[]> {
  const difficulty = args.difficulty as string | undefined
  const tag = args.tag as string | undefined

  const rows = await ctx.db.select().from(exercises)
    .where(difficulty ? eq(exercises.difficulty, difficulty) : undefined)
    .orderBy(exercises.difficulty)

  return rows
    .map(ex => ({ ...ex, tagList: parse<string[]>(ex.tags, []) }))
    .filter(ex => !tag || ex.tagList.includes(tag))
    .map(ex => ({
      slug: ex.slug, title: ex.title, difficulty: ex.difficulty,
      tags: ex.tagList, module: ex.module,
    }))
}

async function getExercise(ctx: ToolCtx, args: Json): Promise<Json> {
  const slug = String(args.slug ?? '')
  const [ex] = await ctx.db.select().from(exercises).where(eq(exercises.slug, slug)).limit(1)
  if (!ex) return { error: `Exercise '${slug}' not found` }

  const cases = await ctx.db.select().from(testCases)
    .where(and(eq(testCases.exercise_id, ex.id), eq(testCases.visible, true)))
    .orderBy(testCases.order)

  return {
    slug: ex.slug, title: ex.title, difficulty: ex.difficulty,
    tags: parse<string[]>(ex.tags, []), module: ex.module,
    description: ex.description, stub: ex.stub, hints: parse<string[]>(ex.hints, []),
    test_cases: cases.map(tc => ({
      order: tc.order, description: tc.description, input: tc.input, expected: tc.expected,
    })),
  }
}

async function submitSolution(ctx: ToolCtx, args: Json): Promise<Json> {
  const slug = String(args.slug ?? '')
  const passed = Boolean(args.passed)
  const results = (args.test_results ?? []) as Json[]

  const [ex] = await ctx.db.select().from(exercises).where(eq(exercises.slug, slug)).limit(1)
  if (!ex) return { error: `Exercise '${slug}' not found` }

  const passedCount = results.filter(r => r.passed).length
  const status = passed ? 'passed' : passedCount > 0 ? 'partial' : 'failed'

  await ctx.db.insert(submissions).values({
    id: crypto.randomUUID(),
    user_id: ctx.userId,
    exercise_id: ex.id,
    code: String(args.code ?? ''),
    status,
    test_results: JSON.stringify(results),
    submitted_at: new Date().toISOString(),
  })

  const gain = passed ? await awardHonor(ctx.db, ctx.userId, ex.difficulty) : 0
  await recordAttempt(ctx.db, ctx.userId, passed)

  const user = await loadUser(ctx)
  return {
    status,
    passed: passedCount,
    total: results.length,
    honor_gained: gain,
    new_rank: honorToRank(user?.honor ?? 0),
    message: passed ? '✓ Solução aceita!' : `${passedCount}/${results.length} testes passaram`,
  }
}

async function getProgress(ctx: ToolCtx): Promise<Json> {
  const user = await loadUser(ctx)
  const rows = await ctx.db.select().from(dailyProgress)
    .where(and(eq(dailyProgress.user_id, ctx.userId), gte(dailyProgress.date, daysAgo(6))))
  const [{ total }] = await ctx.db.select({ total: count() }).from(submissions)
    .where(and(eq(submissions.user_id, ctx.userId), eq(submissions.status, 'passed')))

  return {
    rank: honorToRank(user?.honor ?? 0),
    honor: user?.honor ?? 0,
    completed_last_7_days: rows.reduce((s, r) => s + r.exercises_completed, 0),
    total_passed: total,
    daily: rows.map(r => ({ date: r.date, completed: r.exercises_completed })),
  }
}

async function getBooks(ctx: ToolCtx): Promise<Json[]> {
  const rows = await ctx.db.select().from(books).where(eq(books.user_id, ctx.userId))
  return rows.map(b => ({
    slug: b.slug, title: b.title, author: b.author,
    type: b.content_type, has_text: Boolean(b.text_path),
  }))
}

function profileToJson(p: typeof userProfiles.$inferSelect): Json {
  return {
    baseline_done: Boolean(p.baseline_done),
    strengths: parse<unknown[]>(p.strengths, []),
    gaps: parse<unknown[]>(p.gaps, []),
    level: parse<Json>(p.level, {}),
    style: parse<Json>(p.style, {}),
    notes: parse<unknown[]>(p.notes, []),
    recommendations: parse<unknown[]>(p.recommendations, []),
    updated_at: p.updated_at,
  }
}

async function getProfile(ctx: ToolCtx): Promise<Json> {
  const [p] = await ctx.db.select().from(userProfiles)
    .where(eq(userProfiles.user_id, ctx.userId)).limit(1)
  if (!p) {
    return {
      baseline_done: false,
      tip: 'No profile exists yet. Run a diagnostic assessment (3-5 open questions) then call create_profile() with your observations.',
    }
  }
  return profileToJson(p)
}

async function createProfile(ctx: ToolCtx, args: Json): Promise<Json> {
  const now = new Date().toISOString()
  const values = {
    baseline_done: true,
    strengths: JSON.stringify(args.strengths ?? []),
    gaps: JSON.stringify(args.gaps ?? []),
    level: JSON.stringify(args.level ?? {}),
    style: JSON.stringify(args.style ?? {}),
    notes: JSON.stringify(args.notes ?? []),
    recommendations: JSON.stringify(args.recommendations ?? []),
    updated_at: now,
  }

  await ctx.db.insert(userProfiles)
    .values({ id: crypto.randomUUID(), user_id: ctx.userId, created_at: now, ...values })
    .onConflictDoUpdate({ target: userProfiles.user_id, set: values })

  return {
    message: 'Profile created/updated. Baseline done.',
    gaps: ((args.gaps ?? []) as unknown[]).length,
    strengths: ((args.strengths ?? []) as unknown[]).length,
  }
}

const PROFILE_FIELDS = ['strengths', 'gaps', 'level', 'style', 'notes', 'recommendations'] as const
type ProfileField = typeof PROFILE_FIELDS[number]

async function updateProfile(ctx: ToolCtx, args: Json): Promise<Json> {
  const field = String(args.field ?? '') as ProfileField
  if (!PROFILE_FIELDS.includes(field)) {
    return { error: `Unknown field '${field}'. Allowed: ${PROFILE_FIELDS.join(', ')}` }
  }
  const [p] = await ctx.db.select().from(userProfiles)
    .where(eq(userProfiles.user_id, ctx.userId)).limit(1)
  if (!p) return { error: 'No profile yet. Call create_profile() first.' }

  await ctx.db.update(userProfiles)
    .set({ [field]: JSON.stringify(args.data ?? null), updated_at: new Date().toISOString() })
    .where(eq(userProfiles.user_id, ctx.userId))

  return { message: `Profile.${field} updated.`, baseline_done: Boolean(p.baseline_done) }
}

async function addProfileNote(ctx: ToolCtx, args: Json): Promise<Json> {
  const [p] = await ctx.db.select().from(userProfiles)
    .where(eq(userProfiles.user_id, ctx.userId)).limit(1)
  if (!p) return { error: 'No profile yet. Call create_profile() first.' }

  const notes = parse<Json[]>(p.notes, [])
  notes.push({
    text: String(args.text ?? ''),
    category: String(args.category ?? 'session'),
    date: new Date().toISOString(),
  })

  await ctx.db.update(userProfiles)
    .set({ notes: JSON.stringify(notes), updated_at: new Date().toISOString() })
    .where(eq(userProfiles.user_id, ctx.userId))

  return { message: 'Note added.', total_notes: notes.length }
}

/** Extracted book text lives in R2 as one JSON object per page. */
async function readBookPage(ctx: ToolCtx, slug: string, page: number) {
  const obj = await ctx.env.BOOKS.get(`${ctx.userId}/${slug}/text/page-${page}.json`)
  if (!obj) return null
  return await obj.json<{ page: number; text: string }>()
}

async function ownedBook(ctx: ToolCtx, slug: string) {
  const [book] = await ctx.db.select().from(books)
    .where(and(eq(books.slug, slug), eq(books.user_id, ctx.userId))).limit(1)
  return book
}

async function getBookContent(ctx: ToolCtx, args: Json): Promise<Json> {
  const slug = String(args.slug ?? '')
  const page = Number(args.page ?? 1)
  const book = await ownedBook(ctx, slug)
  if (!book) return { error: `Book '${slug}' not found or not yours` }
  if (!book.text_path) return { error: "Text not extracted yet — ask the user to open the book and click 'Texto'" }

  const entry = await readBookPage(ctx, slug, page)
  if (!entry) return { error: `Page ${page} not found` }
  return { slug, page, text: entry.text }
}

const SEARCH_PAGE_LIMIT = 400
const SEARCH_MATCH_LIMIT = 10

async function searchBook(ctx: ToolCtx, args: Json): Promise<Json> {
  const slug = String(args.slug ?? '')
  const query = String(args.query ?? '')
  const book = await ownedBook(ctx, slug)
  if (!book) return { error: `Book '${slug}' not found or not yours` }
  if (!book.text_path) return { error: 'Text not extracted yet' }
  if (!query) return { error: 'Empty query' }

  const needle = query.toLowerCase()
  const matches: Json[] = []

  for (let page = 1; page <= SEARCH_PAGE_LIMIT && matches.length < SEARCH_MATCH_LIMIT; page++) {
    const entry = await readBookPage(ctx, slug, page)
    if (!entry) break
    const idx = entry.text.toLowerCase().indexOf(needle)
    if (idx === -1) continue
    const start = Math.max(0, idx - 120)
    const end = Math.min(entry.text.length, idx + query.length + 120)
    matches.push({
      page,
      excerpt: (start > 0 ? '…' : '') + entry.text.slice(start, end).trim() + (end < entry.text.length ? '…' : ''),
    })
  }

  return { slug, query, matches, count: matches.length }
}

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

async function createExercise(ctx: ToolCtx, args: Json): Promise<Json> {
  const title = String(args.title ?? '')
  const base = slugify(title)
  let slug = base
  for (let n = 1; ; n++) {
    const [taken] = await ctx.db.select({ id: exercises.id }).from(exercises)
      .where(eq(exercises.slug, slug)).limit(1)
    if (!taken) break
    slug = `${base}-${n}`
  }

  const id = crypto.randomUUID()
  const difficulty = String(args.difficulty ?? '7kyu')

  await ctx.db.insert(exercises).values({
    id,
    title,
    slug,
    difficulty,
    phase: 0,
    module: 'ai-generated',
    tags: JSON.stringify(args.tags ?? []),
    description: String(args.description ?? ''),
    rationale: 'AI-generated exercise',
    stub: String(args.stub ?? ''),
    solution: '',
    hints: JSON.stringify(args.hints ?? []),
    concepts: JSON.stringify(args.concepts ?? []),
    generated_by: 'chat-ai',
    book_reference: (args.book_reference as string) ?? null,
    user_id: ctx.userId,
  })

  const cases = (args.test_cases ?? []) as Json[]
  if (cases.length) {
    await ctx.db.insert(testCases).values(cases.map((tc, i) => ({
      exercise_id: id,
      order: i,
      description: String(tc.description ?? `Test ${i + 1}`),
      input: String(tc.input ?? ''),
      expected: String(tc.expected ?? ''),
      visible: tc.visible === undefined ? true : Boolean(tc.visible),
    })))
  }

  return { slug, title, difficulty, message: 'Exercise created!' }
}

async function createCourse(ctx: ToolCtx, args: Json): Promise<Json> {
  const id = crypto.randomUUID()
  const modules = (args.modules ?? []) as unknown[]
  const is_complete = Boolean(args.is_complete)

  await ctx.db.insert(courses).values({
    id,
    user_id: ctx.userId,
    title: String(args.title ?? ''),
    book_slug: (args.book_slug as string) ?? null,
    description: String(args.description ?? ''),
    modules: JSON.stringify(modules),
    is_complete,
  })

  return {
    id,
    title: args.title,
    module_count: modules.length,
    is_complete,
    message: is_complete
      ? 'Course created!'
      : 'Course created! Use append_course_modules to add more modules later.',
  }
}

async function appendCourseModules(ctx: ToolCtx, args: Json): Promise<Json> {
  const course_id = String(args.course_id ?? '')
  const [course] = await ctx.db.select().from(courses)
    .where(and(eq(courses.id, course_id), eq(courses.user_id, ctx.userId))).limit(1)
  if (!course) return { error: `Course '${course_id}' not found or not yours` }

  const merged = [...parse<unknown[]>(course.modules, []), ...((args.modules ?? []) as unknown[])]
  const is_complete = Boolean(args.is_complete)

  await ctx.db.update(courses)
    .set({ modules: JSON.stringify(merged), is_complete })
    .where(eq(courses.id, course_id))

  return {
    id: course_id,
    title: course.title,
    total_modules: merged.length,
    is_complete,
    message: 'Modules appended.' + (is_complete ? ' Course marked complete.' : ' Still in progress.'),
  }
}

const MIN_ATTEMPTS_FOR_SIGNAL = 5

/** Pass rate per concept — the signal the daily agent calibrates on. */
async function getAnalytics(ctx: ToolCtx): Promise<Json> {
  const rows = await ctx.db
    .select({ concepts: exercises.concepts, status: submissions.status })
    .from(submissions)
    .innerJoin(exercises, eq(submissions.exercise_id, exercises.id))
    .where(eq(submissions.user_id, ctx.userId))

  const stats = new Map<string, { attempted: number; passed: number }>()
  for (const row of rows) {
    for (const concept of parse<string[]>(row.concepts, [])) {
      const s = stats.get(concept) ?? { attempted: 0, passed: 0 }
      s.attempted++
      if (row.status === 'passed') s.passed++
      stats.set(concept, s)
    }
  }

  const concepts = [...stats.entries()]
    .map(([concept, s]) => ({
      concept,
      attempted: s.attempted,
      passed: s.passed,
      rate: s.attempted ? s.passed / s.attempted : 0,
      reliable: s.attempted >= MIN_ATTEMPTS_FOR_SIGNAL,
    }))
    .sort((a, b) => a.rate - b.rate)

  return {
    concepts,
    gaps: concepts.filter(c => c.reliable && c.rate < 0.6).map(c => c.concept),
    strengths: concepts.filter(c => c.reliable && c.rate >= 0.8).map(c => c.concept),
    note: `Concepts with fewer than ${MIN_ATTEMPTS_FOR_SIGNAL} attempts are marked reliable:false — treat them as no signal.`,
  }
}

async function writeInsight(ctx: ToolCtx, args: Json): Promise<Json> {
  await ctx.db.insert(agentInsights).values({
    id: crypto.randomUUID(),
    user_id: ctx.userId,
    message: String(args.message ?? ''),
    highlights: JSON.stringify(args.highlights ?? []),
    gaps: JSON.stringify(args.gaps ?? []),
    generated_at: new Date().toISOString(),
  })
  return { message: 'Insight saved. It will show on the dashboard.' }
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface ToolDef {
  name: string
  description: string
  inputSchema: Json
  run: (ctx: ToolCtx, args: Json) => Promise<unknown>
}

export const TOOLS: ToolDef[] = [
  {
    name: 'get_context',
    description: 'Get your current learning context: rank, honor, streak, and platform overview. Call this at the start of every session.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    run: getContext,
  },
  {
    name: 'get_exercises',
    description: 'List available katas. Filter by difficulty (8kyu–3kyu) or tag (python, fastapi, http, sql, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        difficulty: { type: 'string', description: '8kyu | 7kyu | 6kyu | 5kyu | 4kyu | 3kyu' },
        tag: { type: 'string' },
      },
    },
    run: getExercises,
  },
  {
    name: 'get_exercise',
    description: 'Get full exercise details: description, starter code, visible test cases, and hints.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
    run: getExercise,
  },
  {
    name: 'submit_solution',
    description: 'Record a solution and its test results to the platform. Run tests locally first.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        code: { type: 'string', description: 'Final Python solution' },
        passed: { type: 'boolean', description: 'True if ALL tests passed' },
        test_results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              passed: { type: 'boolean' },
              input: { type: 'string' },
              expected: { type: 'string' },
              got: { type: 'string' },
            },
            required: ['passed'],
          },
        },
      },
      required: ['slug', 'code', 'passed', 'test_results'],
    },
    run: submitSolution,
  },
  {
    name: 'get_progress',
    description: 'Get your rank, honor, completed exercises in the last 7 days, and daily breakdown.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    run: getProgress,
  },
  {
    name: 'get_analytics',
    description: 'Pass rate per concept, plus the concepts that qualify as gaps (<60%) and strengths (>=80%). Only concepts with at least 5 attempts carry signal. Use this to calibrate what to generate next.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    run: getAnalytics,
  },
  {
    name: 'write_insight',
    description: 'Save a short message for the user to see on their dashboard. Use at the end of a daily agent cycle.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '1-2 direct sentences. Mention streak if > 0 and the most critical gap.' },
        highlights: { type: 'array', items: { type: 'string' }, description: 'Concepts being mastered (max 3)' },
        gaps: { type: 'array', items: { type: 'string' }, description: 'Concepts needing attention (max 3)' },
      },
      required: ['message'],
    },
    run: writeInsight,
  },
  {
    name: 'get_books',
    description: 'List your books on the platform (PDF and Markdown).',
    inputSchema: { type: 'object', properties: {}, required: [] },
    run: getBooks,
  },
  {
    name: 'get_profile',
    description: "Get the user's learning profile: strengths, gaps (with severity), level per concept, reasoning style, notes, and personalized recommendations. Call this at the start of every session. If baseline_done is false, conduct a diagnostic assessment first and then call create_profile().",
    inputSchema: { type: 'object', properties: {}, required: [] },
    run: getProfile,
  },
  {
    name: 'create_profile',
    description: "Create or fully replace the user's learning profile (the 'model zero'). Call this after conducting a diagnostic assessment. Sets baseline_done=true. Idempotent — safe to call again if you need to overwrite.",
    inputSchema: {
      type: 'object',
      properties: {
        strengths: { type: 'array', description: 'Observed strengths. Each item: {concept, evidence, observed_at}', items: { type: 'object' } },
        gaps: { type: 'array', description: "Identified gaps. Each item: {concept, type: 'wrong_concept'|'missing_vocab'|'fundament_gap', severity: 1|2|3 (1=minor, 2=important, 3=critical), evidence, last_seen}", items: { type: 'object' } },
        level: { type: 'object', description: 'Per-concept level. {concept: {score: 0.0-1.0, attempts: int, last_updated: iso}}' },
        style: { type: 'object', description: "Learning style. {reasoning: 'pragmatic|intuitive|theoretical', engagement: 'active|passive', attention: 'short|long', ...}" },
        notes: { type: 'array', description: "Initial observations. Each item: {text, category: 'quiz'|'session'|'code_review'|'daily_agent', date}", items: { type: 'object' } },
        recommendations: { type: 'array', description: "Personalized content suggestions. Each item: {type: 'book'|'exercise'|'course'|'topic', ref, reason, created_at}", items: { type: 'object' } },
      },
      required: ['strengths', 'gaps', 'level', 'style', 'notes', 'recommendations'],
    },
    run: createProfile,
  },
  {
    name: 'update_profile',
    description: "Replace one field of the user's profile. Use this to keep the profile up to date after sessions or in the daily agent cycle. field must be one of: strengths, gaps, level, style, notes, recommendations.",
    inputSchema: {
      type: 'object',
      properties: {
        field: { type: 'string', description: 'strengths | gaps | level | style | notes | recommendations' },
        data: { description: 'New value for the field (replaces the existing value entirely).' },
      },
      required: ['field', 'data'],
    },
    run: updateProfile,
  },
  {
    name: 'add_profile_note',
    description: 'Append a single observation to the profile notes without replacing the whole list. Use during a session when you notice something significant.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The observation text' },
        category: { type: 'string', description: 'session | quiz | code_review | daily_agent' },
      },
      required: ['text', 'category'],
    },
    run: addProfileNote,
  },
  {
    name: 'get_book_content',
    description: 'Read a specific page of extracted text from one of your books. Use get_books() first to see available books and whether text has been extracted.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Book slug from get_books()' },
        page: { type: 'integer', description: 'Page number (1-indexed)' },
      },
      required: ['slug', 'page'],
    },
    run: getBookContent,
  },
  {
    name: 'search_book',
    description: 'Search for a keyword or phrase across the pages of one of your books. Returns up to 10 matching pages with excerpts.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Book slug' },
        query: { type: 'string', description: 'Search term or phrase' },
      },
      required: ['slug', 'query'],
    },
    run: searchBook,
  },
  {
    name: 'create_exercise',
    description: 'Create a personalized kata/exercise for the user and save it to the platform. The user will see it in their exercise list.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string', description: 'Full problem statement in Markdown' },
        difficulty: { type: 'string', description: '8kyu | 7kyu | 6kyu | 5kyu | 4kyu | 3kyu' },
        tags: { type: 'array', items: { type: 'string' }, description: 'e.g. ["fastapi", "http"]' },
        stub: { type: 'string', description: 'Starter code the user sees' },
        test_cases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              input: { type: 'string' },
              expected: { type: 'string' },
              visible: { type: 'boolean' },
            },
            required: ['description', 'input', 'expected'],
          },
        },
        hints: { type: 'array', items: { type: 'string' } },
        concepts: { type: 'array', items: { type: 'string' }, description: 'e.g. ["fastapi:routing", "http:status-codes"]' },
        book_reference: { type: 'string', description: 'Book slug this exercise is based on (optional)' },
      },
      required: ['title', 'description', 'difficulty', 'tags', 'stub', 'test_cases'],
    },
    run: createExercise,
  },
  {
    name: 'create_course',
    description: 'Create a personalized course for the user. Courses can be created incrementally — set is_complete=false to leave it open for more modules later (use append_course_modules). The module format is flexible; use whatever structure best serves the content.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        book_slug: { type: 'string', description: 'Book the course is based on (optional)' },
        description: { type: 'string' },
        modules: { type: 'array', description: 'Initial list of course modules. Format is flexible.', items: { type: 'object' } },
        is_complete: { type: 'boolean', description: 'False = course is still being built (default). True = all modules are ready.' },
      },
      required: ['title', 'description', 'modules'],
    },
    run: createCourse,
  },
  {
    name: 'append_course_modules',
    description: 'Add more modules to an existing in-progress course. Use the course id returned by create_course.',
    inputSchema: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Course id from create_course' },
        modules: { type: 'array', description: 'New modules to append. Same flexible format as create_course.', items: { type: 'object' } },
        is_complete: { type: 'boolean', description: 'Set true to mark the course as finished after this append.' },
      },
      required: ['course_id', 'modules', 'is_complete'],
    },
    run: appendCourseModules,
  },
]

const BY_NAME = new Map(TOOLS.map(t => [t.name, t]))

export async function dispatch(name: string, args: Json, ctx: ToolCtx): Promise<unknown> {
  const tool = BY_NAME.get(name)
  if (!tool) return { error: `Unknown tool: ${name}` }
  return await tool.run(ctx, args ?? {})
}
