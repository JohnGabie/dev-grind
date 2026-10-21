# Courses Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a course usable from the Courses page: progress and state on each card, a continue button, the open course and lesson in the URL, an honest empty state, and a mobile layout that hides the bottom menu inside a course and moves the AI button to the top.

**Architecture:** One pure module `src/lib/courseProgress.ts` computes progress, state, the continue target, the list order and the "inside a course" route test, tested with `node --test`. `CoursesPage` stops keeping the open course and lesson in React state and reads them from one splat route `courses/*`, so navigating between list, map and lesson does not remount the page or refetch. A new `CourseCard` draws the card. `AppLayout` hides `MobileNav` and `ChatBubble` moves to the top on course routes. No worker, schema or `modules` change.

**Tech Stack:** React 19, react-router-dom, Vite, TypeScript; tests with `node --experimental-strip-types --test`.

**Spec:** `docs/superpowers/specs/2026-10-21-courses.md`, Part 1 only (approved by João on 2026-10-21). Its Part 1 Acceptance scenarios are the final check (Task 5). Parts 2 and 3 get their own plans.

## Global Constraints

- English for code, comments and commits; user-visible strings stay Portuguese exactly as in the spec: `não iniciado`, `em andamento`, `concluído`, `continuar`, `começar`, `revisar`, `curso não encontrado`, `lição não encontrada`, `Nenhum curso ainda.`, `Não foi possível carregar os cursos.`, `tentar de novo`.
- Do not touch `platform/worker`, the `modules` JSON, `LessonPlayer` internals, `SkillPath`, or `lib/skillPath.ts`.
- JetBrains Mono only; use tokens (`--fs-*`, `--ctl-*`, `--sp-*`, `--radius-*`) on mobile, as the surrounding code does.
- Lesson key stays `${sectionIndex}-${lessonIndex}` using the original indices (holes allowed).
- "Go back" in the scenarios means the on-screen back button (`← cursos` from the map, `← <course title>` from a lesson), which goes to the parent address. Browser back also works because every move is a `navigate` push.
- Commit per task, explicit staging, English imperative subject ≤ 72 chars, no amend, no `--no-verify`. Work stays on `feat/course-lesson-progress` (or a `feat/courses-home` branch cut from it; the executor chooses and says which).
- Models: Sonnet for Tasks 1-4; the final review of the whole diff on Opus.

## Review Focus

- A course whose only lessons are optional and undone: total is 0, shows `0 de 0` and `não iniciado`, must not crash or show NaN% in the bar.
- A `completed` key that no lesson has (a lesson was removed from the course): ignored in progress.
- A lesson with started parts but none completed: `em andamento`, not `não iniciado`.
- Lesson holes (lesson `0-1` missing because it had no valid step): continue target uses real keys, never an index guess.
- Opening `/courses/<id>` while `GET /courses` is still loading: shows `Carregando…`, not "curso não encontrado".
- Finishing the last step of a lesson (`onComplete` then `onBack`) lands on the course map, not the list.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/courseProgress.ts` (new) | Pure: `lessonKeyOf`, `courseProgress`, `continueTarget`, `orderCourses`, `actionLabel`, `isInsideCourse` |
| `src/lib/courseProgress.test.ts` (new) | `node --test` for the module above |
| `src/components/CourseCard.tsx` (new) | One list card: title, description, bar, count, state, action button |
| `src/components/CourseNotFound.tsx` (new) | Labelled "not found" notice with a link back |
| `src/pages/CoursesPage.tsx` | Reads course and lesson from the URL, renders list / map / lesson / notices |
| `src/App.tsx` | Route `courses/*` |
| `src/components/layout/AppLayout.tsx` | Hide `MobileNav` in a course; `ChatBubble` as a top square |
| `src/components/SkillPath.contract.test.ts` | Update the page assertions that this refactor moves |
| `package.json` | Add `src/lib/courseProgress.test.ts` to the `test` script |

Paths are relative to `platform/frontend/`.

---

### Task 1: Pure course progress module

**Files:**
- Create: `src/lib/courseProgress.ts`, `src/lib/courseProgress.test.ts`
- Modify: `package.json` (append the test file to the `test` script)

**Interfaces:**
- Consumes: `Course` from `./courseModel` (type-only import).
- Produces:
  - `type CourseState = 'não iniciado' | 'em andamento' | 'concluído'`
  - `lessonKeyOf(l: { sectionIndex: number; lessonIndex: number }): string`
  - `courseProgress(course: Course): { done: number; total: number; state: CourseState }`
  - `continueTarget(course: Course): string | null` (a lesson key, or `null` when every required lesson is done)
  - `orderCourses<T extends Course>(courses: T[]): T[]` (does not mutate)
  - `actionLabel(state: CourseState): 'começar' | 'continuar' | 'revisar'`
  - `isInsideCourse(pathname: string): boolean`

Rules: `total` counts required lessons plus optional lessons that are completed; `done` counts completed lessons that exist in the course; `state` is `concluído` when `total > 0 && done >= total`, else `em andamento` when `done > 0` or any `parts` value is `> 0`, else `não iniciado`. `continueTarget` is the first lesson, in section then lesson order, that is not optional and not completed. `orderCourses` sorts em andamento, então não iniciado, então concluído, keeping the input order inside a group. `isInsideCourse` is true for `/courses/<something>` and false for `/courses`, `/courses/` and other paths.

- [ ] **Step 1: Write the failing tests**

`src/lib/courseProgress.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Course } from './courseModel.ts'
import { actionLabel, continueTarget, courseProgress, isInsideCourse, lessonKeyOf, orderCourses } from './courseProgress.ts'

function makeCourse(id: string, lessons: { optional?: boolean; lessonIndex?: number }[], completed: string[], parts: Record<string, number> = {}): Course {
  return {
    id,
    title: id,
    description: null,
    completed,
    parts,
    sections: [{
      title: 'S',
      lessons: lessons.map((l, i) => ({
        title: `L${i}`, description: '', optional: l.optional === true, steps: [],
        sectionIndex: 0, lessonIndex: l.lessonIndex ?? i,
      })),
    }],
  }
}

const required = (n: number) => Array.from({ length: n }, () => ({}))
const keys = (n: number) => Array.from({ length: n }, (_, i) => `0-${i}`)

describe('courseProgress', () => {
  it('none done is não iniciado', () => {
    assert.deepEqual(courseProgress(makeCourse('html', required(5), [])), { done: 0, total: 5, state: 'não iniciado' })
  })
  it('some done is em andamento', () => {
    assert.deepEqual(courseProgress(makeCourse('py', required(4), keys(2))), { done: 2, total: 4, state: 'em andamento' })
  })
  it('all done is concluído', () => {
    assert.deepEqual(courseProgress(makeCourse('html', required(5), keys(5))), { done: 5, total: 5, state: 'concluído' })
  })
  it('an undone optional lesson is not counted', () => {
    const c = makeCourse('c', [{}, {}, { optional: true }], keys(2))
    assert.deepEqual(courseProgress(c), { done: 2, total: 2, state: 'concluído' })
  })
  it('a done optional lesson is counted', () => {
    const c = makeCourse('c', [{}, { optional: true }], keys(2))
    assert.deepEqual(courseProgress(c), { done: 2, total: 2, state: 'concluído' })
  })
  it('only undone optional lessons gives 0 de 0 and não iniciado', () => {
    assert.deepEqual(courseProgress(makeCourse('c', [{ optional: true }], [])), { done: 0, total: 0, state: 'não iniciado' })
  })
  it('ignores completed keys that no lesson has', () => {
    assert.deepEqual(courseProgress(makeCourse('c', required(2), ['0-0', '9-9'])), { done: 1, total: 2, state: 'em andamento' })
  })
  it('started parts without a finished lesson is em andamento', () => {
    assert.equal(courseProgress(makeCourse('c', required(2), [], { '0-0': 1 })).state, 'em andamento')
  })
})

describe('continueTarget', () => {
  it('is the first required lesson not completed', () => {
    assert.equal(continueTarget(makeCourse('py', required(4), keys(2))), '0-2')
  })
  it('is the first lesson when nothing is done', () => {
    assert.equal(continueTarget(makeCourse('html', required(5), [])), '0-0')
  })
  it('skips optional lessons', () => {
    assert.equal(continueTarget(makeCourse('c', [{}, { optional: true }, {}], ['0-0'])), '0-2')
  })
  it('uses the real key when a lesson index has a hole', () => {
    const c = makeCourse('c', [{ lessonIndex: 0 }, { lessonIndex: 2 }], ['0-0'])
    assert.equal(continueTarget(c), '0-2')
  })
  it('is null when every required lesson is done', () => {
    assert.equal(continueTarget(makeCourse('c', required(2), keys(2))), null)
  })
})

describe('orderCourses', () => {
  it('lists em andamento, then não iniciado, then concluído', () => {
    const list = [makeCourse('HTML', required(5), keys(5)), makeCourse('Git', required(3), []), makeCourse('Python', required(4), keys(2))]
    assert.deepEqual(orderCourses(list).map(c => c.id), ['Python', 'Git', 'HTML'])
  })
  it('keeps the input order inside a group and does not mutate', () => {
    const list = [makeCourse('A', required(2), []), makeCourse('B', required(2), []), makeCourse('C', required(2), [])]
    const before = list.map(c => c.id)
    assert.deepEqual(orderCourses(list).map(c => c.id), ['A', 'B', 'C'])
    assert.deepEqual(list.map(c => c.id), before)
  })
})

describe('actionLabel and helpers', () => {
  it('maps the state to the button word', () => {
    assert.equal(actionLabel('não iniciado'), 'começar')
    assert.equal(actionLabel('em andamento'), 'continuar')
    assert.equal(actionLabel('concluído'), 'revisar')
  })
  it('builds the lesson key from the raw indices', () => {
    assert.equal(lessonKeyOf({ sectionIndex: 1, lessonIndex: 3 }), '1-3')
  })
  it('knows when the path is inside a course', () => {
    assert.equal(isInsideCourse('/courses/abc'), true)
    assert.equal(isInsideCourse('/courses/abc/0-1'), true)
    assert.equal(isInsideCourse('/courses'), false)
    assert.equal(isInsideCourse('/courses/'), false)
    assert.equal(isInsideCourse('/exercise/abc'), false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run (in `platform/frontend`): `node --experimental-strip-types --test src/lib/courseProgress.test.ts`
Expected: FAIL, cannot find `./courseProgress.ts`.

- [ ] **Step 3: Implement**

`src/lib/courseProgress.ts`:

```ts
import type { Course } from './courseModel'

export type CourseState = 'não iniciado' | 'em andamento' | 'concluído'

export interface CourseProgress { done: number; total: number; state: CourseState }

export function lessonKeyOf(lesson: { sectionIndex: number; lessonIndex: number }): string {
  return `${lesson.sectionIndex}-${lesson.lessonIndex}`
}

export function courseProgress(course: Course): CourseProgress {
  const completed = new Set(course.completed)
  let done = 0
  let total = 0
  for (const lesson of course.sections.flatMap(section => section.lessons)) {
    const isDone = completed.has(lessonKeyOf(lesson))
    if (!lesson.optional || isDone) total++
    if (isDone) done++
  }
  const started = done > 0 || Object.values(course.parts).some(count => count > 0)
  const state: CourseState = total > 0 && done >= total ? 'concluído' : started ? 'em andamento' : 'não iniciado'
  return { done, total, state }
}

export function continueTarget(course: Course): string | null {
  const completed = new Set(course.completed)
  for (const lesson of course.sections.flatMap(section => section.lessons)) {
    if (!lesson.optional && !completed.has(lessonKeyOf(lesson))) return lessonKeyOf(lesson)
  }
  return null
}

const GROUP: Record<CourseState, number> = { 'em andamento': 0, 'não iniciado': 1, 'concluído': 2 }

export function orderCourses<T extends Course>(courses: T[]): T[] {
  return courses
    .map((course, index) => ({ course, index, group: GROUP[courseProgress(course).state] }))
    .sort((a, b) => a.group - b.group || a.index - b.index)
    .map(entry => entry.course)
}

export function actionLabel(state: CourseState): 'começar' | 'continuar' | 'revisar' {
  return state === 'concluído' ? 'revisar' : state === 'em andamento' ? 'continuar' : 'começar'
}

export function isInsideCourse(pathname: string): boolean {
  return /^\/courses\/[^/]/.test(pathname)
}
```

- [ ] **Step 4: Register the test and run the whole suite**

In `package.json`, append ` src/lib/courseProgress.test.ts` to the end of the `test` script (after `src/mobile/mobile.contract.test.ts`).
Run: `npm test` and `npx tsc -b`
Expected: all green, exit code 0.

- [ ] **Step 5: Prove the tests bite**

Temporarily change `if (!lesson.optional || isDone) total++` to `total++`, run `node --experimental-strip-types --test src/lib/courseProgress.test.ts`, confirm `an undone optional lesson is not counted` fails, then restore.

- [ ] **Step 6: Commit**

```bash
git add platform/frontend/src/lib/courseProgress.ts platform/frontend/src/lib/courseProgress.test.ts platform/frontend/package.json
git commit -m "Add pure course progress, continue target and ordering"
```

---

### Task 2: Course and lesson in the URL

**Files:**
- Create: `src/components/CourseNotFound.tsx`
- Modify: `src/App.tsx`, `src/pages/CoursesPage.tsx` (the `CoursesPage` component only, from `export default function CoursesPage()` to the end), `src/components/SkillPath.contract.test.ts`

**Interfaces:**
- Consumes: `lessonKeyOf` from `../lib/courseProgress`.
- Produces: addresses `/courses`, `/courses/:courseId`, `/courses/:courseId/:lessonKey`. `CourseNotFound` props: `{ text: string; to: string; linkText: string }`.

- [ ] **Step 1: Route**

In `src/App.tsx` change `<Route path="courses" element={<CoursesPage />} />` to `<Route path="courses/*" element={<CoursesPage />} />`. One route keeps the page mounted while moving between list, map and lesson, so `GET /courses` is not repeated.

- [ ] **Step 2: Notice component**

`src/components/CourseNotFound.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

export default function CourseNotFound({ text, to, linkText }: { text: string; to: string; linkText: string }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  return (
    <div role="status">
      <p style={{ color: 'var(--muted)', fontSize: isMobile ? 'var(--fs-base)' : undefined }}>{text}</p>
      <Link to={to} style={{ color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', minHeight: isMobile ? 'var(--ctl-md)' : undefined, fontSize: isMobile ? 'var(--fs-base)' : undefined }}>
        {linkText}
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Read the address in `CoursesPage`**

Add `import { useNavigate, useParams } from 'react-router-dom'`, `import CourseNotFound from '../components/CourseNotFound'` and `import { lessonKeyOf } from '../lib/courseProgress'` to the imports.

Replace the two `useState` lines for `openId` and `lessonKey` with:

```tsx
  const navigate = useNavigate()
  const [courseId, lessonKey] = (useParams()['*'] ?? '').split('/').filter(Boolean)
```

Replace the `course` / `lesson` derivation so it uses them (keep the `flatMap` shape, use `lessonKeyOf(item)` for the key):

```tsx
  const course = courses.find(item => item.id === courseId) ?? null
  const lesson = course?.sections.flatMap(section => section.lessons.map(item => ({
    section,
    item,
    key: lessonKeyOf(item),
  })))
    .find(entry => entry.key === lessonKey)
  const ready = !loading && !loadError
```

Keep the `useEffect` that sets `document.body.dataset.courseLesson` unchanged.

- [ ] **Step 4: Rewire the render**

In the returned JSX:
- Change the card `onClick={() => setOpenId(item.id)}` to `onClick={() => navigate(`/courses/${item.id}`)}` (Task 3 replaces the card; keep it working until then). Change the list condition `!course && courses.map(...)` to `!courseId && courses.map(...)` and the empty-state condition `!course && !loadError && !loading && courses.length === 0` to `!courseId && ready && courses.length === 0`.
- Leave the loading line as it is, `{!course && !loadError && loading && <p ...>Carregando…</p>}`, so a course address that is still loading shows `Carregando…` and never "curso não encontrado".
- Back button on the map: `onClick={() => navigate('/courses')}`.
- `SkillPath` `onOpen={key => navigate(`/courses/${course.id}/${key}`)}`.
- `LessonPlayer`: `onBack={() => navigate(`/courses/${course.id}`)}`. `onComplete` keeps using `lessonKey` from the address (it is a string there; the `!lessonKey` guard stays).
- After the map block add:

```tsx
        {courseId && ready && !course && (
          <CourseNotFound text="curso não encontrado" to="/courses" linkText="← cursos" />
        )}
        {course && lessonKey && ready && !lesson && (
          <CourseNotFound text="lição não encontrada" to={`/courses/${course.id}`} linkText={`← ${course.title}`} />
        )}
```

- The map block condition `course && !lesson` must also require no `lessonKey`, so an unknown lesson shows only the notice: `course && !lessonKey`.

- [ ] **Step 5: Update the contract test**

In `src/components/SkillPath.contract.test.ts`, test "removes the numbered lesson list...": replace the assertion `/item\.sectionIndex}-\$\{item\.lessonIndex\}/` with `/lessonKeyOf\(item\)/`. Leave `dataset\.courseLesson` and `<SkillPath`. Remove the `/de \{item\.sections\.reduce/` assertion in Task 3 (it moves to the card), not here.

- [ ] **Step 6: Verify**

Run: `npx tsc -b`, `npm test`, `npm run build`. Expected: exit 0.
Browser (servers on 5173/8787): open `/courses`, press a card (address becomes `/courses/<id>`), press a node (address gets `/<key>`), reload (same lesson reopens), `← <course>` returns to the map, `← cursos` to the list. Open `/courses/nope` and `/courses/<id>/9-9`: the two notices appear.

- [ ] **Step 7: Commit**

```bash
git add platform/frontend/src/App.tsx platform/frontend/src/pages/CoursesPage.tsx platform/frontend/src/components/CourseNotFound.tsx platform/frontend/src/components/SkillPath.contract.test.ts
git commit -m "Keep the open course and lesson in the Courses address"
```

---

### Task 3: Course card, continue button, order, empty state

**Files:**
- Create: `src/components/CourseCard.tsx`
- Modify: `src/pages/CoursesPage.tsx` (list block and empty state), `src/components/SkillPath.contract.test.ts`

**Interfaces:**
- Consumes: `courseProgress`, `continueTarget`, `actionLabel`, `orderCourses` from `../lib/courseProgress`; `Course` from `../lib/courseModel`.
- Produces: `CourseCard` props `{ course: Course; onOpen: () => void; onAction: () => void }`.

- [ ] **Step 1: Card**

`src/components/CourseCard.tsx`:

```tsx
import type { Course } from '../lib/courseModel'
import { actionLabel, courseProgress, type CourseState } from '../lib/courseProgress'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'

const STATE_COLOR: Record<CourseState, string> = {
  'não iniciado': 'var(--muted)',
  'em andamento': 'var(--cyan)',
  'concluído': 'var(--green)',
}

export default function CourseCard({ course, onOpen, onAction }: { course: Course; onOpen: () => void; onAction: () => void }) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const { done, total, state } = courseProgress(course)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const size = isMobile ? 'var(--fs-base)' : undefined
  return (
    <div className="card" style={{ width: '100%', maxWidth: 640, padding: '18px 20px', marginBottom: 10 }}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={course.title}
        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span style={{ display: 'block', fontSize: isMobile ? 'var(--fs-lg)' : 18, fontWeight: 700, marginBottom: 6 }}>{course.title}</span>
        {course.description && <span style={{ display: 'block', color: 'var(--muted)', marginBottom: 8, fontSize: size }}>{course.description}</span>}
      </button>
      <div
        role="progressbar"
        aria-label={`${course.title}: ${done} de ${total} lições`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.12)', margin: '8px 0' }}
      >
        <div style={{ height: '100%', width: `${percent}%`, borderRadius: 4, background: STATE_COLOR[state] === 'var(--muted)' ? 'var(--cyan)' : STATE_COLOR[state] }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: size }}>
          <span style={{ color: 'var(--text)' }}>{done} de {total} lições</span>
          <span style={{ color: STATE_COLOR[state] }}> · {state}</span>
        </span>
        <button
          type="button"
          onClick={onAction}
          style={{
            background: 'none', border: '1px solid var(--cyan)', borderRadius: 'var(--radius-lg)', color: 'var(--cyan)', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: size, padding: '0 14px', minHeight: isMobile ? 'var(--ctl-md)' : 32, whiteSpace: 'nowrap',
          }}
        >
          {actionLabel(state)}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Use it in the list**

In `CoursesPage.tsx` add `import CourseCard from '../components/CourseCard'` and `import { continueTarget, orderCourses } from '../lib/courseProgress'`. Replace the list block (`{!courseId && courses.map(item => ( <button ...> ... </button> ))}`) with:

```tsx
        {!courseId && orderCourses(courses).map(item => (
          <CourseCard
            key={item.id}
            course={item}
            onOpen={() => navigate(`/courses/${item.id}`)}
            onAction={() => {
              const key = continueTarget(item)
              navigate(key ? `/courses/${item.id}/${key}` : `/courses/${item.id}`)
            }}
          />
        ))}
```

Replace the empty state `<p>` with:

```tsx
          <div>
            <p style={{ color: 'var(--muted)', margin: 0 }}>Nenhum curso ainda.</p>
            <p style={{ color: 'var(--muted)', fontSize: isMobile ? 'var(--fs-sm)' : 12 }}>Os cursos são criados pelo assistente de IA.</p>
          </div>
```

Delete the now-unused old card `button` code. There must be no button that creates a course.

- [ ] **Step 3: Contract test**

In `SkillPath.contract.test.ts` remove the assertion `/de \{item\.sections\.reduce/`. Add to the same test: `const card = readFileSync(join(here, './CourseCard.tsx'), 'utf8'); assert.match(card, /de \{total\} lições/)`.

- [ ] **Step 4: Verify**

Run: `npx tsc -b`, `npm test`, `npm run build`. Expected: exit 0.
Browser: the two local courses show bar, count, state and the right button; `continuar` lands on the first unfinished lesson.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/src/components/CourseCard.tsx platform/frontend/src/pages/CoursesPage.tsx platform/frontend/src/components/SkillPath.contract.test.ts
git commit -m "Show progress, state and a continue button on each course card"
```

---

### Task 4: Mobile layout inside a course

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`, `src/pages/CoursesPage.tsx` (map title padding)

**Interfaces:**
- Consumes: `isInsideCourse` from `../../lib/courseProgress`.

- [ ] **Step 1: Hide the dock inside a course**

In `AppLayout.tsx` import `isInsideCourse`. In `AppLayout()` compute `const inCourse = isMobile && isInsideCourse(location.pathname)` and render `{isMobile && !inCourse && <MobileNav />}`.

- [ ] **Step 2: Move the AI button to the top**

In `ChatBubble()` compute `const inCourse = isMobile && isInsideCourse(location.pathname)` after `isMobile`. When `inCourse`:
- the button style uses `top: 'calc(' + MOBILE_TOP_INSET + ' + 20px)'` (no `bottom`), `right: 20`, `width: 'var(--ctl-md)'`, `height: 'var(--ctl-md)'`, `borderRadius: 'var(--radius-md)'`, border `1px solid var(--border)` (`var(--cyan)` while open), background `var(--bg-card)`, no box-shadow, and a 16px icon;
- the open panel uses `top: 'calc(' + MOBILE_TOP_INSET + ' + 20px + var(--ctl-md) + 8px)'` (no `bottom`), `right: 20`, `maxHeight: calc(100dvh - ${MOBILE_TOP_INSET} - 20px - var(--ctl-md) - 8px - 16px)`.

Write the two style objects as local constants chosen by `inCourse`; leave the existing bottom styles untouched for every other case. `raised` is irrelevant while `inCourse`.

- [ ] **Step 3: Keep the map title clear of the square**

In the map header in `CoursesPage.tsx`, give the `<h1>` `paddingRight: isMobile ? 'calc(var(--ctl-md) + var(--sp-2))' : undefined`.

- [ ] **Step 4: Verify**

Run: `npx tsc -b`, `npm test`, `npm run build`. Expected: exit 0.
Browser at 390x844: on the map and on a lesson the bottom menu is gone and a small square sits top right without covering `← cursos`, the progress strip or the title; opening it shows the chat panel below it. On `/courses` the menu and the round button are unchanged. At desktop width nothing changed.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/src/components/layout/AppLayout.tsx platform/frontend/src/pages/CoursesPage.tsx
git commit -m "Hide the bottom menu inside a course and move the AI button to the top"
```

---

### Task 5: Run the spec's Acceptance scenarios

**Files:** none (verification; screenshots go under `.playwright-mcp/`, not committed).

- [ ] **Step 1: Servers**

Start the worker and the frontend (`npm run dev` in each) or reuse running ones. Touch files if the page is blank (`find src -type f -newer package.json -exec touch {} +`).

- [ ] **Step 2: Mock the data per scenario**

With `browser_run_code_unsafe`, route only the API call (the app calls `/api/courses`; the page itself is `/courses`, so match the `/api` prefix):

```js
async (page) => {
  const mk = (id, title, n, done, optional = []) => ({
    id, title, description: `${title} course`,
    modules: [{ title: 'Basics', lessons: Array.from({ length: n }, (_, i) => ({ title: `Lesson ${i + 1}`, optional: optional.includes(i), steps: [{ type: 'text', body: `Body ${i + 1}` }] })) }],
    completed_lessons: Array.from({ length: done }, (_, i) => `0-${i}`), lesson_parts: {},
  })
  await page.route('**/api/courses', r => r.request().method() === 'GET'
    ? r.fulfill({ json: [mk('python-id', 'Python', 4, 2), mk('html-id', 'HTML', 5, 0)] })
    : r.continue())
}
```

Change the array per scenario (`[]` for the empty state, `r.fulfill({ status: 500 })` for the error). After each scenario run `await page.unrouteAll()`.

- [ ] **Step 3: Run all 15 scenarios**

Go through every `Scenario:` in the spec's Acceptance section: desktop ones at 1280x800, `@mobile` at 390x844, the others at both. Measure with `page.evaluate` where the scenario states a position (AI button top right, not covering a control; menu hidden). Record pass or fail for each.

- [ ] **Step 4: Final checks**

Run in `platform/frontend`: `npx tsc -b`, `npm run build`, `npm test`. Run in `platform/worker`: `npx tsc --noEmit`, `npm test` (unchanged, but confirms nothing moved). Expected: all exit 0.

- [ ] **Step 5: Report**

List each scenario with pass or fail, the commands run with their exit codes, and anything not verified. A failed scenario is fixed in the task that owns it, not patched here.

---

## Self-Review

- **Spec coverage:** card progress and state (Task 1, 3); continue button (1, 3); URL state and not-found notices (2); empty state (3); order (1, 3); mobile menu hidden and AI square (4); desktop unchanged (4, constraints); Acceptance run (5). No worker change, as the spec says.
- **Placeholders:** none; every code step has code.
- **Types:** `CourseState`, `courseProgress`, `continueTarget`, `orderCourses`, `actionLabel`, `isInsideCourse`, `lessonKeyOf` are defined in Task 1 and used with the same names in Tasks 2-4.
- **Review Focus:** zero-total, stale keys and started parts are tests in Task 1; holes are a test in Task 1; loading-vs-not-found is Task 2 step 4 (`ready`); completion landing on the map is Task 2 step 4 (`onBack` to the map).
- **Known limitation:** pages reserve bottom space for the dock through `pagePadding`; inside a course the dock is hidden, so the map keeps about 100px of empty space at the bottom. Judge it in Task 4 step 4; not changed unless it looks wrong.
