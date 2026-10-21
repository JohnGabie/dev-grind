# Courses Search, Sorters and Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a search box, three sorters and four views (cards, lista, grade, galeria) to the Courses list, with the view and sorter remembered per device.

**Architecture:** One pure module `src/lib/courseView.ts` does the text matching, sorting and the stored preferences, tested with `node --test`. Three small presentational components draw the extra views next to the existing `CourseCard`; `CourseList` picks the layout for the chosen view; `CourseToolbar` holds the search box, the sorter and the view switch. `CoursesPage` keeps the query in state and the preferences in a small hook. No worker change: `GET /courses` already returns `created_at`.

**Tech Stack:** React 19, react-router-dom, Vite, TypeScript; tests with `node --experimental-strip-types --test`.

**Spec:** `docs/superpowers/specs/2026-10-21-courses.md`, Part 2 (approved by João on 2026-10-21). Its Part 2 Acceptance scenarios are the final check (Task 5). Part 3 (roadmaps) gets its own plans and will reuse the toolbar and the views.

## Global Constraints

- English for code, comments and commits. User-visible strings stay Portuguese exactly: `Padrão`, `Mais recentes`, `Nome A-Z`, `Progresso`, `cards`, `lista`, `grade`, `galeria`, `limpar busca`, `Nenhum curso encontrado para “<text>”` (curly quotes), search placeholder `buscar cursos`.
- Inside `src/lib/`, value imports between modules use the `.ts` extension (`./courseProgress.ts`) because `node --test` runs them without a bundler. Type-only imports can omit it. Outside `lib/`, imports stay extension-less like the rest of the app.
- Do not touch `platform/worker`, `LessonPlayer`, `SkillPath`, `lib/skillPath.ts`, `lib/courseProgress.ts`, or the existing behavior of `CourseCard` (it is the `cards` view as it is).
- JetBrains Mono only. On mobile use tokens (`--fs-*`, `--ctl-*`, `--sp-*`, `--radius-*`); inputs and selects use `var(--fs-input)` on mobile (no iOS zoom); every control at least `var(--ctl-md)` high on mobile. No glow, blur or gradients.
- Defaults: view `cards`, sorter `default` (shown as `Padrão`). Storage keys: `devgrind.courses.view` and `devgrind.courses.sort`. Every `localStorage` access is in try/catch and the page works without it. The search text is never stored.
- Commit per task, explicit staging, English imperative subject ≤ 72 chars, no amend, no `--no-verify`. Stay on `feat/course-lesson-progress`.
- Models: Sonnet for Tasks 1-4; final review of the whole diff on Opus.

## Review Focus

- Stored garbage (`localStorage` has `view=banana`, or access throws): falls back to `cards` and `default`, never crashes.
- Search with only spaces, with accents (`introducao` finds `Introdução`), with regex characters (`c++`, `(`): matches literally and never throws.
- A course without `created_at` sorts last under `Mais recentes`; equal values keep the input order (stable).
- `Progresso` with total 0 (no NaN) and ties broken by title.
- Gallery ring and thin bars with total 0: no NaN, no overflow.
- Long titles and descriptions in the 2-column grid at 320px: ellipsis or clamp, no horizontal page scroll.
- Switching view or sorter keeps the search text; searching in `default` order keeps the group order.
- An action button inside a clickable tile/row must not also trigger the tile's open (no double navigation).

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/courseModel.ts` | Add optional `created_at` to `Course` and read it in `asCourse` |
| `src/lib/courseView.ts` (new) | Pure: `normalizeText`, `matchesQuery`, `sortCourses`, `visibleCourses`, `loadPrefs`, `savePrefs`, `VIEWS`, `SORTS` |
| `src/lib/courseView.test.ts` (new) | `node --test` for the module above |
| `src/components/ProgressBar.tsx` (new) | Thin bar used by the row and the tile |
| `src/components/CourseRow.tsx` (new) | `lista` view item |
| `src/components/CourseTile.tsx` (new) | `grade` view item |
| `src/components/CourseGalleryTile.tsx` (new) | `galeria` view item with the progress ring |
| `src/components/CourseList.tsx` (new) | Picks the layout and item component for the chosen view |
| `src/components/CourseToolbar.tsx` (new) | Search box, sorter select, four-button view switch |
| `src/hooks/useCoursePrefs.ts` (new) | Preferences state backed by `loadPrefs`/`savePrefs` |
| `src/pages/CoursesPage.tsx` | Query state, toolbar, filtered list, no-match message |
| `package.json` | Add `src/lib/courseView.test.ts` to the `test` script |

Paths are relative to `platform/frontend/`.

---

### Task 1: Creation date on the course model

**Files:**
- Modify: `src/lib/courseModel.ts`, `src/lib/courseModel.test.ts`

**Interfaces:**
- Produces: `Course.created_at?: string`; `asCourse` fills it from `row.created_at` when it is a non-empty string.

- [ ] **Step 1: Failing test.** In `courseModel.test.ts`, inside `describe('asCourse', ...)`, add two tests using the same minimal valid row shape the file already uses (one module, one lesson with one `text` step):

```ts
  it('keeps created_at when the row has it', () => {
    const course = asCourse({
      id: 'c1', title: 'T', description: null, completed_lessons: [], created_at: '2026-10-01 10:00:00',
      modules: [{ title: 'S', lessons: [{ title: 'L', steps: [{ type: 'text', body: 'x' }] }] }],
    })
    assert.equal(course?.created_at, '2026-10-01 10:00:00')
  })
  it('leaves created_at undefined when the row has none', () => {
    const course = asCourse({
      id: 'c1', title: 'T', description: null, completed_lessons: [],
      modules: [{ title: 'S', lessons: [{ title: 'L', steps: [{ type: 'text', body: 'x' }] }] }],
    })
    assert.equal(course?.created_at, undefined)
  })
```

- [ ] **Step 2: Run, expect FAIL.** `node --experimental-strip-types --test src/lib/courseModel.test.ts` (first new test fails: `undefined`).

- [ ] **Step 3: Implement.** In `courseModel.ts` add `created_at?: string` to `interface Course` and, in the object returned by `asCourse`, add `created_at: typeof row.created_at === 'string' && row.created_at ? row.created_at : undefined,`.

- [ ] **Step 4: Verify.** `npm test` and `npx tsc -b`, exit 0.

- [ ] **Step 5: Commit.** `git add platform/frontend/src/lib/courseModel.ts platform/frontend/src/lib/courseModel.test.ts` then commit "Carry the course creation date into the client model".

---

### Task 2: Pure search, sort and preferences module

**Files:**
- Create: `src/lib/courseView.ts`, `src/lib/courseView.test.ts`
- Modify: `package.json` (append ` src/lib/courseView.test.ts` to the `test` script)

**Interfaces:**
- Consumes: `Course` (type) from `./courseModel`; `courseProgress`, `orderCourses` from `./courseProgress.ts`.
- Produces:
  - `type ViewKey = 'cards' | 'lista' | 'grade' | 'galeria'`, `type SortKey = 'default' | 'recent' | 'name' | 'progress'`
  - `VIEWS: ViewKey[]`, `SORTS: { key: SortKey; label: string }[]`
  - `normalizeText(text: string): string`
  - `matchesQuery(item: { title: string; description?: string | null }, query: string): boolean`
  - `sortCourses<T extends Course>(courses: T[], key: SortKey): T[]` (stable, does not mutate)
  - `visibleCourses<T extends Course>(courses: T[], query: string, key: SortKey): T[]`
  - `interface CoursePrefs { view: ViewKey; sort: SortKey }`, `DEFAULT_PREFS`
  - `loadPrefs(storage: Pick<Storage, 'getItem'> | null): CoursePrefs`, `savePrefs(storage: Pick<Storage, 'setItem'> | null, prefs: CoursePrefs): void`

- [ ] **Step 1: Failing tests.** `src/lib/courseView.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Course } from './courseModel.ts'
import { DEFAULT_PREFS, loadPrefs, matchesQuery, normalizeText, savePrefs, sortCourses, visibleCourses } from './courseView.ts'

function make(id: string, title: string, done: number, total: number, created_at?: string, description: string | null = null): Course {
  return {
    id, title, description, created_at,
    completed: Array.from({ length: done }, (_, i) => `0-${i}`),
    parts: {},
    sections: [{
      title: 'S',
      lessons: Array.from({ length: total }, (_, i) => ({ title: `L${i}`, description: '', optional: false, steps: [], sectionIndex: 0, lessonIndex: i })),
    }],
  }
}

const ids = (list: Course[]) => list.map(c => c.id)

describe('normalizeText and matchesQuery', () => {
  it('ignores case, accents and surrounding spaces', () => {
    assert.equal(normalizeText('  Introdução À Árvore '), 'introducao a arvore')
    assert.equal(matchesQuery({ title: 'Banco', description: 'Introdução a Banco de Dados' }, 'INTRODUCAO'), true)
  })
  it('matches title or description, not the join of both', () => {
    assert.equal(matchesQuery({ title: 'abc', description: 'def' }, 'c d'), false)
    assert.equal(matchesQuery({ title: 'abc', description: 'def' }, 'def'), true)
  })
  it('an empty or blank query matches everything', () => {
    assert.equal(matchesQuery({ title: 'x' }, ''), true)
    assert.equal(matchesQuery({ title: 'x' }, '   '), true)
  })
  it('treats regex characters literally', () => {
    assert.equal(matchesQuery({ title: 'C++ basics' }, 'c++'), true)
    assert.equal(matchesQuery({ title: 'abc' }, '('), false)
  })
})

describe('sortCourses', () => {
  const html = make('html', 'HTML', 5, 5, '2026-10-01 10:00:00')
  const git = make('git', 'Git', 0, 3, '2026-10-03 10:00:00')
  const py = make('py', 'Python', 2, 4, '2026-10-02 10:00:00')
  it('default is em andamento, não iniciado, concluído', () => {
    assert.deepEqual(ids(sortCourses([html, git, py], 'default')), ['py', 'git', 'html'])
  })
  it('recent is newest created first; missing dates go last', () => {
    const none = make('none', 'None', 0, 1)
    assert.deepEqual(ids(sortCourses([html, none, git, py], 'recent')), ['git', 'py', 'html', 'none'])
  })
  it('name is alphabetical, accent and case insensitive, numeric aware', () => {
    const a = make('a', 'água', 0, 1), b = make('b', 'Banco', 0, 1), c10 = make('c10', 'Curso 10', 0, 1), c2 = make('c2', 'Curso 2', 0, 1)
    assert.deepEqual(ids(sortCourses([c10, b, c2, a], 'name')), ['a', 'b', 'c2', 'c10'])
  })
  it('progress is highest percentage first, ties by title, total 0 is 0%', () => {
    const half = make('half', 'Zeta', 1, 2), half2 = make('half2', 'Alfa', 2, 4), empty = make('empty', 'Vazio', 0, 0), full = make('full', 'Cheio', 3, 3)
    assert.deepEqual(ids(sortCourses([empty, half, full, half2], 'progress')), ['full', 'half2', 'half', 'empty'])
  })
  it('keeps the input order for equal keys and does not mutate', () => {
    const list = [make('a', 'Same', 0, 1, '2026-10-01'), make('b', 'Same', 0, 1, '2026-10-01')]
    const before = ids(list)
    assert.deepEqual(ids(sortCourses(list, 'name')), ['a', 'b'])
    assert.deepEqual(ids(sortCourses(list, 'recent')), ['a', 'b'])
    assert.deepEqual(ids(list), before)
  })
})

describe('visibleCourses', () => {
  it('filters then sorts', () => {
    const list = [make('b', 'Backend', 0, 1), make('a', 'Algoritmos', 0, 1), make('p', 'Python', 0, 1)]
    assert.deepEqual(ids(visibleCourses(list, 'a', 'name')), ['a', 'b'])
  })
  it('a query with no match gives an empty list', () => {
    assert.deepEqual(visibleCourses([make('a', 'A', 0, 1)], 'zzzz', 'default'), [])
  })
})

describe('preferences', () => {
  const store = (initial: Record<string, string> = {}) => {
    const data = { ...initial }
    return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v } }
  }
  it('defaults when storage is empty or missing', () => {
    assert.deepEqual(loadPrefs(store()), DEFAULT_PREFS)
    assert.deepEqual(loadPrefs(null), DEFAULT_PREFS)
  })
  it('round-trips a saved choice', () => {
    const s = store()
    savePrefs(s, { view: 'lista', sort: 'name' })
    assert.deepEqual(loadPrefs(s), { view: 'lista', sort: 'name' })
  })
  it('falls back per field when a stored value is garbage', () => {
    const s = store({ 'devgrind.courses.view': 'banana', 'devgrind.courses.sort': 'progress' })
    assert.deepEqual(loadPrefs(s), { view: 'cards', sort: 'progress' })
  })
  it('never throws when storage throws', () => {
    const boom = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    assert.deepEqual(loadPrefs(boom), DEFAULT_PREFS)
    assert.doesNotThrow(() => savePrefs(boom, DEFAULT_PREFS))
  })
})
```

- [ ] **Step 2: Run, expect FAIL** (cannot find `./courseView.ts`): `node --experimental-strip-types --test src/lib/courseView.test.ts`.

- [ ] **Step 3: Implement** `src/lib/courseView.ts`:

```ts
import type { Course } from './courseModel'
import { courseProgress, orderCourses } from './courseProgress.ts'

export type ViewKey = 'cards' | 'lista' | 'grade' | 'galeria'
export type SortKey = 'default' | 'recent' | 'name' | 'progress'

export const VIEWS: ViewKey[] = ['cards', 'lista', 'grade', 'galeria']
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Padrão' },
  { key: 'recent', label: 'Mais recentes' },
  { key: 'name', label: 'Nome A-Z' },
  { key: 'progress', label: 'Progresso' },
]

export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function matchesQuery(item: { title: string; description?: string | null }, query: string): boolean {
  const q = normalizeText(query)
  if (!q) return true
  return normalizeText(item.title).includes(q) || normalizeText(item.description ?? '').includes(q)
}

function percentOf(course: Course): number {
  const { done, total } = courseProgress(course)
  return total > 0 ? done / total : 0
}

const byTitle = (a: Course, b: Course) => a.title.localeCompare(b.title, 'pt', { sensitivity: 'base', numeric: true })

export function sortCourses<T extends Course>(courses: T[], key: SortKey): T[] {
  if (key === 'default') return orderCourses(courses)
  const indexed = courses.map((course, index) => ({ course, index }))
  indexed.sort((a, b) => {
    if (key === 'name') return byTitle(a.course, b.course) || a.index - b.index
    if (key === 'progress') return percentOf(b.course) - percentOf(a.course) || byTitle(a.course, b.course) || a.index - b.index
    const ca = a.course.created_at ?? ''
    const cb = b.course.created_at ?? ''
    if (ca !== cb) {
      if (!ca) return 1
      if (!cb) return -1
      return ca < cb ? 1 : -1
    }
    return a.index - b.index
  })
  return indexed.map(entry => entry.course)
}

export function visibleCourses<T extends Course>(courses: T[], query: string, key: SortKey): T[] {
  return sortCourses(courses.filter(course => matchesQuery(course, query)), key)
}

export interface CoursePrefs { view: ViewKey; sort: SortKey }
export const DEFAULT_PREFS: CoursePrefs = { view: 'cards', sort: 'default' }

const VIEW_KEY = 'devgrind.courses.view'
const SORT_KEY = 'devgrind.courses.sort'

export function loadPrefs(storage: Pick<Storage, 'getItem'> | null): CoursePrefs {
  try {
    const view = storage?.getItem(VIEW_KEY)
    const sort = storage?.getItem(SORT_KEY)
    return {
      view: VIEWS.includes(view as ViewKey) ? (view as ViewKey) : DEFAULT_PREFS.view,
      sort: SORTS.some(item => item.key === sort) ? (sort as SortKey) : DEFAULT_PREFS.sort,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(storage: Pick<Storage, 'setItem'> | null, prefs: CoursePrefs): void {
  try {
    storage?.setItem(VIEW_KEY, prefs.view)
    storage?.setItem(SORT_KEY, prefs.sort)
  } catch { /* storage is unavailable */ }
}
```

- [ ] **Step 4: Register and run.** Append ` src/lib/courseView.test.ts` to the `test` script in `package.json`. Run `npm test` and `npx tsc -b`, exit 0.

- [ ] **Step 5: Prove the tests bite.** Temporarily change `normalizeText` to drop `.toLowerCase()`; confirm `ignores case, accents and surrounding spaces` fails; restore.

- [ ] **Step 6: Commit.** `git add platform/frontend/src/lib/courseView.ts platform/frontend/src/lib/courseView.test.ts platform/frontend/package.json` then commit "Add pure course search, sorting and view preferences".

---

### Task 3: The extra views

**Files:**
- Create: `src/components/ProgressBar.tsx`, `src/components/CourseRow.tsx`, `src/components/CourseTile.tsx`, `src/components/CourseGalleryTile.tsx`, `src/components/CourseList.tsx`

**Interfaces:**
- Consumes: `courseProgress`, `actionLabel`, `CourseState` from `../lib/courseProgress`; `ViewKey` from `../lib/courseView`; `Course`; the existing `CourseCard` (`{ course, onOpen, onAction }`).
- Produces: `CourseList` props `{ courses: Course[]; view: ViewKey; onOpen: (course: Course) => void; onAction: (course: Course) => void }`. Row, Tile and GalleryTile take `{ course, onOpen, onAction }` (Tile ignores `onAction`; it has no action button).

Shared look: the state colours come from the same map as `CourseCard` (`não iniciado` muted, `em andamento` cyan, `concluído` green). Put that map in `ProgressBar.tsx` as `export const STATE_COLOR` and import it in the three new components (do not edit `CourseCard`).

- [ ] **Step 1: ProgressBar and the state colours.** `src/components/ProgressBar.tsx`:

```tsx
import type { CourseState } from '../lib/courseProgress'

export const STATE_COLOR: Record<CourseState, string> = {
  'não iniciado': 'var(--muted)',
  'em andamento': 'var(--cyan)',
  'concluído': 'var(--green)',
}

export function percentOf(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export default function ProgressBar({ done, total, label, done100 }: { done: number; total: number; label: string; done100: boolean }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}
    >
      <div style={{ height: '100%', width: `${percentOf(done, total)}%`, background: done100 ? 'var(--green)' : 'var(--cyan)' }} />
    </div>
  )
}
```

- [ ] **Step 2: CourseRow (`lista`).** One row: left column (title with ellipsis, thin bar, `done/total · state`), right the action button. The whole row opens the map; the title is a `button` without its own `onClick` (the click bubbles to the row, so it fires once); the action button stops propagation.

```tsx
import type { Course } from '../lib/courseModel'
import { actionLabel, courseProgress } from '../lib/courseProgress'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import ProgressBar, { STATE_COLOR } from './ProgressBar'

export default function CourseRow({ course, onOpen, onAction }: { course: Course; onOpen: () => void; onAction: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state } = courseProgress(course)
  const size = isMobile ? 'var(--fs-base)' : undefined
  return (
    <div
      className="card"
      onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 640, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', boxSizing: 'border-box' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-lg)' : 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {course.title}
        </button>
        <div style={{ margin: '6px 0' }}>
          <ProgressBar done={done} total={total} label={`${course.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
        </div>
        <span style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12 }}>
          <span>{done}/{total}</span>
          <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onAction() }}
        style={{ background: 'none', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', fontSize: size, padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32, whiteSpace: 'nowrap' }}
      >
        {actionLabel(state)}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: CourseTile (`grade`).** Compact tile, no action button: title clamped to 2 lines, thin bar, `done/total`. Same click rules.

```tsx
import type { Course } from '../lib/courseModel'
import { courseProgress } from '../lib/courseProgress'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import ProgressBar, { STATE_COLOR } from './ProgressBar'

export default function CourseTile({ course, onOpen }: { course: Course; onOpen: () => void; onAction?: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state } = courseProgress(course)
  return (
    <div
      className="card"
      onClick={onOpen}
      style={{ minWidth: 0, padding: '12px 14px', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <button
        type="button"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-base)' : 14, overflowWrap: 'anywhere' }}
      >
        {course.title}
      </button>
      <ProgressBar done={done} total={total} label={`${course.title}: ${done} de ${total} lições`} done100={state === 'concluído'} />
      <span style={{ fontSize: isMobile ? 'var(--fs-sm)' : 12, color: STATE_COLOR[state] }}>{done}/{total}</span>
    </div>
  )
}
```

- [ ] **Step 4: CourseGalleryTile (`galeria`).** Large tile: progress ring (64px SVG, percent in the centre), title, description (clamped to 3 lines), `done de total lições · state`, action button. Ring uses `r=26`, circumference `2*Math.PI*26`, dash from `percentOf`; track `rgba(255,255,255,0.12)`, stroke cyan or green when `concluído`; no NaN when total is 0.

```tsx
import type { Course } from '../lib/courseModel'
import { actionLabel, courseProgress } from '../lib/courseProgress'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import { STATE_COLOR, percentOf } from './ProgressBar'

const RADIUS = 26
const CIRC = 2 * Math.PI * RADIUS

export default function CourseGalleryTile({ course, onOpen, onAction }: { course: Course; onOpen: () => void; onAction: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state } = courseProgress(course)
  const percent = percentOf(done, total)
  const size = isMobile ? 'var(--fs-base)' : undefined
  return (
    <div
      className="card"
      onClick={onOpen}
      style={{ minWidth: 0, padding: '20px', cursor: 'pointer', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${percent}%`} style={{ flexShrink: 0 }}>
          <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={RADIUS} fill="none" strokeWidth="6" strokeLinecap="round"
            stroke={state === 'concluído' ? 'var(--green)' : 'var(--cyan)'}
            strokeDasharray={`${(CIRC * percent) / 100} ${CIRC}`}
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="36" textAnchor="middle" fontSize="13" fontFamily="var(--font)" fill="var(--text)">{percent}%</text>
        </svg>
        <button
          type="button"
          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: isMobile ? 'var(--fs-lg)' : 18, overflowWrap: 'anywhere' }}
        >
          {course.title}
        </button>
      </div>
      {course.description && (
        <span style={{ color: 'var(--muted)', fontSize: size, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.description}</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: size }}>
          <span>{done} de {total} lições</span>
          <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
        </span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onAction() }}
          style={{ background: 'none', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', fontSize: size, padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32, whiteSpace: 'nowrap' }}
        >
          {actionLabel(state)}
        </button>
      </div>
    </div>
  )
}
```

Check that the font variable name matches the project (`grep -n "\-\-font" src/index.css`; the app uses `var(--font)` and `var(--f-mono)`); use whichever the neighbouring SVG/text code uses.

- [ ] **Step 5: CourseList.** One component that picks the layout:

```tsx
import type { Course } from '../lib/courseModel'
import type { ViewKey } from '../lib/courseView'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import CourseCard from './CourseCard'
import CourseGalleryTile from './CourseGalleryTile'
import CourseRow from './CourseRow'
import CourseTile from './CourseTile'

interface Props {
  courses: Course[]
  view: ViewKey
  onOpen: (course: Course) => void
  onAction: (course: Course) => void
}

export default function CourseList({ courses, view, onOpen, onAction }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const grid = (columns: string) => ({ display: 'grid', gridTemplateColumns: columns, gap: 12, width: '100%' })

  if (view === 'grade') {
    return (
      <div style={grid(isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))')}>
        {courses.map(course => <CourseTile key={course.id} course={course} onOpen={() => onOpen(course)} />)}
      </div>
    )
  }
  if (view === 'galeria') {
    return (
      <div style={grid(isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))')}>
        {courses.map(course => <CourseGalleryTile key={course.id} course={course} onOpen={() => onOpen(course)} onAction={() => onAction(course)} />)}
      </div>
    )
  }
  const Item = view === 'lista' ? CourseRow : CourseCard
  return (
    <div>
      {courses.map(course => <Item key={course.id} course={course} onOpen={() => onOpen(course)} onAction={() => onAction(course)} />)}
    </div>
  )
}
```

- [ ] **Step 6: Verify.** `npx tsc -b`, `npm test`, `npm run build`, exit 0. Nothing renders these components yet; Task 4 wires them.

- [ ] **Step 7: Commit.** `git add platform/frontend/src/components/ProgressBar.tsx platform/frontend/src/components/CourseRow.tsx platform/frontend/src/components/CourseTile.tsx platform/frontend/src/components/CourseGalleryTile.tsx platform/frontend/src/components/CourseList.tsx` then commit "Add the lista, grade and galeria course views".

---

### Task 4: Toolbar and page integration

**Files:**
- Create: `src/components/CourseToolbar.tsx`, `src/hooks/useCoursePrefs.ts`
- Modify: `src/pages/CoursesPage.tsx` (list block only)

**Interfaces:**
- Consumes: `VIEWS`, `SORTS`, `loadPrefs`, `savePrefs`, `visibleCourses`, `ViewKey`, `SortKey`, `CoursePrefs` from `../lib/courseView`; `CourseList`.
- Produces: `useCoursePrefs(): { prefs: CoursePrefs; setView: (v: ViewKey) => void; setSort: (s: SortKey) => void }`; `CourseToolbar` props `{ query: string; onQuery: (q: string) => void; sort: SortKey; onSort: (s: SortKey) => void; view: ViewKey; onView: (v: ViewKey) => void; placeholder: string }`.

- [ ] **Step 1: Hook.** `src/hooks/useCoursePrefs.ts`:

```ts
import { useCallback, useState } from 'react'
import { loadPrefs, savePrefs, type CoursePrefs, type SortKey, type ViewKey } from '../lib/courseView'

function storage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export function useCoursePrefs() {
  const [prefs, setPrefs] = useState<CoursePrefs>(() => loadPrefs(storage()))
  const update = useCallback((next: CoursePrefs) => { setPrefs(next); savePrefs(storage(), next) }, [])
  return {
    prefs,
    setView: (view: ViewKey) => update({ ...prefs, view }),
    setSort: (sort: SortKey) => update({ ...prefs, sort }),
  }
}
```

- [ ] **Step 2: Toolbar.** Search input (`type="search"`, `aria-label="buscar cursos"`, placeholder from props, a `limpar` text button inside the field shown only when there is text, which clears the query), a native `<select>` for the sorter (`aria-label="ordenar"`), and a `role="group"` `aria-label="visualização"` with four buttons (`aria-pressed`, `aria-label` and `title` = the view name, inline SVG icons: cards = stacked rounded rectangles, lista = three horizontal lines, grade = four squares, galeria = one large square with a small one under it). Layout: search full width on its own row; below it the select (flex 1) and the view group. Mobile sizes: control height `var(--ctl-md)`, font `var(--fs-input)` for the input and select, radius `var(--radius-lg)`; desktop: height 36, font 13. Active view button: `1px solid var(--cyan)` and cyan icon; inactive: `1px solid var(--border)` and muted icon. Colours only from tokens. Container `maxWidth: 640` on cards/lista is not applied here; the toolbar is `width: 100%` with `marginBottom: 16`.

- [ ] **Step 3: Page.** In `CoursesPage.tsx` add imports (`CourseList`, `CourseToolbar`, `useCoursePrefs`, `visibleCourses`), then `const { prefs, setView, setSort } = useCoursePrefs()` and `const [query, setQuery] = useState('')` next to the other hooks (before any early return). Replace the `!courseId && orderCourses(courses).map(...)` block with:

```tsx
        {!courseId && courses.length > 0 && (
          <CourseToolbar query={query} onQuery={setQuery} sort={prefs.sort} onSort={setSort} view={prefs.view} onView={setView} placeholder="buscar cursos" />
        )}

        {!courseId && courses.length > 0 && (() => {
          const shown = visibleCourses(courses, query, prefs.sort)
          if (shown.length === 0) {
            return (
              <div role="status">
                <p style={{ color: 'var(--muted)', margin: '0 0 8px' }}>Nenhum curso encontrado para “{query.trim()}”</p>
                <button type="button" onClick={() => setQuery('')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32 }}>
                  limpar busca
                </button>
              </div>
            )
          }
          return (
            <CourseList
              courses={shown}
              view={prefs.view}
              onOpen={item => navigate(`/courses/${item.id}`)}
              onAction={item => {
                const key = continueTarget(item)
                navigate(key ? `/courses/${item.id}/${key}` : `/courses/${item.id}`)
              }}
            />
          )
        })()}
```

Remove the now-unused `CourseCard` and `orderCourses` imports from the page if tsc/eslint flags them (`CourseList` imports `CourseCard` itself). Keep `continueTarget`.

- [ ] **Step 4: Verify.** `npx tsc -b`, `npm test`, `npm run build`, exit 0. Browser at 390x844 and 1280x800 with a mocked `GET /api/courses` of 3 courses: typing filters live; the sorter and the four views change the list; reload keeps view and sorter but empties the search; with garbage `localStorage` (`devgrind.courses.view=banana`) the page opens on `cards`; at 320x568 the `grade` view has no horizontal scroll; pressing an action button in `lista` and `galeria` navigates once (check `history.length` grows by one, or that the URL is the lesson). Look at a screenshot of each view.

- [ ] **Step 5: Commit.** `git add platform/frontend/src/components/CourseToolbar.tsx platform/frontend/src/hooks/useCoursePrefs.ts platform/frontend/src/pages/CoursesPage.tsx` then commit "Add course search, sorters and view switch to the Courses list".

---

### Task 5: Run the Part 2 Acceptance scenarios

**Files:** none (verification; screenshots go under `.playwright-mcp/`, not committed).

- [ ] **Step 1: Servers.** Reuse running ones or start `npm run dev` in `platform/worker` and `platform/frontend`. Touch files if the page is blank.
- [ ] **Step 2: Mock data.** With `browser_run_code_unsafe`, route `**/api/courses` (GET only) to three courses with different progress and creation dates (`created_at` such as `2026-10-01 10:00:00`), one with the description `Introdução a Banco de Dados`. `page.unrouteAll()` between scenarios.
- [ ] **Step 3: Run every `Scenario` in the spec's "Part 2 acceptance" block** at 390x844 and at 1280x800 (the `@mobile` ones at 390 only; the gallery column check at both). Measure columns with `getComputedStyle(grid).gridTemplateColumns` and horizontal overflow with `document.documentElement.scrollWidth > innerWidth`. Record PASS/FAIL with one line of evidence each.
- [ ] **Step 4: Edge checks** from Review Focus: garbage storage, `c++` and `(` in the search, only-spaces query, a course with no `created_at`, 320x568 grid, long titles.
- [ ] **Step 5: Final checks.** `npx tsc -b`, `npm run build`, `npm test` in `platform/frontend`; `npx tsc --noEmit` and `npm test` in `platform/worker`. Exit 0 for all.
- [ ] **Step 6: Report.** One row per scenario, the edge checks, the commands with exit codes, and anything not verified. A failed scenario is fixed in the task that owns it.

---

## Self-Review

- **Spec coverage:** search (T2, T4), sorters incl. default (T2, T4), four views (T3, T4), remembered choices (T2, T4), `created_at` (T1; the worker already returns it), touch targets and aria (T3, T4 constraints). Not included, by design: roadmaps and their tab (Part 3).
- **Placeholders:** none; Task 4 step 2 describes the toolbar's look instead of code because it is pure markup with the listed attributes and tokens; the implementer writes it from that list.
- **Types:** `ViewKey`, `SortKey`, `CoursePrefs`, `visibleCourses`, `loadPrefs`, `savePrefs` are defined in Task 2 and used with the same names in Tasks 3-4; `CourseList` props match the page call.
- **Review Focus:** garbage storage, regex characters, blank query, missing date, total 0 and stability are tests in Task 2; layout and double-navigation are browser checks in Tasks 4-5.
