# Trilha do curso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the numbered lesson list inside an open course with a permanent, code-drawn skill path, including optional lessons that branch sideways, without storing the path.

**Architecture:** A frozen pure module (`skillPath.ts`) turns a course id and the required-lesson count into lanes, then places nodes, strokes, and section titles. `CoursesPage` keeps the fetch, the player, and the completion POST. It parses `courses.modules` into lessons that remember their raw `${sectionIndex}-${lessonIndex}` key, and renders those lessons through one `SkillPath` component. `optional: true` is only documented on the existing course tools. The parser moves to `courseModel.ts` so the raw-key rule has a node test; the page still calls it. Nothing is written to D1 or `localStorage`.

**Tech Stack:** React 19 + Vite + TypeScript (frontend, `node --experimental-strip-types --test`), Cloudflare Workers + Hono + Vitest (worker tool descriptions only).

**Spec:** `docs/superpowers/specs/2026-09-29-trilha-do-curso.md`

**Status (2026-10-10):** Tasks 1-5 implemented and committed. Manual pass done in the browser: HTML lanes `right,right,center,right,left` and Python lanes `left,center,left,center` match; reload keeps nodes in place. Cases 5 and 6 (optional lesson, parser hole) are covered by node tests only. Geometry was later scaled 1.5x in `feat/course-lesson-progress` (`NODE 84`, `V_STEP 192`, `BRANCH 144`, `LANE_X 72/210/348`); the lane walk and salt are unchanged, so no course map reordered. The frozen numbers in "Global Constraints" below are the original ones.

## Global Constraints

- The path is `mainLanes(courseId, n)` plus `courseBranchSide`. No `Math.random()`, no `crypto.getRandomValues`, no `Date`, no D1 write, no `localStorage`.
- Salt is exactly `devgrind.skillpath.v1:`. The first line of `platform/frontend/src/lib/skillPath.ts` is exactly `// Frozen. Changing the salt, Step, or the constants moves every course map.`
- Lanes are `'left' | 'center' | 'right'`. `LANE_X` is `48 / 140 / 232`. `NODE` is `56`. `NODE_RADIUS` is `16`. `V_STEP` is `128`. `BRANCH` is `96`. `PAD_TOP` is `8`. `TITLE_BLOCK` is `28`.
- `optional` counts only when `lesson.optional === true`. Absent, `false`, `1`, and `"true"` stay required.
- A lesson with no recognized step is not a node, does not enter the lane walk, and does not enter `M`. Its raw index stays reserved.
- Do not edit course rows `f0eae0b5-5a5b-4d4b-9914-77d31ae3a49a` (HTML: `right, right, center, right, left`) or `7fb01e42-de75-44e1-ab31-c11a8fb9f2b5` (Python: `left, center, left, center`). Do not run `UPDATE` on local or remote D1.
- Do not add a route, a migration, a column, or a table. `POST /courses/:id/lessons/:lessonKey/complete` does not learn about order.
- `N de M lições` still counts every lesson `asCourse` kept, optional included. `courses.is_complete` is not learner progress and is not an input to the map.
- Do not edit `docs/superpowers/specs/2026-09-29-kata-como-passo-de-licao.md`. Do not teach `asStep` to recognize `kata`.
- Do not add a CSS token. Map styles are inline. Font is `var(--font)` (JetBrains Mono). No second typeface.
- UI copy stays Portuguese. Tool descriptions stay English and telegraphic. `createCourse` and `appendCourseModules` still do not validate steps.
- Lesson title is React text. No `dangerouslySetInnerHTML`. No `foreignObject`.
- No `console.log` in the painter. The only network error on this screen remains `Não foi possível carregar os cursos.`
- The player, the footer (`verificar`, `continuar`, `concluir`, `tentar novamente`), fill, and `document.body.dataset.courseLesson` stay. The chat bubble does not rise on the map. The map is the `course && !lesson` branch.
- Mobile and desktop share one geometry. A branch that does not fit scrolls inside the map (`overflow-x: auto`). Nodes are not scaled.
- Frontend check: `npx tsc -b` and `npm test` in `platform/frontend`. Worker check, only in Task 5: `npx tsc --noEmit` and `npm test` in `platform/worker`.

## File map

| File | Responsibility |
|---|---|
| `platform/frontend/src/lib/skillPath.ts` | Frozen lane walk, geometry, and `placeSkillPath`. No React. |
| `platform/frontend/src/lib/skillPath.test.ts` | Node tests for the frozen walk and the placement. |
| `platform/frontend/src/lib/courseModel.ts` | `asStep` / `asCourse`. Raw indexes and `optional`. No React. |
| `platform/frontend/src/lib/courseModel.test.ts` | Hole keys, optional flag, dropped sections. |
| `platform/frontend/src/components/SkillPath.tsx` | SVG strokes and HTML buttons. Reads `placeSkillPath`. Does not recompute lanes. |
| `platform/frontend/src/components/SkillPath.contract.test.ts` | Source contract for the painter and the page wiring. |
| `platform/frontend/src/pages/CoursesPage.tsx` | Fetch, card list, player, POST. Swaps the numbered list for `SkillPath`. |
| `platform/frontend/package.json` | `"test"` script for the node runner. |
| `platform/frontend/tsconfig.app.json` | Exclude `src/**/*.test.ts` so `tsc -b` does not pull in `node:test`. |
| `platform/worker/src/lib/tools.ts` | Description and `inputSchema` text of `create_course` and `append_course_modules` only. |
| `platform/worker/test/mcp.test.ts` | One Vitest case on the Vitest D1, not the local sqlite. |

`index.css`, `AppLayout.tsx`, `routes/courses.ts`, `schema.ts`, and `LessonPlayer` are not edited.

Task 5 does not depend on Tasks 1–4. Tasks 2 and 5 can run beside Task 1. Task 3 needs Task 1. Task 4 needs Tasks 1–3. Execute in the numbered order unless two independent tasks are deliberately parallel.

Label stack locked by this plan, because the spec gives the 18px gap and not the pixels under the node:

- Lesson title: 6px under the node, box height 33 (two lines of 12px at line-height 1.35).
- The word `opcional`: 4px under that title, box height 14.
- A colliding optional-only section title: its top is 4px under that word.
- Section-title line box is 16px tall. Inside a `TITLE_BLOCK` it is centered, so the text top is `bandTop + 6`.
- Collision width is `uppercase.length * 7.2 + (length - 1) * 0.72`. The screen still uses CSS `letter-spacing` and `text-transform`. The width is only the intersection test.

---

### Task 1: Freeze the lane walk and the geometry

**Files:**
- Create: `platform/frontend/src/lib/skillPath.ts`
- Create: `platform/frontend/src/lib/skillPath.test.ts`
- Modify: `platform/frontend/package.json` (add the `test` script)
- Modify: `platform/frontend/tsconfig.app.json` (add `exclude`)
- Test: `platform/frontend/src/lib/skillPath.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export type Lane = 'left' | 'center' | 'right'`
  - `export function fnv1a(input: string): number`
  - `export function mix(state: number): number`
  - `export function mainLanes(courseId: string, mainCount: number): Lane[]`
  - `export function courseBranchSide(courseId: string): -1 | 1`
  - `export function branchPlacement(parentX: number, parentY: number, indexOnAnchor: number, firstSide: -1 | 1): { x: number; y: number; side: -1 | 1; depth: number }`
  - `export function mainNodeY(mainIndex: number, sectionStarts: readonly number[]): number`
  - `export function connector(x1: number, y1: number, x2: number, y2: number): string`
  - `export const NODE = 56`, `NODE_RADIUS = 16`, `V_STEP = 128`, `BRANCH = 96`, `PAD_TOP = 8`, `TITLE_BLOCK = 28`
  - `export const LANE_X: Record<Lane, number> = { left: 48, center: 140, right: 232 }`

The page does not import this module yet.

- [x] **Step 1: Write the failing test**

Create `platform/frontend/src/lib/skillPath.test.ts`:

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  BRANCH,
  LANE_X,
  branchPlacement,
  connector,
  courseBranchSide,
  fnv1a,
  mainLanes,
  mainNodeY,
} from './skillPath.ts'

const HTML = 'f0eae0b5-5a5b-4d4b-9914-77d31ae3a49a'
const PYTHON = '7fb01e42-de75-44e1-ab31-c11a8fb9f2b5'

describe('mainLanes', () => {
  it('locks the HTML and Python courses', () => {
    assert.equal(fnv1a(`devgrind.skillpath.v1:${HTML}`), 906121739)
    assert.equal(fnv1a(`devgrind.skillpath.v1:${PYTHON}`), 2245293992)
    assert.deepEqual(mainLanes(HTML, 5), ['right', 'right', 'center', 'right', 'left'])
    assert.equal(mainLanes(HTML, 6)[5], 'center')
    assert.deepEqual(mainLanes(PYTHON, 4), ['left', 'center', 'left', 'center'])
    assert.equal(mainLanes(PYTHON, 5)[4], 'right')
    assert.deepEqual(mainLanes(HTML, 5), mainLanes(HTML, 6).slice(0, 5))
    assert.deepEqual(mainLanes(PYTHON, 4), mainLanes(PYTHON, 5).slice(0, 4))
    assert.deepEqual(mainLanes(HTML, 0), [])
    assert.equal(courseBranchSide(HTML), 1)
    assert.equal(courseBranchSide(PYTHON), -1)
  })
})

describe('geometry', () => {
  it('locks the HTML centers and the branch offsets', () => {
    assert.equal(mainNodeY(0, [0]), 64)
    assert.equal(mainNodeY(4, [0]), 576)
    assert.equal(mainNodeY(1, [0, 1]), 220)
    assert.equal(LANE_X.left, 48)
    assert.equal(LANE_X.center, 140)
    assert.equal(LANE_X.right, 232)
    assert.equal(connector(232, 64, 232, 192), 'M 232 64 C 232 128, 232 128, 232 192')
    assert.equal(connector(232, 192, 140, 320), 'M 232 192 C 232 256, 140 256, 140 320')
    assert.deepEqual(branchPlacement(232, 192, 0, 1), { x: 328, y: 192, side: 1, depth: 1 })
    assert.deepEqual(branchPlacement(232, 192, 1, 1), { x: 136, y: 192, side: -1, depth: 1 })
    assert.equal(branchPlacement(232, 192, 2, 1).x, 232 + 2 * BRANCH)
    assert.equal(branchPlacement(232, 192, 2, 1).side, 1)
    assert.equal(branchPlacement(232, 192, 2, 1).depth, 2)
    assert.equal(branchPlacement(232, 192, 3, 1).x, 232 - 2 * BRANCH)
  })
})

describe('frozen source', () => {
  it('does not call Math.random and keeps the freeze comment', () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'skillPath.ts'), 'utf8')
    assert.equal(source.startsWith('// Frozen. Changing the salt, Step, or the constants moves every course map.\n'), true)
    assert.equal(source.includes('Math.random'), false)
  })
})
```

- [x] **Step 2: Run the test to verify it fails**

Run from `platform/frontend`:

```bash
node --experimental-strip-types --test src/lib/skillPath.test.ts
```

Expected: FAIL. Node cannot resolve `./skillPath.ts` (`ERR_MODULE_NOT_FOUND`).

- [x] **Step 3: Write the frozen module**

Create `platform/frontend/src/lib/skillPath.ts`. Do not reformat the arithmetic. `Math.imul` and `>>> 0` are part of the result.

```ts
// Frozen. Changing the salt, Step, or the constants moves every course map.

export function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function mix(state: number): number {
  state = (state + 0x9e3779b9) >>> 0
  let z = state
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b)
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35)
  return (z ^ (z >>> 16)) >>> 0
}

export type Lane = 'left' | 'center' | 'right'

const LANE_BY_INDEX = ['left', 'center', 'right'] as const

export function mainLanes(courseId: string, mainCount: number): Lane[] {
  let state = fnv1a(`devgrind.skillpath.v1:${courseId}`)
  const lanes: Lane[] = []
  let prev = 1
  for (let i = 0; i < mainCount; i++) {
    state = mix(state)
    const roll = state % 10
    let next: number
    if (roll <= 5) {
      if (prev === 1) next = ((state >>> 4) & 1) === 0 ? 0 : 2
      else next = 1
    } else if (roll <= 7) {
      next = prev
    } else if (prev === 0) {
      next = 2
    } else if (prev === 2) {
      next = 0
    } else {
      next = ((state >>> 4) & 1) === 0 ? 2 : 0
    }
    lanes.push(LANE_BY_INDEX[next])
    prev = next
  }
  return lanes
}

export function courseBranchSide(courseId: string): -1 | 1 {
  const seed = fnv1a(`devgrind.skillpath.v1:${courseId}`)
  return (seed & 1) === 0 ? -1 : 1
}

export const NODE = 56
export const NODE_RADIUS = 16
export const V_STEP = 128
export const BRANCH = 96
export const LANE_X: Record<Lane, number> = { left: 48, center: 140, right: 232 }
export const PAD_TOP = 8
export const TITLE_BLOCK = 28

export function mainNodeY(mainIndex: number, sectionStarts: readonly number[]): number {
  let titles = 0
  for (const start of sectionStarts) if (start <= mainIndex) titles += 1
  return PAD_TOP + titles * TITLE_BLOCK + mainIndex * V_STEP + NODE / 2
}

export function connector(x1: number, y1: number, x2: number, y2: number): string {
  const midY = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}

export function branchPlacement(
  parentX: number,
  parentY: number,
  indexOnAnchor: number,
  firstSide: -1 | 1,
): { x: number; y: number; side: -1 | 1; depth: number } {
  const depth = Math.floor(indexOnAnchor / 2) + 1
  const side = indexOnAnchor % 2 === 0 ? firstSide : (firstSide === 1 ? -1 : 1)
  return { x: parentX + side * depth * BRANCH, y: parentY, side, depth }
}
```

- [x] **Step 4: Point the frontend test script at this file and keep it out of `tsc -b`**

In `platform/frontend/package.json`, add this script next to the others:

```json
"test": "node --experimental-strip-types --test src/lib/skillPath.test.ts"
```

In `platform/frontend/tsconfig.app.json`, add this sibling of `"include"`:

```json
"exclude": ["src/**/*.test.ts"]
```

- [x] **Step 5: Run the test and the typecheck**

From `platform/frontend`:

```bash
npm test
npx tsc -b
```

Expected: the node test passes (HTML seed `906121739`, Python seed `2245293992`, both lane lists, both sides, both connector strings). `tsc -b` exits 0. The page still does not import the module.

- [x] **Step 6: Commit**

```bash
git add platform/frontend/src/lib/skillPath.ts platform/frontend/src/lib/skillPath.test.ts platform/frontend/package.json platform/frontend/tsconfig.app.json
git commit -m "Congelar mainLanes e a geometria da trilha"
```

---

### Task 2: Keep the raw lesson key in the parser

**Files:**
- Create: `platform/frontend/src/lib/courseModel.ts`
- Create: `platform/frontend/src/lib/courseModel.test.ts`
- Modify: `platform/frontend/src/pages/CoursesPage.tsx`
- Modify: `platform/frontend/package.json` (`test` script)
- Test: `platform/frontend/src/lib/courseModel.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `export interface Lesson { title: string; optional: boolean; steps: Step[]; sectionIndex: number; lessonIndex: number }`
  - `export interface Section { title: string; lessons: Lesson[] }`
  - `export interface Course { id: string; title: string; description: string | null; sections: Section[]; completed: string[] }`
  - `export function asStep(raw: unknown): Step | null`
  - `export function asCourse(row: Record<string, unknown>): Course | null`
  - `Step` and `FillPart` move with `asStep`, unchanged.
  - The open-lesson finder in `CoursesPage` becomes `` `${item.sectionIndex}-${item.lessonIndex}` ``.

`asCourse` still returns `null` when no lesson has a recognized step. A section with no drawn lesson is omitted and does not renumber later sections. `completed_lessons` is still copied onto `course.completed`. `is_complete` is still not copied.

- [x] **Step 1: Write the failing test**

Create `platform/frontend/src/lib/courseModel.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { asCourse, asStep } from './courseModel.ts'

describe('asCourse', () => {
  it('keeps a raw key when an earlier section is empty and an earlier step is unknown', () => {
    const course = asCourse({
      id: 'course-hole',
      title: 'Buraco',
      description: null,
      completed_lessons: [],
      modules: [
        { title: 'Vazia', lessons: [] },
        {
          title: 'Real',
          lessons: [
            { title: 'Some', steps: [{ type: 'desconhecido' }] },
            { title: 'Meio', steps: [{ type: 'text', body: 'ok' }] },
            { title: 'Fim', steps: [{ type: 'text', body: 'ok' }] },
          ],
        },
      ],
    })
    assert.equal(course?.sections.length, 1)
    assert.deepEqual(
      course?.sections[0].lessons.map(lesson => `${lesson.sectionIndex}-${lesson.lessonIndex}`),
      ['1-1', '1-2'],
    )
    assert.equal(course?.sections[0].lessons[0].optional, false)
    assert.equal(asStep({ type: 'kata', slug: 'saudacao-com-nome' }), null)
  })

  it('treats only boolean true as optional', () => {
    const course = asCourse({
      id: 'flags',
      title: 'Flags',
      modules: [{
        title: 'S',
        lessons: [
          { title: 'Ausente', steps: [{ type: 'text', body: 'a' }] },
          { title: 'Falso', optional: false, steps: [{ type: 'text', body: 'a' }] },
          { title: 'Um', optional: 1, steps: [{ type: 'text', body: 'a' }] },
          { title: 'Texto', optional: 'true', steps: [{ type: 'text', body: 'a' }] },
          { title: 'Extra', optional: true, steps: [{ type: 'text', body: 'a' }] },
        ],
      }],
      completed_lessons: ['0-4'],
    })
    assert.deepEqual(course?.sections[0].lessons.map(lesson => lesson.optional), [false, false, false, false, true])
    assert.deepEqual(course?.completed, ['0-4'])
    assert.equal(course?.sections[0].lessons.length, 5)
  })

  it('still parses a fill step', () => {
    const course = asCourse({
      id: 'fill',
      title: 'Fill',
      modules: [{
        title: 'S',
        lessons: [{
          title: 'L',
          steps: [{ type: 'fill', prompt: 'p', file: 'index.html', parts: [{ text: '<' }, { blank: 'a', size: 's' }], choices: ['a'] }],
        }],
      }],
      completed_lessons: [],
    })
    const step = course?.sections[0].lessons[0].steps[0]
    assert.equal(step?.type, 'fill')
    if (step?.type !== 'fill') return
    assert.equal(step.parts.length, 2)
    assert.deepEqual(step.choices, ['a'])
  })

  it('returns null when nothing can be drawn', () => {
    assert.equal(asCourse({ id: 'vazio', title: 'Vazio', modules: [] }), null)
    assert.equal(asCourse({ id: 'ruim', title: 'Ruim', modules: 'nope' }), null)
  })
})
```

- [x] **Step 2: Run the test to verify it fails**

From `platform/frontend`:

```bash
node --experimental-strip-types --test src/lib/courseModel.test.ts
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `./courseModel.ts`.

- [x] **Step 3: Move the parser and store the raw index**

Create `platform/frontend/src/lib/courseModel.ts` with the types and `asStep` below. Leave `flat`, `matches`, `chipStyle`, `BLANK_CH`, `blankAnswers`, `StepView`, and `LessonPlayer` in the page. `asStep` is the function that is in `CoursesPage.tsx` today, moved unchanged.

```ts
export type FillPart =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; answer: string; size: 's' | 'm' | 'l' }

export type Step =
  | { type: 'text'; body: string }
  | { type: 'fill'; prompt: string; file: string; parts: FillPart[]; choices: string[] }
  | { type: 'browser'; prompt: string; starter: string }
  | { type: 'terminal'; prompt: string; expect: string }

export function asStep(raw: unknown): Step | null {
  const step = (raw ?? {}) as Record<string, unknown>
  const type = String(step.type ?? '')
  if (type === 'text') return { type, body: String(step.body ?? '') }
  if (type === 'fill') {
    const choices = Array.isArray(step.choices) ? step.choices.map(String) : []
    const file = String(step.file ?? 'index.html')
    const prompt = String(step.prompt ?? '')
    if (Array.isArray(step.parts)) {
      const parts: FillPart[] = []
      for (const rawPart of step.parts) {
        const part = (rawPart ?? {}) as Record<string, unknown>
        if (typeof part.text === 'string') parts.push({ kind: 'text', text: part.text })
        else if (typeof part.blank === 'string' || part.kind === 'blank') {
          const size = part.size === 's' || part.size === 'm' || part.size === 'l' ? part.size : 'm'
          parts.push({ kind: 'blank', answer: String(part.blank ?? part.answer ?? ''), size })
        }
      }
      if (parts.length) return { type, prompt, file, parts, choices }
    }
    return {
      type,
      prompt,
      file,
      choices,
      parts: [
        { kind: 'text', text: String(step.before ?? '') },
        { kind: 'blank', answer: String(step.answer ?? ''), size: 'l' },
        { kind: 'text', text: String(step.after ?? '') },
      ],
    }
  }
  if (type === 'browser') return { type, prompt: String(step.prompt ?? ''), starter: String(step.starter ?? '') }
  if (type === 'terminal') return { type, prompt: String(step.prompt ?? ''), expect: String(step.expect ?? '') }
  return null
}
```

The loop variable inside `asStep` is `rawPart`, not `raw`, so it does not shadow the argument. Behavior matches the page. Then add:

```ts
export interface Lesson {
  title: string
  optional: boolean
  steps: Step[]
  sectionIndex: number
  lessonIndex: number
}

export interface Section {
  title: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  description: string | null
  sections: Section[]
  completed: string[]
}

export function asCourse(row: Record<string, unknown>): Course | null {
  if (!Array.isArray(row.modules)) return null
  const sections: Section[] = []
  for (let sectionIndex = 0; sectionIndex < row.modules.length; sectionIndex++) {
    const section = (row.modules[sectionIndex] ?? {}) as Record<string, unknown>
    if (!Array.isArray(section.lessons)) continue
    const lessons: Lesson[] = []
    for (let lessonIndex = 0; lessonIndex < section.lessons.length; lessonIndex++) {
      const lesson = (section.lessons[lessonIndex] ?? {}) as Record<string, unknown>
      const steps = Array.isArray(lesson.steps) ? lesson.steps.map(asStep).filter((step): step is Step => step !== null) : []
      if (!steps.length) continue
      lessons.push({
        title: String(lesson.title ?? 'Lição'),
        optional: lesson.optional === true,
        steps,
        sectionIndex,
        lessonIndex,
      })
    }
    if (lessons.length) sections.push({ title: String(section.title ?? 'Seção'), lessons })
  }
  if (!sections.length) return null
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    sections,
    completed: Array.isArray(row.completed_lessons) ? row.completed_lessons.map(String) : [],
  }
}
```

In `CoursesPage.tsx`, delete the local `FillPart`, `Step`, `Lesson`, `Section`, `Course`, `asStep`, and `asCourse`. Import them:

```ts
import { asCourse, type Course, type FillPart, type Lesson, type Step } from '../lib/courseModel'
```

`verbatimModuleSyntax` is on. Type names stay on the `type` import. `StepView`, `LessonPlayer`, the card `N de M` reduce, the load error, and the POST stay in the page.

Replace the finder at the current lines 451–452:

```tsx
const lesson = course?.sections.flatMap(section => section.lessons.map(item => ({
  section,
  item,
  key: `${item.sectionIndex}-${item.lessonIndex}`,
})))
  .find(entry => entry.key === lessonKey)
```

Inside the numbered list that still exists, replace the key line:

```tsx
const key = `${course.sections.indexOf(section)}-${li}`
```

with:

```tsx
const key = `${item.sectionIndex}-${item.lessonIndex}`
```

Leave `String(li + 1).padStart(2, '0')` until Task 4 deletes that list.

- [x] **Step 4: Teach `npm test` to run both files**

In `platform/frontend/package.json`, set:

```json
"test": "node --experimental-strip-types --test src/lib/skillPath.test.ts src/lib/courseModel.test.ts"
```

- [x] **Step 5: Run the tests and the typecheck**

From `platform/frontend`:

```bash
npm test
npx tsc -b
```

Expected: both files pass. The hole course yields keys `1-1` and `1-2`. Only the lesson with `optional: true` is optional. `tsc -b` exits 0. HTML and Python are not modified.

- [x] **Step 6: Commit**

```bash
git add platform/frontend/src/lib/courseModel.ts platform/frontend/src/lib/courseModel.test.ts platform/frontend/src/pages/CoursesPage.tsx platform/frontend/package.json
git commit -m "Guardar o índice cru da lição no parser do curso"
```

---

### Task 3: Place nodes, strokes, and section titles

**Files:**
- Modify: `platform/frontend/src/lib/skillPath.ts`
- Modify: `platform/frontend/src/lib/skillPath.test.ts`
- Test: `platform/frontend/src/lib/skillPath.test.ts`

**Interfaces:**
- Consumes: `mainLanes`, `courseBranchSide`, `branchPlacement`, `mainNodeY`, `connector`, `NODE`, `LANE_X`, `PAD_TOP`, `TITLE_BLOCK`, `BRANCH` from Task 1. Do not change those bodies.
- Produces:
  - `export interface PathLesson { key: string; title: string; optional: boolean; sectionIndex: number; sectionTitle: string }`
  - `export type NodeState = 'done' | 'current' | 'locked' | 'optional-open' | 'optional-locked' | 'optional-done'`
  - `export interface PlacedNode { key: string; title: string; optional: boolean; state: NodeState; x: number; y: number }`
  - `export interface PlacedStroke { d: string; width: 10 | 6 }`
  - `export interface PlacedSectionTitle { text: string; x: number; y: number; place: 'band' | 'above' | 'below' }`
  - `export interface SkillMap { nodes: PlacedNode[]; strokes: PlacedStroke[]; sectionTitles: PlacedSectionTitle[]; minX: number; minY: number; width: number; height: number }`
  - `export function sectionTitleWidth(text: string): number`
  - `export function placeSkillPath(courseId: string, lessons: readonly PathLesson[], completed: readonly string[]): SkillMap`

`y` on a section title is the top of the 16px line. `x` is the center. `placeSkillPath` does not read `is_complete`.

- [x] **Step 1: Append the failing placement tests**

Append this to `platform/frontend/src/lib/skillPath.test.ts`. Add `placeSkillPath` and `type PathLesson` to the import from `./skillPath.ts`.

```ts
const LONG = 'ABCDEFGHIJABCDEFGHIJABCDEFGHIJ'

function lesson(key: string, sectionIndex: number, sectionTitle: string, optional = false, title = key): PathLesson {
  return { key, title, optional, sectionIndex, sectionTitle }
}

const htmlFive: PathLesson[] = [
  lesson('0-0', 0, 'HTML básico', false, 'Tags'),
  lesson('0-1', 0, 'HTML básico', false, 'A página'),
  lesson('0-2', 0, 'HTML básico', false, 'Texto'),
  lesson('0-3', 0, 'HTML básico', false, 'Botão'),
  lesson('0-4', 0, 'HTML básico', false, 'Link'),
]

describe('placeSkillPath', () => {
  it('places the finished HTML course and keeps the prefix when a sixth required lesson is appended', () => {
    const done = ['0-0', '0-1', '0-2', '0-3', '0-4']
    const five = placeSkillPath(HTML, htmlFive, done)
    assert.deepEqual(five.nodes.map(node => [node.key, node.x, node.y, node.state]), [
      ['0-0', 232, 64, 'done'],
      ['0-1', 232, 192, 'done'],
      ['0-2', 140, 320, 'done'],
      ['0-3', 232, 448, 'done'],
      ['0-4', 48, 576, 'done'],
    ])
    assert.equal(five.nodes.some(node => node.state === 'current'), false)
    assert.equal(five.width, 280)
    assert.equal(five.minX, 0)
    assert.equal(five.height, 643)
    assert.equal(five.sectionTitles[0].text, 'HTML básico')
    assert.equal(five.sectionTitles[0].x, 140)
    assert.equal(five.sectionTitles[0].y, 14)
    assert.equal(five.sectionTitles[0].place, 'band')
    assert.equal(five.strokes[0].d, 'M 232 64 C 232 128, 232 128, 232 192')
    assert.equal(five.strokes[0].width, 10)
    assert.equal(five.strokes[1].d, 'M 232 192 C 232 256, 140 256, 140 320')

    const sixLessons = [...htmlFive, lesson('0-5', 0, 'HTML básico', false, 'Mais')]
    const six = placeSkillPath(HTML, sixLessons, done)
    assert.deepEqual(six.nodes.slice(0, 5).map(node => [node.x, node.y]), five.nodes.map(node => [node.x, node.y]))
    assert.deepEqual([six.nodes[5].x, six.nodes[5].y, six.nodes[5].state], [140, 704, 'current'])
  })

  it('puts the Python bolt on the first unfinished required lesson', () => {
    const lessons = [
      lesson('0-0', 0, 'Python básico', false, 'Valores'),
      lesson('0-1', 0, 'Python básico', false, 'Variável'),
      lesson('0-2', 0, 'Python básico', false, 'print'),
      lesson('0-3', 0, 'Python básico', false, 'if'),
    ]
    const map = placeSkillPath(PYTHON, lessons, ['0-0'])
    assert.deepEqual(map.nodes.map(node => [node.x, node.y, node.state]), [
      [48, 64, 'done'],
      [140, 192, 'current'],
      [48, 320, 'locked'],
      [140, 448, 'locked'],
    ])
  })

  it('keeps a later required lesson done when an earlier one is still the bolt', () => {
    const map = placeSkillPath(HTML, htmlFive, ['0-0', '0-2'])
    const byKey = new Map(map.nodes.map(node => [node.key, node.state]))
    assert.equal(byKey.get('0-0'), 'done')
    assert.equal(byKey.get('0-1'), 'current')
    assert.equal(byKey.get('0-2'), 'done')
    assert.equal(byKey.get('0-3'), 'locked')
  })

  it('does not move required nodes when an optional lesson is inserted', () => {
    const plain = placeSkillPath(HTML, htmlFive.slice(0, 3), [])
    const withOptional = placeSkillPath(HTML, [
      htmlFive[0],
      lesson('0-9', 0, 'HTML básico', true, 'Extra'),
      htmlFive[1],
      htmlFive[2],
    ], [])
    assert.deepEqual(
      withOptional.nodes.filter(node => !node.optional).map(node => [node.key, node.x, node.y]),
      plain.nodes.map(node => [node.key, node.x, node.y]),
    )
  })

  it('hangs three optionals off one anchor, alternating sides', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'HTML básico', false, 'Tags'),
      lesson('0-1', 0, 'HTML básico', true, 'Um'),
      lesson('0-2', 0, 'HTML básico', true, 'Dois'),
      lesson('0-3', 0, 'HTML básico', true, 'Três'),
    ], [])
    const branches = map.nodes.filter(node => node.optional)
    assert.deepEqual(branches.map(node => [node.x, node.y, node.state]), [
      [328, 64, 'optional-open'],
      [136, 64, 'optional-open'],
      [424, 64, 'optional-open'],
    ])
    assert.equal(map.strokes.find(stroke => stroke.width === 6)?.d, 'M 260 64 L 300 64')
    assert.equal(map.nodes[0].state, 'current')
  })

  it('opens optionals that sit before the first required lesson', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'Antes', true, 'Antes'),
      lesson('1-0', 1, 'Real', false, 'Real'),
    ], [])
    assert.equal(map.nodes.find(node => node.key === '0-0')?.state, 'optional-open')
    assert.deepEqual(
      map.nodes.filter(node => node.optional).map(node => [node.x, node.y]),
      [[328, 64]],
    )
  })

  it('locks an optional whose anchor is not reached, and finishing it does not move the bolt', () => {
    // Extra is after B, so B is the anchor. B is locked, so Extra is locked. Completing only Extra leaves the bolt on A.
    const lessons = [
      lesson('0-0', 0, 'S', false, 'A'),
      lesson('0-1', 0, 'S', false, 'B'),
      lesson('0-2', 0, 'S', true, 'Extra'),
    ]
    const locked = placeSkillPath(HTML, lessons, [])
    assert.equal(locked.nodes.find(node => node.key === '0-2')?.state, 'optional-locked')
    const done = placeSkillPath(HTML, lessons, ['0-2'])
    assert.equal(done.nodes.find(node => node.key === '0-0')?.state, 'current')
    assert.equal(done.nodes.find(node => node.key === '0-2')?.state, 'optional-done')
    assert.equal(done.nodes.find(node => node.key === '0-1')?.state, 'locked')
  })

  it('lays an all-optional course in one row and does not use the 18px rule', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'Primeira', true, 'Um'),
      lesson('1-0', 1, 'Segunda', true, 'Dois'),
    ], ['1-0'])
    assert.equal(map.strokes.length, 0)
    assert.equal(map.nodes.some(node => node.state === 'current'), false)
    assert.deepEqual(map.nodes.map(node => [node.x, node.y, node.state]), [
      [236, 92, 'optional-open'],
      [44, 92, 'optional-done'],
    ])
    assert.deepEqual(map.sectionTitles.map(title => [title.text, title.x, title.y, title.place]), [
      ['Primeira', 140, 14, 'band'],
      ['Segunda', 140, 42, 'band'],
    ])
  })

  it('puts a second required section title in the band above that section, at x 140', () => {
    const map = placeSkillPath(HTML, [
      lesson('0-0', 0, 'Primeira', false, 'Um'),
      lesson('1-0', 1, 'Segunda', false, 'Dois'),
    ], [])
    assert.deepEqual(map.nodes.map(node => [node.x, node.y]), [[232, 64], [232, 220]])
    assert.deepEqual(map.sectionTitles.map(title => [title.x, title.y, title.place]), [[140, 14, 'band'], [140, 170, 'band']])
  })

  it('drops an overlapping optional-only section title below the opcional label', () => {
    const overlapped = placeSkillPath(HTML, [
      lesson('0-0', 0, LONG, false, 'Tags'),
      lesson('1-0', 1, LONG, true, 'Extra'),
    ], [])
    const title = overlapped.sectionTitles.find(item => item.place !== 'band')
    assert.deepEqual(title, { text: LONG, x: 328, y: 153, place: 'below' })

    const clear = placeSkillPath(HTML, [
      lesson('0-0', 0, LONG, false, 'Tags'),
      lesson('1-0', 1, 'A', true, 'Extra'),
    ], [])
    const above = clear.sectionTitles.find(item => item.text === 'A')
    assert.deepEqual(above, { text: 'A', x: 328, y: 2, place: 'above' })
  })

  it('lets a left branch extend the canvas past x 0', () => {
    const map = placeSkillPath(PYTHON, [
      lesson('0-0', 0, 'Python básico', false, 'Valores'),
      lesson('0-1', 0, 'Python básico', true, 'Extra'),
    ], ['0-0'])
    const extra = map.nodes.find(node => node.optional)
    assert.equal(extra?.x, -48)
    assert.equal(extra?.state, 'optional-open')
    assert.equal(map.minX, -76)
    assert.equal(map.strokes.find(stroke => stroke.width === 6)?.d, 'M 20 64 L -20 64')
  })
})
```

- [x] **Step 2: Run the test to verify it fails**

From `platform/frontend`:

```bash
npm test
```

Expected: FAIL. `placeSkillPath` is not exported (`SyntaxError` or a missing-export error from the test file). The Task 1 assertions still pass up to that import error. If the import fails the whole file, that is the expected red run.

- [x] **Step 3: Implement placement without editing the frozen walk**

Append the following to `platform/frontend/src/lib/skillPath.ts`. Do not change `fnv1a`, `mix`, `mainLanes`, `courseBranchSide`, `mainNodeY`, `connector`, `branchPlacement`, or the constants above.

```ts
const TITLE_LINE = 16
const TITLE_ABOVE = 18
const LESSON_TITLE_GAP = 6
const LESSON_TITLE_H = 33
const OPTIONAL_WORD_GAP = 4
const OPTIONAL_WORD_H = 14
const STACK_GAP = 4
const CHAR_W = 7.2
const CHAR_SP = 0.72
const COLUMN_W = 280

export interface PathLesson {
  key: string
  title: string
  optional: boolean
  sectionIndex: number
  sectionTitle: string
}

export type NodeState = 'done' | 'current' | 'locked' | 'optional-open' | 'optional-locked' | 'optional-done'

export interface PlacedNode {
  key: string
  title: string
  optional: boolean
  state: NodeState
  x: number
  y: number
}

export interface PlacedStroke {
  d: string
  width: 10 | 6
}

export interface PlacedSectionTitle {
  text: string
  x: number
  y: number
  place: 'band' | 'above' | 'below'
}

export interface SkillMap {
  nodes: PlacedNode[]
  strokes: PlacedStroke[]
  sectionTitles: PlacedSectionTitle[]
  minX: number
  minY: number
  width: number
  height: number
}

export function sectionTitleWidth(text: string): number {
  const glyphs = text.toUpperCase()
  if (glyphs.length === 0) return 0
  return glyphs.length * CHAR_W + (glyphs.length - 1) * CHAR_SP
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function titleBox(centerX: number, top: number, text: string): Box {
  const w = sectionTitleWidth(text)
  return { x: centerX - w / 2, y: top, w, h: TITLE_LINE }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function frame(nodes: PlacedNode[], strokes: PlacedStroke[], sectionTitles: PlacedSectionTitle[]): SkillMap {
  let minX = 0
  let maxX = COLUMN_W
  let minY = 0
  let maxY = PAD_TOP
  for (const node of nodes) {
    minX = Math.min(minX, node.x - NODE / 2)
    maxX = Math.max(maxX, node.x + NODE / 2)
    minY = Math.min(minY, node.y - NODE / 2)
    let bottom = node.y + NODE / 2 + LESSON_TITLE_GAP + LESSON_TITLE_H
    if (node.optional) bottom += OPTIONAL_WORD_GAP + OPTIONAL_WORD_H
    maxY = Math.max(maxY, bottom)
  }
  for (const title of sectionTitles) {
    const w = sectionTitleWidth(title.text)
    minX = Math.min(minX, title.x - w / 2)
    maxX = Math.max(maxX, title.x + w / 2)
    minY = Math.min(minY, title.y)
    maxY = Math.max(maxY, title.y + TITLE_LINE)
  }
  return { nodes, strokes, sectionTitles, minX, minY, width: maxX - minX, height: maxY - minY }
}

export function placeSkillPath(courseId: string, lessons: readonly PathLesson[], completed: readonly string[]): SkillMap {
  const done = new Set(completed)
  const required = lessons.filter(lesson => !lesson.optional)
  const firstSide = courseBranchSide(courseId)
  const nodes: PlacedNode[] = []
  const strokes: PlacedStroke[] = []
  const sectionTitles: PlacedSectionTitle[] = []
  const sectionOrder: number[] = []
  for (const lesson of lessons) {
    if (!sectionOrder.includes(lesson.sectionIndex)) sectionOrder.push(lesson.sectionIndex)
  }

  if (required.length === 0) {
    const y = PAD_TOP + sectionOrder.length * TITLE_BLOCK + NODE / 2
    lessons.forEach((lesson, index) => {
      const spot = branchPlacement(LANE_X.center, y, index, firstSide)
      nodes.push({
        key: lesson.key,
        title: lesson.title,
        optional: true,
        state: done.has(lesson.key) ? 'optional-done' : 'optional-open',
        x: spot.x,
        y: spot.y,
      })
    })
    sectionOrder.forEach((sectionIndex, index) => {
      const sample = lessons.find(lesson => lesson.sectionIndex === sectionIndex)
      if (!sample) return
      const top = PAD_TOP + index * TITLE_BLOCK + (TITLE_BLOCK - TITLE_LINE) / 2
      sectionTitles.push({ text: sample.sectionTitle, x: LANE_X.center, y: top, place: 'band' })
    })
    return frame(nodes, strokes, sectionTitles)
  }

  const lanes = mainLanes(courseId, required.length)
  const sectionStarts: number[] = []
  const seen = new Set<number>()
  required.forEach((lesson, index) => {
    if (seen.has(lesson.sectionIndex)) return
    seen.add(lesson.sectionIndex)
    sectionStarts.push(index)
  })
  const current = required.find(lesson => !done.has(lesson.key))?.key ?? null
  const requiredPos = new Map<string, { x: number; y: number }>()
  required.forEach((lesson, index) => {
    const x = LANE_X[lanes[index]]
    const y = mainNodeY(index, sectionStarts)
    requiredPos.set(lesson.key, { x, y })
    const state: NodeState = done.has(lesson.key) ? 'done' : lesson.key === current ? 'current' : 'locked'
    nodes.push({ key: lesson.key, title: lesson.title, optional: false, state, x, y })
  })
  for (let index = 0; index < required.length - 1; index++) {
    const from = requiredPos.get(required[index].key)!
    const to = requiredPos.get(required[index + 1].key)!
    strokes.push({ d: connector(from.x, from.y, to.x, to.y), width: 10 })
  }

  const titleBySection = new Map<number, Box>()
  for (const start of sectionStarts) {
    const lesson = required[start]
    const pos = requiredPos.get(lesson.key)!
    const top = pos.y - NODE / 2 - TITLE_BLOCK + (TITLE_BLOCK - TITLE_LINE) / 2
    sectionTitles.push({ text: lesson.sectionTitle, x: LANE_X.center, y: top, place: 'band' })
    titleBySection.set(lesson.sectionIndex, titleBox(LANE_X.center, top, lesson.sectionTitle))
  }

  const groups = new Map<string, PathLesson[]>()
  for (const lesson of required) groups.set(lesson.key, [])
  const beforeFirst: PathLesson[] = []
  let anchor: string | null = null
  for (const lesson of lessons) {
    if (!lesson.optional) {
      anchor = lesson.key
      continue
    }
    if (anchor === null) beforeFirst.push(lesson)
    else groups.get(anchor)!.push(lesson)
  }
  if (beforeFirst.length > 0) groups.get(required[0].key)!.unshift(...beforeFirst)

  for (const [anchorKey, optionals] of groups) {
    const parent = requiredPos.get(anchorKey)!
    const reached = anchorKey === current || done.has(anchorKey)
    optionals.forEach((lesson, index) => {
      const spot = branchPlacement(parent.x, parent.y, index, firstSide)
      const state: NodeState = done.has(lesson.key) ? 'optional-done' : reached ? 'optional-open' : 'optional-locked'
      nodes.push({ key: lesson.key, title: lesson.title, optional: true, state, x: spot.x, y: spot.y })
      const x0 = parent.x + spot.side * (NODE / 2)
      const x1 = spot.x - spot.side * (NODE / 2)
      strokes.push({ d: `M ${x0} ${parent.y} L ${x1} ${parent.y}`, width: 6 })
    })
  }

  const requiredSections = new Set(required.map(lesson => lesson.sectionIndex))
  for (const sectionIndex of sectionOrder) {
    if (requiredSections.has(sectionIndex)) continue
    const first = lessons.find(lesson => lesson.sectionIndex === sectionIndex && lesson.optional)
    if (!first) continue
    const placed = nodes.find(node => node.key === first.key)
    if (!placed) continue
    let owner: string | null = null
    for (const [anchorKey, optionals] of groups) {
      if (optionals.some(lesson => lesson.key === first.key)) owner = anchorKey
    }
    const ownerLesson = required.find(lesson => lesson.key === owner)
    const anchorBox = ownerLesson ? titleBySection.get(ownerLesson.sectionIndex) : undefined
    const defaultTop = placed.y - NODE / 2 - TITLE_ABOVE - TITLE_LINE
    const draft = titleBox(placed.x, defaultTop, first.sectionTitle)
    if (anchorBox && overlaps(draft, anchorBox)) {
      const below = placed.y + NODE / 2 + LESSON_TITLE_GAP + LESSON_TITLE_H + OPTIONAL_WORD_GAP + OPTIONAL_WORD_H + STACK_GAP
      sectionTitles.push({ text: first.sectionTitle, x: placed.x, y: below, place: 'below' })
    } else {
      sectionTitles.push({ text: first.sectionTitle, x: placed.x, y: defaultTop, place: 'above' })
    }
  }

  return frame(nodes, strokes, sectionTitles)
}
```

There is no stroke on an all-optional course. `mainLanes` returns `[]`, and there is no parent node to connect to. Positions still use `branchPlacement` around `LANE_X.center`.

- [x] **Step 4: Run the tests and the typecheck**

From `platform/frontend`:

```bash
npm test
npx tsc -b
```

Expected: PASS, including the Task 1 lock (HTML `right,right,center,right,left`, Python `left,center,left,center`). `tsc -b` exits 0. `noUnusedLocals` must stay clean.

- [x] **Step 5: Commit**

```bash
git add platform/frontend/src/lib/skillPath.ts platform/frontend/src/lib/skillPath.test.ts
git commit -m "Posicionar os nós da trilha a partir do curso"
```

---

### Task 4: Draw the path in the open course

**Files:**
- Create: `platform/frontend/src/components/SkillPath.tsx`
- Create: `platform/frontend/src/components/SkillPath.contract.test.ts`
- Modify: `platform/frontend/src/pages/CoursesPage.tsx` (the `course && !lesson` block only)
- Modify: `platform/frontend/package.json` (`test` script)
- Test: `platform/frontend/src/components/SkillPath.contract.test.ts`

**Interfaces:**
- Consumes:
  - `placeSkillPath(courseId: string, lessons: readonly PathLesson[], completed: readonly string[]): SkillMap`
  - `PathLesson`, `NodeState`, `PlacedNode`, `SkillMap`, `NODE` from `skillPath.ts`
  - `Section` from `courseModel.ts`. Each `Lesson` already has `optional`, `sectionIndex`, and `lessonIndex`.
  - The finder must already be:

```tsx
const lesson = course?.sections.flatMap(section => section.lessons.map(item => ({
  section,
  item,
  key: `${item.sectionIndex}-${item.lessonIndex}`,
})))
  .find(entry => entry.key === lessonKey)
```

If it is not, replace it with that. Do not use `si` or `li` from the filtered arrays.

- Produces: `export default function SkillPath(props: { courseId: string; sections: Section[]; completed: string[]; onOpen: (key: string) => void }): JSX.Element`

The component calls `onOpen` with the raw key. It does not call `mainLanes`. It does not fetch. Disabled states are `locked` and `optional-locked`.

- [x] **Step 1: Write the failing source contract**

Create `platform/frontend/src/components/SkillPath.contract.test.ts`:

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('SkillPath source', () => {
  it('paints the spec markers and does not invent a second path', () => {
    const source = readFileSync(join(here, 'SkillPath.tsx'), 'utf8')
    assert.match(source, /placeSkillPath/)
    assert.equal(source.includes('mainLanes'), false)
    assert.equal(source.includes('Math.random'), false)
    assert.equal(source.includes('dangerouslySetInnerHTML'), false)
    assert.equal(source.includes('foreignObject'), false)
    assert.equal(source.includes('className="card"'), false)
    assert.equal(source.includes('className={"card"}'), false)
    assert.match(source, /aria-current/)
    assert.match(source, /opcional/)
    assert.match(source, /13 2 4 14 12 14 11 22 20 10 12 10 13 2/)
    assert.match(source, /20 6 9 17 4 12/)
    assert.match(source, /aria-label="feita"/)
    assert.match(source, /radial-gradient\(circle, var\(--border\) 1\.2px, transparent 1\.4px\)/)
    assert.match(source, /overflowX: 'auto'/)
  })

  it('removes the numbered lesson list and still raises the chat only for an open lesson', () => {
    const page = readFileSync(join(here, '../pages/CoursesPage.tsx'), 'utf8')
    assert.equal(page.includes('padStart'), false)
    assert.match(page, /<SkillPath/)
    assert.match(page, /item\.sectionIndex}-\$\{item\.lessonIndex\}/)
    assert.match(page, /dataset\.courseLesson/)
    assert.match(page, /de \{item\.sections\.reduce/)
  })
})
```

Add the file to the `test` script in `platform/frontend/package.json`:

```json
"test": "node --experimental-strip-types --test src/lib/skillPath.test.ts src/lib/courseModel.test.ts src/components/SkillPath.contract.test.ts"
```

- [x] **Step 2: Run the test to verify it fails**

From `platform/frontend`:

```bash
npm test
```

Expected: FAIL while reading `SkillPath.tsx` (`ENOENT`). The lib tests are unchanged and would pass on their own.

- [x] **Step 3: Write the painter**

Create `platform/frontend/src/components/SkillPath.tsx`:

```tsx
import { placeSkillPath, NODE, type NodeState, type PathLesson } from '../lib/skillPath'
import type { Section } from '../lib/courseModel'

function openable(state: NodeState): boolean {
  return state === 'done' || state === 'current' || state === 'optional-open' || state === 'optional-done'
}

function dimmed(state: NodeState): boolean {
  return state === 'locked' || state === 'optional-locked'
}

function borderColor(state: NodeState): string {
  if (state === 'done' || state === 'optional-done') return 'var(--green)'
  if (state === 'current' || state === 'optional-open') return 'var(--cyan)'
  return 'var(--border)'
}

export default function SkillPath({
  courseId,
  sections,
  completed,
  onOpen,
}: {
  courseId: string
  sections: Section[]
  completed: string[]
  onOpen: (key: string) => void
}) {
  const lessons: PathLesson[] = sections.flatMap(section => section.lessons.map(lesson => ({
    key: `${lesson.sectionIndex}-${lesson.lessonIndex}`,
    title: lesson.title,
    optional: lesson.optional,
    sectionIndex: lesson.sectionIndex,
    sectionTitle: section.title,
  })))
  const map = placeSkillPath(courseId, lessons, completed)

  return (
    <div style={{ width: 'fit-content', maxWidth: '100%', marginInline: 'auto', overflowX: 'auto' }}>
      <div style={{
        position: 'relative',
        width: map.width,
        height: map.height,
        backgroundImage: 'radial-gradient(circle, var(--border) 1.2px, transparent 1.4px)',
        backgroundSize: '16px 16px',
      }}>
        <svg
          width={map.width}
          height={map.height}
          viewBox={`${map.minX} ${map.minY} ${map.width} ${map.height}`}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          {map.strokes.map(stroke => (
            <path
              key={stroke.d}
              d={stroke.d}
              fill="none"
              stroke="var(--muted)"
              strokeOpacity={0.45}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {map.sectionTitles.map(title => (
          <p
            key={`${title.place}-${title.x}-${title.y}-${title.text}`}
            style={{
              position: 'absolute',
              left: title.x - map.minX,
              top: title.y - map.minY,
              transform: 'translateX(-50%)',
              margin: 0,
              fontFamily: 'var(--font)',
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--faint)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {title.text}
          </p>
        ))}
        {map.nodes.map(node => {
          const locked = !openable(node.state)
          const faded = dimmed(node.state)
          return (
            <button
              key={node.key}
              type="button"
              disabled={locked}
              aria-current={node.state === 'current' ? 'step' : undefined}
              onClick={() => { if (locked) return; onOpen(node.key) }}
              style={{
                position: 'absolute',
                left: node.x - map.minX - 44,
                top: node.y - map.minY - NODE / 2,
                width: 88,
                margin: 0,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                fontFamily: 'var(--font)',
                cursor: locked ? 'default' : 'pointer',
                opacity: faded ? 0.4 : 1,
              }}
            >
              <span style={{
                display: 'grid',
                placeItems: 'center',
                width: NODE,
                height: NODE,
                marginInline: 'auto',
                borderRadius: 16,
                background: 'var(--bg-card)',
                border: `2px solid ${borderColor(node.state)}`,
                boxShadow: node.state === 'current' ? '0 0 0 4px var(--cyan-glow)' : 'none',
              }}>
                {(node.state === 'done' || node.state === 'optional-done') && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="feita">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {node.state === 'current' && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
                  </svg>
                )}
              </span>
              <span style={{
                display: 'block',
                width: 88,
                marginTop: 6,
                padding: '0 4px',
                boxSizing: 'border-box',
                fontFamily: 'var(--font)',
                fontSize: 12,
                lineHeight: 1.35,
                maxHeight: 33,
                overflow: 'hidden',
                textAlign: 'center',
                color: faded ? 'var(--muted)' : 'var(--text)',
                background: 'var(--bg)',
              }}>
                {node.title}
              </span>
              {node.optional && (
                <span style={{
                  display: 'block',
                  marginTop: 4,
                  fontFamily: 'var(--font)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  color: 'var(--muted)',
                }}>
                  opcional
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

In `CoursesPage.tsx`, import the component:

```tsx
import SkillPath from '../components/SkillPath'
```

Replace the whole `course && !lesson` block (the `div` with `maxWidth: 640`, the numbered buttons, and the check that lived on those buttons) with:

```tsx
{course && !lesson && (
  <div>
    <button onClick={() => setOpenId(null)} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
      ← cursos
    </button>
    <h1 style={{ fontSize: 32, margin: '0 0 22px' }}>{course.title}</h1>
    <SkillPath
      courseId={course.id}
      sections={course.sections}
      completed={course.completed}
      onOpen={setLessonKey}
    />
  </div>
)}
```

Do not change the card list, `LessonPlayer`, `StepView`, the `dataset.courseLesson` effect, or the POST. Do not pass `is_complete`. The page column stays `maxWidth: 1080` with `pagePadding('40px 48px 72px', isMobile, true)`.

- [x] **Step 4: Run the tests and the typecheck**

From `platform/frontend`:

```bash
npm test
npx tsc -b
```

Expected: PASS. `padStart` is gone from `CoursesPage.tsx`. `tsc -b` exits 0.

- [x] **Step 5: Check the two local courses in the browser**

Start the app only if a port is down. From `platform/worker`: `npm run dev` (http://127.0.0.1:8787). From `platform/frontend`: `npm run dev` (http://localhost:5173). Do not start `npm run dev` at the repo root.

Open http://localhost:5173/courses. If the course cards are missing, use `Entrar em modo dev`. These rows belong to `dev-user-joao`. A Google login is a different user and will not show them.

Check both a desktop width and a 390px width:

1. HTML opens Tags, A página, Texto, Botão, and Link on the right, right, center, right, and left. All five are green, none has the bolt, and each opens the player. `← cursos` returns to the cards. The HTML card still says `5 de 5`.
2. Python is left, center, left, center. Valores is green and opens. Variável has the cyan border, the glow, and the bolt, and opens. print and if are dimmed and do not open. The card still says `1 de 4`.
3. Reload the open course. The nodes stay on the same lanes.
4. Open a finished HTML lesson. The footer, the fill, and the raised chat bubble behave as before. Back on the map, the chat bubble sits at its normal offset because `dataset.courseLesson` is empty.
5. Do not insert a course into the local D1 for the hole or the optional branch. Those two cases are the unit tests in Tasks 2 and 3.

- [x] **Step 6: Commit**

```bash
git add platform/frontend/src/components/SkillPath.tsx platform/frontend/src/components/SkillPath.contract.test.ts platform/frontend/src/pages/CoursesPage.tsx platform/frontend/package.json
git commit -m "Desenhar a trilha no curso aberto"
```

---

### Task 5: Document `optional: true` on the course tools

**Files:**
- Modify: `platform/worker/src/lib/tools.ts` (the `description` and `modules` schema text of `create_course` and `append_course_modules` only)
- Modify: `platform/worker/test/mcp.test.ts`
- Test: `platform/worker/test/mcp.test.ts`

**Interfaces:**
- Consumes: `callTool`, `mcp`, `authed`, and the `beforeEach` that resets the Vitest D1. No frontend import.
- Produces: no new function. `createCourse` and `appendCourseModules` still `JSON.stringify` the array they received and still do not validate steps.

This task does not touch the local sqlite or the HTML and Python rows. The Vitest database is wiped in `beforeEach`.

- [x] **Step 1: Write the failing test**

Add this `it` inside the existing `describe('mcp')` in `platform/worker/test/mcp.test.ts`:

```ts
it('stores optional true only when the lesson sets boolean true', async () => {
  const created = await callTool(token, 'create_course', {
    title: 'Curso teste',
    description: 'desc',
    is_complete: false,
    modules: [{
      title: 'Seção',
      lessons: [
        { title: 'Obrigatória', steps: [{ type: 'text', body: 'a' }] },
        { title: 'Um extra', optional: true, steps: [{ type: 'text', body: 'b' }] },
      ],
    }],
  })

  const res = await authed('/courses')
  expect(res.status).toBe(200)
  const rows = await res.json<Array<{ id: string; modules: Array<{ lessons: Array<Record<string, unknown>> }> }>>()
  const course = rows.find(row => row.id === created.id)
  expect(course?.modules[0].lessons[0].optional).toBeUndefined()
  expect(course?.modules[0].lessons[1].optional).toBe(true)

  await callTool(token, 'append_course_modules', {
    course_id: created.id,
    is_complete: false,
    modules: [{ title: 'Mais', lessons: [{ title: 'Extra 2', optional: true, steps: [{ type: 'text', body: 'c' }] }] }],
  })
  const again = await authed('/courses')
  const rows2 = await again.json<Array<{ id: string; modules: Array<{ lessons: Array<Record<string, unknown>> }> }>>()
  const updated = rows2.find(row => row.id === created.id)
  expect(updated?.modules[1].lessons[0].optional).toBe(true)

  const list = await mcp(token, 'tools/list')
  const tools = list.body.result.tools as Array<{
    name: string
    description: string
    inputSchema: { properties: { modules?: { description: string } } }
  }>
  const create = tools.find(tool => tool.name === 'create_course')
  const append = tools.find(tool => tool.name === 'append_course_modules')
  expect(create?.description).toContain('A lesson is required unless it sets optional to boolean true. optional is a property of the lesson, not a step type. Absence means required.')
  expect(append?.description).toContain('Lessons may set optional: true, same as create_course. Absence means required.')
  expect(create?.inputSchema.properties.modules?.description).toContain('optional?: true')
  expect(append?.inputSchema.properties.modules?.description).toContain('optional: true')
})
```

- [x] **Step 2: Run the test to verify it fails**

From `platform/worker`:

```bash
npx vitest run test/mcp.test.ts
```

Expected: FAIL on the `toContain` assertions. The `GET /courses` assertions can already pass, because `run` stores the JSON as given. Do not add validation to make the test pass.

- [x] **Step 3: Change only the description strings**

Replace `create_course.description` with:

```ts
description: 'Create a lesson-path course. Each module is a section with lessons. Each lesson has steps. A step type is text, fill, browser, or terminal. text: {type, body}. fill: {type, prompt, file?, parts: [{text} or {blank, size: s|m|l}], choices?}. Fixed tokens like let, = and ; are text parts. Each blank is an input in the line, and size sets how wide the empty box is. browser: {type, prompt, starter}. terminal: {type, prompt, expect}. A lesson is required unless it sets optional to boolean true. optional is a property of the lesson, not a step type. Absence means required. Use append_course_modules to add sections later.',
```

Replace the `modules` description inside `create_course.inputSchema` with:

```ts
modules: { type: 'array', description: 'Sections. Each: {title, lessons: [{title, optional?: true, steps: [text|fill|browser|terminal]}]}', items: { type: 'object' } },
```

Replace `append_course_modules.description` with:

```ts
description: 'Add more modules to an existing in-progress course. Use the course id returned by create_course. Lessons may set optional: true, same as create_course. Absence means required.',
```

Replace the `modules` description inside `append_course_modules.inputSchema` with:

```ts
modules: { type: 'array', description: 'New modules to append. Same format as create_course, including optional: true on a lesson.', items: { type: 'object' } },
```

Leave both `run` functions as they are. Step types in these strings stay `text`, `fill`, `browser`, and `terminal`. The create description keeps the spec sentence `optional to boolean true`. Do not rewrite it so the colon form `optional: true` appears there. That colon form is the append description and the append schema, which the test already checks.

- [x] **Step 4: Run the worker typecheck and the worker tests**

From `platform/worker`:

```bash
npx tsc --noEmit
npm test
```

Expected: both exit 0. The new test sees `optional: true` only on the lessons that set it. The registry sync test still passes because tool names did not change.

- [x] **Step 5: Commit**

```bash
git add platform/worker/src/lib/tools.ts platform/worker/test/mcp.test.ts
git commit -m "Documentar optional: true em create_course"
```

---

## Spec coverage

- Lane walk, salt, prefix, HTML and Python numbers, branch side, geometry, connector, and the `Math.random` ban: Task 1.
- Raw key, hole, empty section, and `optional === true`: Task 2. The player finder uses that key from Task 2 onward.
- Node states, optional anchors, all-optional row, section titles, the 18px collision, and the canvas growing past `x = 0`: Task 3.
- Replacing the numbered list, the dotted column, the bolt, the check, `opcional`, and the manual HTML/Python pass: Task 4.
- Tool descriptions and the opaque JSON round-trip: Task 5.
- Card `N de M`, player, footer, fill, `dataset.courseLesson`, and the completion POST: left in place. Task 4's source contract checks the card reduce and the dataset line are still there.
- No new route, migration, or edit of the two local course rows: no task contains that work.
