# Mobile Dashboard and Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-only Dashboard and Profile built from a small set of reusable blocks in `platform/frontend/src/mobile/`, with desktop untouched.

**Architecture:** `DashboardPage` and `ProfilePage` keep their desktop bodies (renamed `DashboardDesktop` / `ProfileDesktop`) and gain a one-line selection wrapper that renders `DashboardMobile` / `ProfileMobile` under 768px. A mobile page is an ordered list of independent sections; each section receives one data slot (`status`, `data`, `retry`) from a page-level hook and renders loading, empty and error itself through `SectionState`. All sizes come from the scale tokens in `index.css`. Logic that can be tested without a DOM lives in dependency-free `.ts` modules covered by `node --test`; a source-contract test guards the folder.

**Tech Stack:** React 19 + Vite + TypeScript, inline styles with CSS variable tokens, `node --experimental-strip-types --test`, Playwright MCP for measurements.

**Spec:** `docs/superpowers/specs/2026-10-11-mobile-dashboard-profile.md`

## Global Constraints

- Scope is viewports `<= 768px` (`MOBILE_QUERY`). Desktop stays pixel-identical. The only edits allowed in desktop page files are the rename of the default export, the new wrapper and its imports.
- New code lives in `platform/frontend/src/mobile/` (plus two placeholder pages, two routes and two "Mais" entries in Task 6). One component or module per file.
- Sizes only from tokens: type `var(--fs-xs|sm|base|input|lg|xl)`, controls `var(--ctl-primary|md|chip|icon|row)`, spacing `var(--sp-1..7)`, radius `var(--radius-sm|md|lg|pill)`. No raw `fontSize` numbers anywhere in `src/mobile/`.
- JetBrains Mono only (`var(--font)`), existing dark palette, existing `.section-label` class for section labels.
- At most two raised surfaces per screen in new blocks (`--bg-card`, 1px `--border`, `--radius-lg`). No emoji icons, no `MOCK_` data, no `textShadow`, `backdropFilter` or gradients in new blocks. One exception, by João: `src/mobile/profile/IdentitySection.tsx` keeps the cover look (gradient scrim, frosted backdrop, rank-colour glow, ring).
- The Dashboard greeting ("boa noite, **João**" with the cyan name, and the date) is kept exactly as on desktop.
- Locked badges show a lock icon only (no progress numbers). History status words are never relabelled (`em progresso` stays `em progresso`).
- Friends and Guild are not on the mobile Profile; they get `/friends` and `/guild` placeholder pages and two entries in the "Mais" sheet. Desktop navigation is unchanged.
- Cover adjust and upload stay desktop-only; the mobile cover is display only.
- UI copy stays Portuguese; code, comments and commit messages are English.
- Commits: imperative English subject, one per task, ending with:
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01TqKRYPE7bv9MVhyz7FVdUb`
  Never push.
- Frontend checks after every task: `npx tsc -b` and `npm test` in `platform/frontend`.

## Review Focus

1. **Brand-new account:** empty `heatmap`, zero badges, no insights, no recent items, no resume, no exercises. Every section shows an empty state or is omitted; nothing throws. (Pinned by `heatmap.test.ts`, `badges.test.ts`, `nextAction.test.ts` and the empty states in Tasks 4-5.)
2. **One endpoint fails:** only that section shows "tentar de novo"; the rest of the page renders. (Pinned by the offline check in Task 4 Step 6.)
3. **Long titles and names:** exercise titles, bio, handles and the user name ellipsize or wrap inside 350px; no horizontal overflow. (Pinned by the contract test: `ListRow` and `ActionCard` titles use `textOverflow: 'ellipsis'`, and the sweep in Task 7.)
4. **Resume already fully passed:** falls back to today's exercise, never a "continuar" on a finished item. (Pinned by `nextAction.test.ts`.)
5. **Corrupt or blocked storage:** the analysis "new" dot treats an invalid or missing marker as "new" and never throws when `localStorage` is unavailable. (Pinned by `insightSeen.test.ts` and the try/catch in Task 4.)

---

## File map

| File | Responsibility |
|---|---|
| `src/mobile/rank.ts` | Pure: rank colours, next rank, honor missing, progress percent |
| `src/mobile/heatmap.ts` | Pure: weeks grid for the last N weeks, day description, level colours |
| `src/mobile/badges.ts` | Pure: badge definitions and unlock rules |
| `src/mobile/nextAction.ts` | Pure: modes, distinct count, resume/start decision |
| `src/mobile/insightSeen.ts` | Pure: is an insight new relative to an opened marker |
| `src/mobile/format.ts` | Pure: `timeAgo`, `statusWord` |
| `src/mobile/types.ts` | API shapes used by mobile (copied, type-only) |
| `src/mobile/api.ts` | Five module-level fetchers (stable references for `useSlot`) |
| `src/mobile/useSlot.ts` | One fetch with `status`, `data`, `retry` |
| `src/mobile/MobilePage.tsx` | Page shell: gutters, insets, dock space, optional header and background |
| `src/mobile/Section.tsx`, `Surface.tsx`, `Stat.tsx`, `RankCard.tsx`, `ActionCard.tsx`, `ListRow.tsx`, `Readout.tsx`, `SectionState.tsx` | The blocks |
| `src/mobile/dashboard/*` | `GreetingHeader`, `StatusSection`, `NextActionSection`, `AnalysisSection`, `HistorySection`, `useDashboardData`, `DashboardMobile` |
| `src/mobile/profile/*` | `IdentitySection`, `HeatmapSection`, `BadgesSection`, `BioRow`, `SocialRows`, `useProfileData`, `ProfileMobile` |
| `src/mobile/mobile.contract.test.ts` | Source-contract guard for the folder |
| `src/pages/DashboardPage.tsx`, `src/pages/ProfilePage.tsx` | Rename default export + selection wrapper only |
| `src/pages/FriendsPage.tsx`, `src/pages/GuildPage.tsx`, `src/App.tsx`, `src/components/layout/navItems.tsx` | Task 6 |

## Verification probes (used by Tasks 3-7)

Mobile probe: resize to 390x844, log in with "Entrar em modo dev", open the route, run `browser_evaluate`:

```js
async () => {
  await new Promise(r => setTimeout(r, 1500))
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const h = e => Math.round(e.getBoundingClientRect().height)
  const ctrls = [...document.querySelectorAll('button, a, input, textarea, select, [role=button]')].filter(vis)
  const texts = [...document.querySelectorAll('h1,h2,h3,h4,p,span,label,li,div')].filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
  const dock = document.querySelector('nav')
  const primary = [...document.querySelectorAll('button')].find(b => h(b) === 48 && b.getBoundingClientRect().width > 200)
  return {
    path: location.pathname, vw: innerWidth,
    under36: ctrls.filter(e => h(e) < 36).map(e => ({ t: (e.innerText || e.ariaLabel || '').trim().slice(0, 16), h: h(e) })),
    under44: ctrls.filter(e => h(e) < 44).length,
    textUnder11: texts.filter(e => parseFloat(getComputedStyle(e).fontSize) < 10.5).length,
    sizes: [...new Set(texts.map(e => Math.round(parseFloat(getComputedStyle(e).fontSize))))].sort((a, b) => a - b).join(','),
    overflowX: document.documentElement.scrollWidth > innerWidth,
    primaryBottom: primary ? Math.round(primary.getBoundingClientRect().bottom) : null,
    dockTop: dock ? Math.round(dock.getBoundingClientRect().top) : null,
  }
}
```

Desktop snapshot (must be byte-identical before and after a task): resize to 1440x900, open the route, run `browser_evaluate` with `filename` `.playwright-mcp/desktop-<route>-<before|after>.json`:

```js
async () => { await new Promise(r => setTimeout(r, 1800)); return [...document.querySelectorAll('main *, nav *')].slice(0, 1500).map((e, i) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return [i, e.tagName, s.fontSize, s.lineHeight, s.borderRadius, s.padding, s.gap, Math.round(r.width), Math.round(r.height)].join('|') }) }
```

Compare with `diff <before> <after>` (no output means identical). Take every `before` snapshot BEFORE editing the page, in Task 3 for `/` and `/profile`. The greeting word changes with the hour; if the only difference is the H1 width, re-run in the same time of day.

---

### Task 1: Pure logic modules with tests

**Files:**
- Create: `platform/frontend/src/mobile/rank.ts`, `heatmap.ts`, `badges.ts`, `nextAction.ts`, `insightSeen.ts`, `format.ts`
- Create (tests): `rank.test.ts`, `heatmap.test.ts`, `badges.test.ts`, `nextAction.test.ts`, `insightSeen.test.ts`, `format.test.ts` (same folder)
- Modify: `platform/frontend/package.json` (append the six test files to the `test` script)

**Interfaces:**
- Produces (all named exports, no imports in these modules):
  - `rank.ts`: `rankColor(rank: string): string`, `nextRank(rank: string): string | null`, `honorMissing(honor: number, honorForNext: number): number`, `progressPercent(progress: number): number`
  - `heatmap.ts`: `interface HeatmapDay`, `interface HeatCell`, `buildWeeks(heatmap, today: Date, weekCount: number): (HeatCell | null)[][]`, `describeDay(date: string, data: HeatmapDay): string`, `levelOf(total: number): 0|1|2|3|4`, `LEVEL_COLOR: string[]`, `TODAY_EMPTY: string`
  - `badges.ts`: `interface BadgeStats`, `interface BadgeDef`, `BADGES: BadgeDef[]`, `isUnlocked(def: BadgeDef, stats: BadgeStats): boolean`
  - `nextAction.ts`: `type ModeKey`, `MODE_LABEL`, `pickModes`, `distinctModeCount`, `pickNextAction`
  - `insightSeen.ts`: `isInsightNew(generatedAt: string, openedAt: string | null): boolean`
  - `format.ts`: `timeAgo(iso: string, now?: number): string`, `statusWord(status: string): string`

- [ ] **Step 1: Write the failing tests**

`src/mobile/rank.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { honorMissing, nextRank, progressPercent, rankColor } from './rank.ts'

describe('rank', () => {
  it('maps a rank to its colour and falls back for unknown ranks', () => {
    assert.equal(rankColor('8kyu'), '#9b9b9b')
    assert.equal(rankColor('1kyu'), '#a855f7')
    assert.equal(rankColor('banana'), '#525252')
  })
  it('finds the next rank and stops at 1kyu', () => {
    assert.equal(nextRank('8kyu'), '7kyu')
    assert.equal(nextRank('2kyu'), '1kyu')
    assert.equal(nextRank('1kyu'), null)
    assert.equal(nextRank('???'), null)
  })
  it('never reports negative missing honor', () => {
    assert.equal(honorMissing(84, 120), 36)
    assert.equal(honorMissing(130, 120), 0)
  })
  it('clamps and rounds progress to 0-100', () => {
    assert.equal(progressPercent(0.624), 62)
    assert.equal(progressPercent(1.4), 100)
    assert.equal(progressPercent(-1), 0)
    assert.equal(progressPercent(Number.NaN), 0)
  })
})
```

`src/mobile/heatmap.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildWeeks, describeDay, levelOf } from './heatmap.ts'

const TODAY = new Date(2026, 9, 11)   // Sunday 11 Oct 2026, local time

describe('buildWeeks', () => {
  it('returns the requested number of weeks of 7 slots and ends on today', () => {
    const weeks = buildWeeks({}, TODAY, 20)
    assert.equal(weeks.length, 20)
    for (const week of weeks) assert.equal(week.length, 7)
    const cells = weeks.flat().filter(c => c !== null)
    assert.equal(cells.filter(c => c.isToday).length, 1)
    assert.equal(cells[cells.length - 1].isToday, true)
  })
  it('is safe for an account with no activity at all', () => {
    const cells = buildWeeks({}, TODAY, 20).flat().filter(c => c !== null)
    assert.equal(cells.every(c => c.data.total === 0), true)
  })
  it('looks activity up by the cell date', () => {
    const today = buildWeeks({}, TODAY, 20).flat().filter(c => c !== null).find(c => c.isToday)!
    const weeks = buildWeeks({ [today.date]: { total: 3, katas: 2, books: 0, courses: 1 } }, TODAY, 20)
    const found = weeks.flat().filter(c => c !== null).find(c => c.isToday)!
    assert.equal(found.data.total, 3)
  })
  it('builds a full year when asked for 53 weeks', () => {
    assert.equal(buildWeeks({}, TODAY, 53).length, 53)
  })
})

describe('describeDay and levelOf', () => {
  it('says no activity for an empty day', () => {
    assert.match(describeDay('2026-10-07', { total: 0, katas: 0, books: 0, courses: 0 }), /sem atividade/)
  })
  it('pluralises katas, aulas and livros', () => {
    const text = describeDay('2026-10-07', { total: 5, katas: 2, books: 1, courses: 1 })
    assert.match(text, /2 katas/)
    assert.match(text, /1 aula\b/)
    assert.match(text, /1 livro\b/)
  })
  it('caps the colour level at 4', () => {
    assert.equal(levelOf(0), 0)
    assert.equal(levelOf(1), 1)
    assert.equal(levelOf(3), 3)
    assert.equal(levelOf(9), 4)
  })
})
```

`src/mobile/badges.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BADGES, isUnlocked, type BadgeStats } from './badges.ts'

const ZERO: BadgeStats = { total_completed: 0, current_streak: 0, days_active: 0, honor: 0, total_attempted: 0, completion_rate: 0 }
const unlocked = (stats: BadgeStats) => BADGES.filter(b => isUnlocked(b, stats)).map(b => b.id)

describe('badges', () => {
  it('unlocks nothing for a new account', () => {
    assert.deepEqual(unlocked(ZERO), [])
  })
  it('unlocks the first-step and honor badges by threshold', () => {
    assert.deepEqual(unlocked({ ...ZERO, total_completed: 1 }), ['first'])
    assert.deepEqual(unlocked({ ...ZERO, honor: 120 }), ['honor30', 'honor120'])
  })
  it('requires both attempts and accuracy for the sharpshooter badge', () => {
    assert.equal(unlocked({ ...ZERO, total_attempted: 5, completion_rate: 0.79 }).includes('sharpshooter'), false)
    assert.equal(unlocked({ ...ZERO, total_attempted: 5, completion_rate: 0.8 }).includes('sharpshooter'), true)
  })
  it('keeps eight definitions with unique ids', () => {
    assert.equal(BADGES.length, 8)
    assert.equal(new Set(BADGES.map(b => b.id)).size, 8)
  })
})
```

`src/mobile/nextAction.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { distinctModeCount, pickModes, pickNextAction } from './nextAction.ts'

const ex = (slug: string, difficulty: string) => ({ slug, title: slug, difficulty })

describe('nextAction', () => {
  it('resumes an unfinished item', () => {
    const action = pickNextAction({ exercise: ex('a', '8kyu'), passed_count: 1, total_count: 3 }, [ex('b', '6kyu')])
    assert.equal(action?.kind, 'resume')
    assert.equal(action?.slug, 'a')
  })
  it('falls back to a new exercise when the resume is fully passed', () => {
    const action = pickNextAction({ exercise: ex('a', '8kyu'), passed_count: 3, total_count: 3 }, [ex('b', '6kyu')])
    assert.equal(action?.kind, 'start')
    assert.equal(action?.slug, 'b')
  })
  it('returns null when there is nothing to do', () => {
    assert.equal(pickNextAction(null, []), null)
  })
  it('starts with the hardest exercise for rank up', () => {
    const action = pickNextAction(null, [ex('easy', '8kyu'), ex('hard', '6kyu')])
    assert.equal(action?.slug, 'hard')
  })
  it('counts only distinct modes', () => {
    assert.equal(distinctModeCount([]), 0)
    assert.equal(distinctModeCount([ex('a', '8kyu')]), 1)
    assert.equal(distinctModeCount([ex('a', '8kyu'), ex('b', '6kyu')]), 2)
    assert.equal(pickModes([ex('a', '8kyu')]).practice?.slug, 'a')
  })
})
```

`src/mobile/insightSeen.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isInsightNew } from './insightSeen.ts'

describe('isInsightNew', () => {
  it('is new when it was never opened or the marker is invalid', () => {
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', null), true)
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', 'not a date'), true)
  })
  it('is new only when generated after the last open', () => {
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', '2026-10-09T10:00:00Z'), true)
    assert.equal(isInsightNew('2026-10-10T10:00:00Z', '2026-10-11T10:00:00Z'), false)
  })
  it('is never new when its own date is invalid', () => {
    assert.equal(isInsightNew('???', null), false)
  })
})
```

`src/mobile/format.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { statusWord, timeAgo } from './format.ts'

const NOW = Date.parse('2026-10-11T12:00:00Z')

describe('format', () => {
  it('formats elapsed time compactly', () => {
    assert.equal(timeAgo('2026-10-11T11:59:00Z', NOW), 'agora')
    assert.equal(timeAgo('2026-10-11T09:00:00Z', NOW), '3h')
    assert.equal(timeAgo('2026-10-08T12:00:00Z', NOW), '3d')
  })
  it('never relabels a status', () => {
    assert.equal(statusWord('passed'), 'concluído')
    assert.equal(statusWord('failed'), 'falhou')
    assert.equal(statusWord('in_progress'), 'em progresso')
    assert.equal(statusWord('whatever'), 'whatever')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `platform/frontend`): `node --experimental-strip-types --test src/mobile/rank.test.ts src/mobile/heatmap.test.ts src/mobile/badges.test.ts src/mobile/nextAction.test.ts src/mobile/insightSeen.test.ts src/mobile/format.test.ts`
Expected: every file FAILS with `ERR_MODULE_NOT_FOUND` for its sibling module.

- [ ] **Step 3: Write the modules**

`src/mobile/rank.ts`:

```ts
const RANK_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}

export function rankColor(rank: string): string {
  return RANK_COLOR[rank] ?? '#525252'
}

export function nextRank(rank: string): string | null {
  const n = Number.parseInt(rank, 10)
  if (!Number.isFinite(n) || n <= 1) return null
  return `${n - 1}kyu`
}

export function honorMissing(honor: number, honorForNext: number): number {
  return Math.max(0, Math.round(honorForNext - honor))
}

export function progressPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(100, Math.max(0, Math.round(progress * 100)))
}
```

`src/mobile/heatmap.ts`:

```ts
export interface HeatmapDay { total: number; katas: number; books: number; courses: number }
export interface HeatCell { date: string; data: HeatmapDay; isToday: boolean; inRange: boolean }

const EMPTY: HeatmapDay = { total: 0, katas: 0, books: 0, courses: 0 }

export const LEVEL_COLOR = [
  'rgba(255,255,255,0.05)', 'rgba(34,211,238,0.30)', 'rgba(34,211,238,0.52)',
  'rgba(34,211,238,0.74)', 'rgba(34,211,238,0.93)',
]
export const TODAY_EMPTY = 'rgba(34,211,238,0.13)'

export function levelOf(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0
  if (total >= 4) return 4
  return total as 1 | 2 | 3
}

// Weeks start on Sunday. The last week is padded with nulls after today.
export function buildWeeks(heatmap: Record<string, HeatmapDay>, today: Date, weekCount: number): (HeatCell | null)[][] {
  const end = new Date(today)
  end.setHours(0, 0, 0, 0)
  const gridStart = new Date(end)
  gridStart.setDate(end.getDate() - end.getDay() - (weekCount - 1) * 7)

  const weeks: (HeatCell | null)[][] = []
  let week: (HeatCell | null)[] = []
  const cur = new Date(gridStart)
  while (cur <= end) {
    const key = cur.toISOString().split('T')[0]
    week.push({ date: key, data: heatmap[key] ?? EMPTY, isToday: cur.getTime() === end.getTime(), inRange: true })
    if (week.length === 7) { weeks.push(week); week = [] }
    cur.setDate(cur.getDate() + 1)
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

export function describeDay(date: string, data: HeatmapDay): string {
  const when = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  if (data.total === 0) return `${when} · sem atividade`
  const parts: string[] = []
  if (data.katas > 0) parts.push(`${data.katas} kata${data.katas !== 1 ? 's' : ''}`)
  if (data.courses > 0) parts.push(`${data.courses} aula${data.courses !== 1 ? 's' : ''}`)
  if (data.books > 0) parts.push(`${data.books} livro${data.books !== 1 ? 's' : ''}`)
  return `${when} · ${parts.join(', ')}`
}
```

`src/mobile/badges.ts`:

```ts
export interface BadgeStats {
  total_completed: number; current_streak: number; days_active: number
  honor: number; total_attempted: number; completion_rate: number
}
export interface BadgeDef {
  id: string; label: string; hint: string; svg: string; color: string
  cond: (s: BadgeStats) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first', label: 'Primeiro Passo', hint: 'complete 1 exercício', svg: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', cond: s => s.total_completed >= 1, color: '#f97316' },
  { id: 'five', label: 'Cadência', hint: 'complete 5 exercícios', svg: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', cond: s => s.total_completed >= 5, color: '#eab308' },
  { id: 'streak3', label: 'Chama', hint: '3 dias seguidos', svg: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z', cond: s => s.current_streak >= 3, color: '#ef4444' },
  { id: 'streak7', label: 'Incêndio', hint: '7 dias seguidos', svg: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z M12 6v6l4 2', cond: s => s.current_streak >= 7, color: '#ef4444' },
  { id: 'active10', label: 'Constante', hint: '10 dias ativos', svg: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5l6-6-1.4-1.4L11 13.2l-2.6-2.6L7 12l4 5z', cond: s => s.days_active >= 10, color: '#22c55e' },
  { id: 'honor30', label: 'Aprendiz', hint: '30 de honor', svg: 'M12 15l-4 5h8l-4-5zm0-13C8.1 2 5 5.1 5 9c0 3.9 7 13 7 13s7-9.1 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5z', cond: s => s.honor >= 30, color: '#3b82f6' },
  { id: 'honor120', label: 'Veterano', hint: '120 de honor', svg: 'M12 1l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z', cond: s => s.honor >= 120, color: '#a855f7' },
  { id: 'sharpshooter', label: 'Preciso', hint: '5 tentativas com 80% de acerto', svg: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm0-12a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z', cond: s => s.total_attempted >= 5 && s.completion_rate >= 0.8, color: '#22d3ee' },
]

export function isUnlocked(def: BadgeDef, stats: BadgeStats): boolean {
  return def.cond(stats)
}
```

`src/mobile/nextAction.ts`:

```ts
export interface ExerciseLite { title: string; slug: string; difficulty: string }
export interface ResumeLite { exercise: ExerciseLite; passed_count: number; total_count: number }
export type ModeKey = 'rankup' | 'warmup' | 'practice'
export interface NextAction {
  kind: 'resume' | 'start'
  slug: string; title: string; difficulty: string
  progress: string | null
}

export const MODE_LABEL: Record<ModeKey, string> = { rankup: 'Rank Up', warmup: 'Aquecimento', practice: 'Praticar' }

const ORDER: Record<string, number> = {
  '8kyu': 0, '7kyu': 1, '6kyu': 2, '5kyu': 3, '4kyu': 4, '3kyu': 5, '2kyu': 6, '1kyu': 7,
}

// hardest -> rankup, easiest -> warmup, middle -> practice (same rule as the desktop dashboard)
export function pickModes<T extends ExerciseLite>(exercises: T[]): Record<ModeKey, T | null> {
  if (exercises.length === 0) return { rankup: null, warmup: null, practice: null }
  const sorted = [...exercises].sort((a, b) => (ORDER[b.difficulty] ?? 0) - (ORDER[a.difficulty] ?? 0))
  return {
    rankup: sorted[0] ?? null,
    warmup: sorted[sorted.length - 1] ?? null,
    practice: sorted.length >= 3 ? sorted[1] : sorted[1] ?? null,
  }
}

export function distinctModeCount(exercises: ExerciseLite[]): number {
  const modes = pickModes(exercises)
  return new Set(Object.values(modes).filter((e): e is ExerciseLite => e !== null).map(e => e.slug)).size
}

export function pickNextAction(resume: ResumeLite | null, exercises: ExerciseLite[], mode: ModeKey = 'rankup'): NextAction | null {
  if (resume && resume.total_count > 0 && resume.passed_count < resume.total_count) {
    const { slug, title, difficulty } = resume.exercise
    return { kind: 'resume', slug, title, difficulty, progress: `${resume.passed_count}/${resume.total_count} testes` }
  }
  const chosen = pickModes(exercises)[mode]
  if (!chosen) return null
  return { kind: 'start', slug: chosen.slug, title: chosen.title, difficulty: chosen.difficulty, progress: null }
}
```

`src/mobile/insightSeen.ts`:

```ts
export function isInsightNew(generatedAt: string, openedAt: string | null): boolean {
  const generated = Date.parse(generatedAt)
  if (Number.isNaN(generated)) return false
  if (!openedAt) return true
  const opened = Date.parse(openedAt)
  if (Number.isNaN(opened)) return true
  return generated > opened
}
```

`src/mobile/format.ts`:

```ts
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6)
  const d = Math.floor(diff / 8.64e7)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  return 'agora'
}

const STATUS: Record<string, string> = { passed: 'concluído', failed: 'falhou', in_progress: 'em progresso' }

export function statusWord(status: string): string {
  return STATUS[status] ?? status
}
```

- [ ] **Step 4: Register the tests and run everything**

In `platform/frontend/package.json`, append to the end of the `test` script (before the closing quote): ` src/mobile/rank.test.ts src/mobile/heatmap.test.ts src/mobile/badges.test.ts src/mobile/nextAction.test.ts src/mobile/insightSeen.test.ts src/mobile/format.test.ts`.
Run: `npm test` and `npx tsc -b`.
Expected: all new tests pass (the six files, 20 tests), the existing suite stays green, `tsc` exit 0. Test files are excluded from `tsc` by `"exclude": ["src/**/*.test.ts"]`.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/package.json platform/frontend/src/mobile
git commit -m "Add the pure logic for the mobile Dashboard and Profile"
```

---

### Task 2: Building blocks, data plumbing and the guard test

**Files:**
- Create: `src/mobile/types.ts`, `api.ts`, `useSlot.ts`, `MobilePage.tsx`, `Section.tsx`, `Surface.tsx`, `Stat.tsx`, `RankCard.tsx`, `ActionCard.tsx`, `ListRow.tsx`, `Readout.tsx`, `SectionState.tsx`
- Create (test): `src/mobile/mobile.contract.test.ts`
- Modify: `platform/frontend/package.json` (append `src/mobile/mobile.contract.test.ts`)

**Interfaces:**
- Consumes: the Task 1 modules and `lib/layout.ts` (`pagePadding`).
- Produces: `useSlot<T>(load: () => Promise<T>): Slot<T>` with `Slot<T> = { status: 'loading' | 'ready' | 'error'; data: T | null; retry: () => void }`; `fetchStats`, `fetchExercises`, `fetchResume`, `fetchInsights`, `fetchRecent`; blocks with the props listed in the code below.

- [ ] **Step 1: Write the failing guard test**

`src/mobile/mobile.contract.test.ts`:

```ts
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('.', import.meta.url))

const files = readdirSync(ROOT, { recursive: true, encoding: 'utf8' })
  .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f))
  .map(f => ({ name: f.replace(/\\/g, '/'), text: readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n') }))

// João keeps the cover look on the mobile Profile identity block.
const COVER_EXCEPTION = 'profile/IdentitySection.tsx'

describe('src/mobile contract', () => {
  it('has the building blocks', () => {
    for (const name of ['MobilePage', 'Section', 'Surface', 'Stat', 'RankCard', 'ActionCard', 'ListRow', 'Readout', 'SectionState']) {
      assert.ok(files.some(f => f.name === `${name}.tsx`), `${name}.tsx is missing`)
    }
  })
  it('uses no raw font sizes', () => {
    for (const f of files) {
      assert.doesNotMatch(f.text, /fontSize:\s*['"]?\d/, `${f.name} has a raw fontSize`)
    }
  })
  it('renders no mock data and no emoji', () => {
    for (const f of files) {
      assert.doesNotMatch(f.text, /MOCK_/, `${f.name} references mock data`)
      assert.doesNotMatch(f.text, /\p{Extended_Pictographic}/u, `${f.name} has an emoji`)
    }
  })
  it('does not import desktop pages', () => {
    for (const f of files) {
      assert.doesNotMatch(f.text, /from\s+['"][./]+\/pages\//, `${f.name} imports a page`)
    }
  })
  it('has no glow, blur or gradient outside the cover exception', () => {
    for (const f of files.filter(x => x.name !== COVER_EXCEPTION)) {
      assert.doesNotMatch(f.text, /textShadow|backdropFilter|linear-gradient|radial-gradient/, `${f.name} has decoration`)
    }
  })
  it('keeps long titles from breaking the layout', () => {
    for (const name of ['ListRow.tsx', 'ActionCard.tsx']) {
      const f = files.find(x => x.name === name)
      assert.ok(f, `${name} is missing`)
      assert.match(f.text, /textOverflow:\s*'ellipsis'/, `${name} must ellipsize its title`)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --experimental-strip-types --test src/mobile/mobile.contract.test.ts`
Expected: FAIL on "has the building blocks" (`MobilePage.tsx is missing`) and on the ellipsis test.

- [ ] **Step 3: Write the data plumbing**

`src/mobile/types.ts`:

```ts
import type { HeatmapDay } from './heatmap'

export interface UserStats {
  user: { name: string; avatar_url: string | null; cover_url: string | null; bio: string | null; social_links: Record<string, string> }
  rank: string; rank_progress: number; honor: number; honor_for_next_rank: number
  total_completed: number; total_attempted: number; completion_rate: number
  current_streak: number; days_active: number; days_since_joined: number
  heatmap: Record<string, HeatmapDay>
  weekly_summary: { completed_last_7_days: number }
}
export interface Exercise { id: string; title: string; slug: string; difficulty: string }
export interface Resume {
  exercise: { title: string; slug: string; difficulty: string }
  passed_count: number; total_count: number; submitted_at: string | null
}
export interface Insight { message: string; generated_at: string; highlights: string[]; gaps: string[] }
export interface RecentExercise { id: string; title: string; slug: string; difficulty: string; status: string; submitted_at: string }
```

`src/mobile/api.ts`:

```ts
import api from '../api/client'
import type { Exercise, Insight, RecentExercise, Resume, UserStats } from './types'

export const fetchStats = () => api.get('/users/me/stats').then(r => r.data as UserStats)
export const fetchExercises = () => api.get('/exercises/today').then(r => (r.data ?? []) as Exercise[])
export const fetchResume = () => api.get('/progress/resume').then(r => (r.data ?? null) as Resume | null).catch(() => null)
export const fetchInsights = () => api.get('/agent/insights').then(r => (r.data ?? []) as Insight[])
export const fetchRecent = () => api.get('/progress/recent-exercises').then(r => (r.data ?? []) as RecentExercise[])
```

`src/mobile/useSlot.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'

export type SlotStatus = 'loading' | 'ready' | 'error'
export interface Slot<T> { status: SlotStatus; data: T | null; retry: () => void }

// `load` must be a stable reference (a module-level function).
export function useSlot<T>(load: () => Promise<T>): Slot<T> {
  const [state, setState] = useState<{ status: SlotStatus; data: T | null }>({ status: 'loading', data: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setState(s => ({ status: 'loading', data: s.data }))
    load()
      .then(data => { if (alive) setState({ status: 'ready', data }) })
      .catch(() => { if (alive) setState({ status: 'error', data: null }) })
    return () => { alive = false }
  }, [load, tick])

  const retry = useCallback(() => setTick(t => t + 1), [])
  return { ...state, retry }
}
```

- [ ] **Step 4: Write the blocks**

`src/mobile/MobilePage.tsx`:

```tsx
import type { ReactNode } from 'react'
import { pagePadding } from '../lib/layout'

interface MobilePageProps {
  children: ReactNode
  header?: ReactNode        // full-bleed block above the padded content (the Profile cover)
  background?: ReactNode    // decoration behind the content (store cosmetic)
}

export default function MobilePage({ children, header, background }: MobilePageProps) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
      {background && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}>
          {background}
        </div>
      )}
      <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
        {header}
        <div style={{ padding: pagePadding(header ? '20px 0 24px' : '0 0 24px', true, !header), fontFamily: 'var(--font)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
```

`src/mobile/Surface.tsx`:

```tsx
import type { KeyboardEvent, ReactNode } from 'react'

interface SurfaceProps { children: ReactNode; onClick?: () => void }

export default function Surface({ children, onClick }: SurfaceProps) {
  const onKeyDown = (e: KeyboardEvent) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick() }
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? onKeyDown : undefined}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: 'var(--sp-4)', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {children}
    </div>
  )
}
```

`src/mobile/Section.tsx`:

```tsx
import { useState, type ReactNode } from 'react'

interface SectionProps {
  label: string
  summary?: string              // one line shown next to the label while collapsed
  collapsible?: boolean
  defaultOpen?: boolean
  dot?: boolean                 // "new" marker
  onToggle?: (open: boolean) => void
  children: ReactNode
}

export default function Section({ label, summary, collapsible = false, defaultOpen = false, dot = false, onToggle, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  const head = (
    <>
      <span className="section-label">{label}</span>
      {dot && <span aria-label="novo" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0 }} />}
      {summary && !open && (
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
          {summary}
        </span>
      )}
      {collapsible && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none' }}>
          <polyline points="9 6 15 12 9 18" />
        </svg>
      )}
    </>
  )

  if (!collapsible) {
    return (
      <section style={{ marginTop: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>{head}</div>
        {children}
      </section>
    )
  }

  return (
    <section style={{ marginTop: 'var(--sp-6)', borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => { const next = !open; setOpen(next); onToggle?.(next) }}
        style={{
          width: '100%', minHeight: 'var(--ctl-row)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontFamily: 'var(--font)', textAlign: 'left',
        }}
      >
        {head}
      </button>
      {open && <div style={{ paddingBottom: 'var(--sp-3)' }}>{children}</div>}
    </section>
  )
}
```

`src/mobile/Stat.tsx`:

```tsx
import { Children, type ReactNode } from 'react'

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)', lineHeight: 'var(--lh-lg)' }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', marginTop: 'var(--sp-1)' }}>{label}</div>
    </div>
  )
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', marginTop: 'var(--sp-4)' }}>
      {Children.toArray(children).map((child, i) => (
        <div key={i} style={{ flex: 1, minWidth: 0, borderLeft: i === 0 ? 'none' : '1px solid var(--border)' }}>{child}</div>
      ))}
    </div>
  )
}
```

`src/mobile/RankCard.tsx`:

```tsx
import { honorMissing, nextRank, progressPercent, rankColor } from './rank'

interface RankCardProps { rank: string; honor: number; honorForNext: number; progress: number }

export default function RankCard({ rank, honor, honorForNext, progress }: RankCardProps) {
  const color = rankColor(rank)
  const next = nextRank(rank)
  const pct = progressPercent(progress)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
        <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color, lineHeight: 'var(--lh-xl)' }}>{rank}</span>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>{honor.toLocaleString('pt-BR')} / {honorForNext.toLocaleString('pt-BR')} honor</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', marginTop: 'var(--sp-3)' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      {next && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginTop: 'var(--sp-2)' }}>
          faltam {honorMissing(honor, honorForNext).toLocaleString('pt-BR')} para {next}
        </div>
      )}
    </div>
  )
}
```

`src/mobile/ActionCard.tsx`:

```tsx
import type { ReactNode } from 'react'
import Surface from './Surface'

interface ActionCardProps {
  eyebrow: string
  title: string
  tag?: string
  tagColor?: string
  meta?: string
  actionLabel: string
  onAction: () => void
  secondary?: ReactNode
}

export default function ActionCard({ eyebrow, title, tag, tagColor, meta, actionLabel, onAction, secondary }: ActionCardProps) {
  return (
    <Surface>
      <span className="section-label">{eyebrow}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
        {tag && <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: tagColor ?? 'var(--muted)', flexShrink: 0 }}>{tag}</span>}
        <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      </div>
      {meta && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginTop: 'var(--sp-1)' }}>{meta}</div>}
      <button
        type="button"
        onClick={onAction}
        style={{
          width: '100%', minHeight: 'var(--ctl-primary)', marginTop: 'var(--sp-4)', cursor: 'pointer',
          background: 'var(--cyan-faint)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 'var(--radius-md)',
          color: 'var(--cyan)', fontSize: 'var(--fs-base)', fontWeight: 600, fontFamily: 'var(--font)',
        }}
      >
        {actionLabel}
      </button>
      {secondary}
    </Surface>
  )
}
```

`src/mobile/ListRow.tsx`:

```tsx
interface ListRowProps {
  tag?: string
  tagColor?: string
  title: string
  meta?: string
  onClick?: () => void
}

export default function ListRow({ tag, tagColor, title, meta, onClick }: ListRowProps) {
  const style = {
    width: '100%', minHeight: 'var(--ctl-row)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
    background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: 0,
    color: 'inherit', fontFamily: 'var(--font)', textAlign: 'left' as const, cursor: onClick ? 'pointer' : 'default',
  }
  const body = (
    <>
      {tag && <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: tagColor ?? 'var(--muted)', flexShrink: 0, minWidth: 36 }}>{tag}</span>}
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-base)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      {meta && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', flexShrink: 0 }}>{meta}</span>}
    </>
  )
  return onClick
    ? <button type="button" onClick={onClick} style={style}>{body}</button>
    : <div style={style}>{body}</div>
}
```

`src/mobile/Readout.tsx`:

```tsx
import type { ReactNode } from 'react'

export default function Readout({ children }: { children: ReactNode }) {
  return (
    <div role="status" style={{
      minHeight: 'var(--ctl-md)', display: 'flex', alignItems: 'center',
      fontSize: 'var(--fs-sm)', color: 'var(--muted)', fontFamily: 'var(--font)',
    }}>
      {children}
    </div>
  )
}
```

`src/mobile/SectionState.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { SlotStatus } from './useSlot'

interface SectionStateProps {
  status: SlotStatus
  empty?: boolean
  emptyText?: string
  onRetry?: () => void
  children: ReactNode
}

const muted = { fontSize: 'var(--fs-sm)', color: 'var(--muted)', fontFamily: 'var(--font)' } as const

export default function SectionState({ status, empty = false, emptyText = 'nada por aqui ainda', onRetry, children }: SectionStateProps) {
  if (status === 'loading') return <span style={muted}>_</span>
  if (status === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <span style={muted}>não foi possível carregar</span>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{
            minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', background: 'none', cursor: 'pointer',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
            color: 'var(--cyan)', fontSize: 'var(--fs-base)', fontFamily: 'var(--font)',
          }}>
            tentar de novo
          </button>
        )}
      </div>
    )
  }
  if (empty) return <span style={muted}>{emptyText}</span>
  return <>{children}</>
}
```

- [ ] **Step 5: Register the guard test and run**

Append ` src/mobile/mobile.contract.test.ts` to the `test` script in `package.json`. Run `npm test` and `npx tsc -b`.
Expected: the contract test passes (6 tests), the full suite passes, `tsc` exit 0.

- [ ] **Step 6: Commit**

```bash
git add platform/frontend/package.json platform/frontend/src/mobile
git commit -m "Add the mobile building blocks and their guard test"
```

---

### Task 3: Selection wrapper and empty mobile shells

**Files:**
- Create: `src/mobile/dashboard/DashboardMobile.tsx`, `src/mobile/profile/ProfileMobile.tsx` (shells)
- Modify: `src/pages/DashboardPage.tsx`, `src/pages/ProfilePage.tsx`

**Interfaces:**
- Consumes: `MobilePage` from Task 2.
- Produces: `export default function DashboardMobile()` and `ProfileMobile()` (no props), selected by `DashboardPage` / `ProfilePage` under `MOBILE_QUERY`.

- [ ] **Step 1: Take the desktop "before" snapshots**

With the dev servers running and logged in via dev mode: desktop snapshots (see "Verification probes") of `/` into `.playwright-mcp/desktop-dashboard-before.json` and `/profile` into `.playwright-mcp/desktop-profile-before.json`.

- [ ] **Step 2: Write the shells**

`src/mobile/dashboard/DashboardMobile.tsx`:

```tsx
import MobilePage from '../MobilePage'

export default function DashboardMobile() {
  return <MobilePage><span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>_</span></MobilePage>
}
```

`src/mobile/profile/ProfileMobile.tsx`:

```tsx
import MobilePage from '../MobilePage'

export default function ProfileMobile() {
  return <MobilePage><span style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>_</span></MobilePage>
}
```

- [ ] **Step 3: Add the selection wrappers**

In `src/pages/DashboardPage.tsx`: change `export default function DashboardPage() {` to `function DashboardDesktop() {` and add at the end of the file:

```tsx
export default function DashboardPage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  return isMobile ? <DashboardMobile /> : <DashboardDesktop />
}
```

Add `import DashboardMobile from '../mobile/dashboard/DashboardMobile'` next to the other imports (`useMediaQuery` and `MOBILE_QUERY` are already imported).

In `src/pages/ProfilePage.tsx`: change `export default function ProfilePage() {` to `function ProfileDesktop() {`, add `import ProfileMobile from '../mobile/profile/ProfileMobile'`, and add at the end:

```tsx
export default function ProfilePage() {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  return isMobile ? <ProfileMobile /> : <ProfileDesktop />
}
```

Preserve each file's line endings (check with `file`).

- [ ] **Step 4: Verify**

Run `npx tsc -b` and `npm test`: green. Desktop snapshots `after` for `/` and `/profile`; `diff` against the `before` files must print nothing (re-run in the same hour if only the greeting width differs). Mobile (390x844): `/` and `/profile` each show only the `_` placeholder, no overflow. `git diff --stat src/pages` shows only the rename, the wrapper and one import per file.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/src/mobile platform/frontend/src/pages/DashboardPage.tsx platform/frontend/src/pages/ProfilePage.tsx
git commit -m "Select the mobile Dashboard and Profile under 768px"
```

---

### Task 4: Mobile Dashboard

**Files:**
- Create: `src/mobile/dashboard/useDashboardData.ts`, `GreetingHeader.tsx`, `StatusSection.tsx`, `NextActionSection.tsx`, `AnalysisSection.tsx`, `HistorySection.tsx`
- Modify: `src/mobile/dashboard/DashboardMobile.tsx`

**Interfaces:**
- Consumes: Task 1 modules, Task 2 blocks, `useSlot`, `api.ts` fetchers, `useAuth` (`../../auth/AuthContext`), `useCosmetics` (`../../contexts/CosmeticsContext`), `BackgroundFooter` (`../../components/BackgroundRenderer`).
- Produces: `useDashboardData(): { stats: Slot<UserStats>; exercises: Slot<Exercise[]>; resume: Slot<Resume | null>; insights: Slot<Insight[]>; recent: Slot<RecentExercise[]> }`.

- [ ] **Step 1: Write the data hook**

`src/mobile/dashboard/useDashboardData.ts`:

```ts
import { fetchExercises, fetchInsights, fetchRecent, fetchResume, fetchStats } from '../api'
import { useSlot } from '../useSlot'

export function useDashboardData() {
  return {
    stats: useSlot(fetchStats),
    exercises: useSlot(fetchExercises),
    resume: useSlot(fetchResume),
    insights: useSlot(fetchInsights),
    recent: useSlot(fetchRecent),
  }
}
```

- [ ] **Step 2: Write the greeting and the status card**

`src/mobile/dashboard/GreetingHeader.tsx` (same words and colours as the desktop header):

```tsx
export default function GreetingHeader({ name }: { name: string }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite'
  const firstName = name.split(' ')[0] ?? ''
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
      <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', lineHeight: 'var(--lh-xl)' }}>
        {greeting},{' '}
        <span style={{ color: 'var(--cyan)' }}>{firstName}</span>
      </h1>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--blue)', flexShrink: 0 }}>
        {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
      </span>
    </div>
  )
}
```

`src/mobile/dashboard/StatusSection.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import RankCard from '../RankCard'
import SectionState from '../SectionState'
import { Stat, StatRow } from '../Stat'
import Surface from '../Surface'
import type { Slot } from '../useSlot'
import type { UserStats } from '../types'

export default function StatusSection({ stats }: { stats: Slot<UserStats> }) {
  const navigate = useNavigate()
  const s = stats.data
  return (
    <div style={{ marginTop: 'var(--sp-5)' }}>
      <SectionState status={stats.status} onRetry={stats.retry}>
        {s && (
          <Surface onClick={() => navigate('/profile')}>
            <RankCard rank={s.rank} honor={s.honor} honorForNext={s.honor_for_next_rank} progress={s.rank_progress} />
            <StatRow>
              <Stat value={s.current_streak} label="streak" />
              <Stat value={s.weekly_summary.completed_last_7_days} label="semana" />
              <Stat value={s.honor.toLocaleString('pt-BR')} label="honor" />
            </StatRow>
          </Surface>
        )}
      </SectionState>
    </div>
  )
}
```

- [ ] **Step 3: Write the next action card**

`src/mobile/dashboard/NextActionSection.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionCard from '../ActionCard'
import ListRow from '../ListRow'
import { MODE_LABEL, distinctModeCount, pickModes, pickNextAction, type ModeKey } from '../nextAction'
import { rankColor } from '../rank'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { Exercise, Resume } from '../types'

interface Props { resume: Slot<Resume | null>; exercises: Slot<Exercise[]> }

export default function NextActionSection({ resume, exercises }: Props) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<ModeKey>('rankup')
  const [picking, setPicking] = useState(false)

  const list = exercises.data ?? []
  const status = resume.status === 'loading' || exercises.status === 'loading'
    ? 'loading'
    : exercises.status === 'error' ? 'error' : 'ready'
  const action = pickNextAction(resume.data, list, mode)
  const canChoose = action?.kind === 'start' && distinctModeCount(list) >= 2
  const modes = pickModes(list)

  const chooser = canChoose && (
    <div style={{ marginTop: 'var(--sp-3)' }}>
      <button type="button" onClick={() => setPicking(p => !p)} style={{
        minHeight: 'var(--ctl-md)', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'var(--muted)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font)',
      }}>
        mudar modo
      </button>
      {picking && (['rankup', 'warmup', 'practice'] as ModeKey[]).filter(k => modes[k]).map(k => (
        <ListRow
          key={k}
          tag={modes[k]!.difficulty}
          tagColor={rankColor(modes[k]!.difficulty)}
          title={`${MODE_LABEL[k]} · ${modes[k]!.title}`}
          onClick={() => { setMode(k); setPicking(false) }}
        />
      ))}
    </div>
  )

  return (
    <div style={{ marginTop: 'var(--sp-4)' }}>
      <SectionState
        status={status}
        empty={!action}
        emptyText="sem exercício por hoje"
        onRetry={() => { resume.retry(); exercises.retry() }}
      >
        {action && (
          <ActionCard
            eyebrow={action.kind === 'resume' ? 'continuar' : 'treinar agora'}
            title={action.title}
            tag={action.difficulty}
            tagColor={rankColor(action.difficulty)}
            meta={action.progress ?? undefined}
            actionLabel={action.kind === 'resume' ? 'continuar' : 'começar'}
            onAction={() => navigate(`/exercise/${action.slug}`)}
            secondary={chooser || undefined}
          />
        )}
      </SectionState>
    </div>
  )
}
```

- [ ] **Step 4: Write the analysis row and the history list**

`src/mobile/dashboard/AnalysisSection.tsx`:

```tsx
import { useState } from 'react'
import { isInsightNew } from '../insightSeen'
import Section from '../Section'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { Insight } from '../types'

const KEY = 'insight_opened_at'

function readOpened(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}
function writeOpened(): void {
  try { localStorage.setItem(KEY, new Date().toISOString()) } catch { /* storage is unavailable */ }
}

const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
const body = { fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)', color: 'var(--text)', margin: 0 } as const

export default function AnalysisSection({ insights }: { insights: Slot<Insight[]> }) {
  const [openedAt, setOpenedAt] = useState<string | null>(readOpened)
  const list = insights.data ?? []
  const latest = list[0]

  return (
    <SectionState status={insights.status} empty={!latest} emptyText="sem análise ainda" onRetry={insights.retry}>
      {latest && (
        <Section
          label="análise do agente"
          summary={`${day(latest.generated_at)} · ${latest.message.split('\n')[0]}`}
          collapsible
          dot={isInsightNew(latest.generated_at, openedAt)}
          onToggle={open => { if (open) { writeOpened(); setOpenedAt(new Date().toISOString()) } }}
        >
          <p style={body}>{latest.message}</p>
          {latest.gaps.length > 0 && (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', margin: 'var(--sp-3) 0 0' }}>
              {latest.gaps.join('  ')}
            </p>
          )}
          {list.length > 1 && (
            <Section label="anteriores" collapsible>
              {list.slice(1).map(item => (
                <p key={item.generated_at} style={{ ...body, margin: '0 0 var(--sp-3)' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-sm)' }}>{day(item.generated_at)} · </span>
                  {item.message}
                </p>
              ))}
            </Section>
          )}
        </Section>
      )}
    </SectionState>
  )
}
```

`src/mobile/dashboard/HistorySection.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { statusWord, timeAgo } from '../format'
import ListRow from '../ListRow'
import { rankColor } from '../rank'
import Section from '../Section'
import SectionState from '../SectionState'
import type { Slot } from '../useSlot'
import type { RecentExercise } from '../types'

export default function HistorySection({ recent }: { recent: Slot<RecentExercise[]> }) {
  const navigate = useNavigate()
  const seen = new Set<string>()
  const items = (recent.data ?? []).filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, 5)

  return (
    <Section label="histórico">
      <SectionState status={recent.status} empty={items.length === 0} emptyText="nada por aqui ainda" onRetry={recent.retry}>
        {items.map(item => (
          <ListRow
            key={item.id}
            tag={item.difficulty}
            tagColor={rankColor(item.difficulty)}
            title={item.title}
            meta={`${statusWord(item.status)} · ${timeAgo(item.submitted_at)}`}
            onClick={() => navigate(`/exercise/${item.slug}`)}
          />
        ))}
      </SectionState>
    </Section>
  )
}
```

- [ ] **Step 5: Compose the page**

Replace `src/mobile/dashboard/DashboardMobile.tsx`:

```tsx
import { useAuth } from '../../auth/AuthContext'
import { BackgroundFooter } from '../../components/BackgroundRenderer'
import { useCosmetics } from '../../contexts/CosmeticsContext'
import MobilePage from '../MobilePage'
import AnalysisSection from './AnalysisSection'
import GreetingHeader from './GreetingHeader'
import HistorySection from './HistorySection'
import NextActionSection from './NextActionSection'
import StatusSection from './StatusSection'
import { useDashboardData } from './useDashboardData'

export default function DashboardMobile() {
  const { user } = useAuth()
  const { bg } = useCosmetics()
  const data = useDashboardData()

  return (
    <MobilePage background={<BackgroundFooter height={700} config={bg('bg_dashboard')} />}>
      <GreetingHeader name={user?.name ?? ''} />
      <StatusSection stats={data.stats} />
      <NextActionSection resume={data.resume} exercises={data.exercises} />
      <div style={{ marginTop: 'var(--sp-4)' }}>
        <AnalysisSection insights={data.insights} />
      </div>
      <HistorySection recent={data.recent} />
    </MobilePage>
  )
}
```

- [ ] **Step 6: Verify**

- `npx tsc -b`, `npm test` green (the contract test now scans the new files).
- Mobile probe on `/` at 390x844: `under36` empty, `textUnder11` 0, `overflowX` false, `primaryBottom` less than `dockTop` (the 48px button is fully above the dock without scrolling).
- Empty and error: with `browser_run_code_unsafe`, run `async (page) => { await page.route('**/api/agent/insights', r => r.abort()); await page.reload() }`, then confirm the analysis row shows "não foi possível carregar" with "tentar de novo" while the status card, next action and history still render. Remove the route afterwards (`page.unroute`).
- Desktop snapshot of `/` is still identical to `desktop-dashboard-before.json`.

- [ ] **Step 7: Commit**

```bash
git add platform/frontend/src/mobile
git commit -m "Build the mobile Dashboard from independent sections"
```

---

### Task 5: Mobile Profile

**Files:**
- Create: `src/mobile/profile/useProfileData.ts`, `IdentitySection.tsx`, `HeatmapSection.tsx`, `BadgesSection.tsx`, `BioRow.tsx`, `SocialRows.tsx`
- Modify: `src/mobile/profile/ProfileMobile.tsx`

**Interfaces:**
- Consumes: Task 1 modules, Task 2 blocks, `useCosmetics`, `BackgroundBg` (`../../components/BackgroundRenderer`), `api` (`../../api/client`).
- Produces: `useProfileData(): { stats: Slot<UserStats> }`.

- [ ] **Step 1: Write the data hook and the identity block**

`src/mobile/profile/useProfileData.ts`:

```ts
import { fetchStats } from '../api'
import { useSlot } from '../useSlot'

export function useProfileData() {
  return { stats: useSlot(fetchStats) }
}
```

`src/mobile/profile/IdentitySection.tsx` (the one place that keeps the cover look; resized to the scale, display only, the streak flame is omitted because "Nd streak" is already in the chips):

```tsx
import { BackgroundBg } from '../../components/BackgroundRenderer'
import { useCosmetics } from '../../contexts/CosmeticsContext'
import { honorMissing, nextRank, rankColor } from '../rank'
import SectionState from '../SectionState'
import { Stat, StatRow } from '../Stat'
import type { Slot } from '../useSlot'
import type { UserStats } from '../types'

const RING = 72
const R = 30
const CIRC = 2 * Math.PI * R

export default function IdentitySection({ stats }: { stats: Slot<UserStats> }) {
  const { bg } = useCosmetics()
  const s = stats.data

  return (
    <SectionState status={stats.status} onRetry={stats.retry}>
      {s && (() => {
        const color = rankColor(s.rank)
        const next = nextRank(s.rank)
        const chips = [
          { label: `membro há ${s.days_since_joined}d`, bright: false },
          { label: `${s.current_streak}d streak`, bright: s.current_streak > 0 },
          { label: `${s.total_completed} exercícios`, bright: false },
        ]
        return (
          <div>
            <div style={{ position: 'relative', height: 200, width: '100%', overflow: 'hidden' }}>
              {s.user.cover_url
                ? <img src={s.user.cover_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                : bg('bg_profile')
                  ? <BackgroundBg config={bg('bg_profile')} />
                  : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${color}28 0%, ${color}0c 50%, transparent 100%)` }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(10,14,20,0.55) 55%, rgba(10,14,20,0.96) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <div style={{
                  position: 'absolute', inset: 0, backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
                }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: '0 var(--sp-5) var(--sp-4)' }}>
                  {s.user.avatar_url
                    ? <img src={s.user.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: 4, flexShrink: 0, objectFit: 'cover', border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}40` }} />
                    : <div style={{ width: 64, height: 64, borderRadius: 4, flexShrink: 0, background: 'var(--bg-card)', border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 'var(--fs-xl)', fontWeight: 900 }}>{s.user.name[0]}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, margin: 0, letterSpacing: '-0.03em', lineHeight: 'var(--lh-xl)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.user.name}</h1>
                    <div style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
                      {chips.map(({ label, bright }) => (
                        <span key={label} style={{
                          fontSize: 'var(--fs-xs)', fontWeight: 600, padding: '2px var(--sp-2)', borderRadius: 'var(--radius-sm)',
                          background: bright ? 'rgba(34,211,238,0.07)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${bright ? 'rgba(34,211,238,0.22)' : 'var(--border)'}`,
                          color: bright ? 'var(--cyan)' : 'var(--muted)',
                        }}>{label}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: RING, height: RING, flexShrink: 0 }}>
                    <svg width={RING} height={RING} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="var(--border)" strokeWidth="4" />
                      <circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.min(1, Math.max(0, s.rank_progress)))} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 20px ${color}80` }}>{s.rank.replace('kyu', '')}</span>
                      <span style={{ fontSize: 'var(--fs-xs)', color, opacity: 0.7 }}>kyu</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: 'var(--sp-4) var(--sp-5) 0' }}>
              {next && (
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>
                  faltam {honorMissing(s.honor, s.honor_for_next_rank).toLocaleString('pt-BR')} de honor para {next}
                </div>
              )}
              <StatRow>
                <Stat value={`${Math.round(s.completion_rate * 100)}%`} label="aproveitamento" />
                <Stat value={s.days_active} label="dias ativos" />
                <Stat value={s.honor.toLocaleString('pt-BR')} label="honor" />
              </StatRow>
            </div>
          </div>
        )
      })()}
    </SectionState>
  )
}
```

- [ ] **Step 2: Write the heatmap**

`src/mobile/profile/HeatmapSection.tsx`:

```tsx
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { LEVEL_COLOR, TODAY_EMPTY, buildWeeks, describeDay, levelOf, type HeatmapDay } from '../heatmap'
import Readout from '../Readout'
import Section from '../Section'

const CELL = 12
const GAP = 4

export default function HeatmapSection({ heatmap }: { heatmap: Record<string, HeatmapDay> }) {
  const [full, setFull] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const weeks = buildWeeks(heatmap, new Date(), full ? 53 : 20)
  const cells = weeks.flat().filter(c => c !== null)
  const active = cells.find(c => c.date === selected) ?? cells.find(c => c.isToday) ?? null

  useEffect(() => {
    if (full && scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [full])

  const pick = (e: ReactPointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const date = el?.getAttribute('data-date')
    if (date) setSelected(date)
  }

  return (
    <Section label={full ? 'atividade · 365 dias' : 'atividade · 20 semanas'}>
      <div ref={scroller} style={{ overflowX: full ? 'auto' : 'hidden' }}>
        <div
          onPointerDown={pick}
          onPointerMove={e => { if (e.buttons === 1) pick(e) }}
          style={{ display: 'flex', gap: GAP, touchAction: full ? 'pan-x' : 'none', width: 'max-content' }}
        >
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  data-date={cell?.date}
                  style={{
                    width: CELL, height: CELL, borderRadius: 2, boxSizing: 'border-box',
                    background: !cell ? 'transparent' : cell.isToday && cell.data.total === 0 ? TODAY_EMPTY : LEVEL_COLOR[levelOf(cell.data.total)],
                    outline: cell && cell.date === active?.date ? '1px solid var(--text)' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <Readout>{active ? describeDay(active.date, active.data) : 'sem atividade'}</Readout>
      <button type="button" onClick={() => { setFull(f => !f); setSelected(null) }} style={{
        minHeight: 'var(--ctl-md)', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: 'var(--cyan)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font)',
      }}>
        {full ? 'mostrar 20 semanas' : 'ver 365 dias'}
      </button>
    </Section>
  )
}
```

- [ ] **Step 3: Write the badges**

`src/mobile/profile/BadgesSection.tsx`:

```tsx
import { useState } from 'react'
import { BADGES, isUnlocked, type BadgeStats } from '../badges'
import Readout from '../Readout'
import Section from '../Section'

export default function BadgesSection({ stats }: { stats: BadgeStats }) {
  const [selected, setSelected] = useState<string | null>(null)
  const chosen = BADGES.find(b => b.id === selected) ?? null
  const earned = BADGES.filter(b => isUnlocked(b, stats)).length

  return (
    <Section label={`conquistas · ${earned}/${BADGES.length}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {BADGES.map(def => {
          const on = isUnlocked(def, stats)
          return (
            <button
              key={def.id}
              type="button"
              aria-label={def.label}
              aria-pressed={selected === def.id}
              onClick={() => setSelected(def.id)}
              style={{
                width: 'var(--ctl-chip)', height: 'var(--ctl-md)', padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{
                width: 'var(--ctl-chip)', height: 'var(--ctl-chip)', borderRadius: 'var(--radius-md)', boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${on ? def.color : 'var(--border)'}`,
                outline: selected === def.id ? '1px solid var(--text)' : 'none',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on ? def.color : 'var(--muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {on
                    ? <path d={def.svg} />
                    : (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>)}
                </svg>
              </span>
            </button>
          )
        })}
      </div>
      <Readout>
        {chosen ? (isUnlocked(chosen, stats) ? `${chosen.label} · ${chosen.hint}` : `${chosen.label} · bloqueado`) : 'toque em uma conquista'}
      </Readout>
    </Section>
  )
}
```

- [ ] **Step 4: Write bio and social rows**

`src/mobile/profile/BioRow.tsx`:

```tsx
import { useState } from 'react'
import api from '../../api/client'
import Section from '../Section'

const button = {
  minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', cursor: 'pointer', borderRadius: 'var(--radius-md)',
  fontSize: 'var(--fs-base)', fontFamily: 'var(--font)', background: 'none',
} as const

export default function BioRow({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const save = async () => {
    setSaving(true)
    setFailed(false)
    try {
      await api.patch('/users/me', { bio: draft })
      setBio(draft.trim())
      setEditing(false)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section label="bio" summary={bio.split('\n')[0] || 'sem bio'} collapsible>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box', padding: 'var(--sp-3)', resize: 'vertical',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text)', fontSize: 'var(--fs-input)', lineHeight: 'var(--lh-input)', fontFamily: 'var(--font)',
            }}
          />
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
            <button type="button" disabled={saving} onClick={save} style={{ ...button, border: '1px solid rgba(34,211,238,0.3)', color: 'var(--cyan)' }}>salvar</button>
            <button type="button" onClick={() => setEditing(false)} style={{ ...button, border: '1px solid var(--border)', color: 'var(--muted)' }}>cancelar</button>
          </div>
          {failed && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', marginTop: 'var(--sp-2)' }}>não foi possível salvar</div>}
        </div>
      ) : (
        <div>
          <p style={{ margin: 0, fontSize: 'var(--fs-base)', lineHeight: 'var(--lh-base)', color: bio ? 'var(--text)' : 'var(--muted)', whiteSpace: 'pre-wrap' }}>
            {bio || 'sem descrição'}
          </p>
          <button type="button" onClick={() => { setDraft(bio); setEditing(true) }} style={{ ...button, marginTop: 'var(--sp-2)', border: '1px solid var(--border)', color: 'var(--cyan)' }}>
            editar
          </button>
        </div>
      )}
    </Section>
  )
}
```

`src/mobile/profile/SocialRows.tsx`:

```tsx
import { useState } from 'react'
import api from '../../api/client'
import ListRow from '../ListRow'
import Section from '../Section'

const NETWORKS: { id: string; label: string }[] = [
  { id: 'github', label: 'GitHub' }, { id: 'linkedin', label: 'LinkedIn' }, { id: 'twitter', label: 'X' },
  { id: 'instagram', label: 'Instagram' }, { id: 'discord', label: 'Discord' },
  { id: 'youtube', label: 'YouTube' }, { id: 'steam', label: 'Steam' },
]

export default function SocialRows({ initialLinks }: { initialLinks: Record<string, string> }) {
  const [links, setLinks] = useState(initialLinks)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [failed, setFailed] = useState(false)

  const filled = NETWORKS.filter(n => links[n.id])
  const free = NETWORKS.filter(n => !links[n.id])

  const open = (id: string) => { setDraft(links[id] ?? ''); setEditing(id); setAdding(false); setFailed(false) }

  const save = async (id: string) => {
    const updated = { ...links, [id]: draft.trim() }
    if (!draft.trim()) delete updated[id]
    try {
      await api.patch('/users/me', { social_links: updated })
      setLinks(updated)
      setEditing(null)
    } catch {
      setFailed(true)
    }
  }

  const editor = (id: string) => (
    <div style={{ padding: 'var(--sp-2) 0' }}>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        autoFocus
        style={{
          width: '100%', boxSizing: 'border-box', minHeight: 'var(--ctl-md)', padding: '0 var(--sp-3)',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          color: 'var(--text)', fontSize: 'var(--fs-input)', fontFamily: 'var(--font)',
        }}
      />
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
        <button type="button" onClick={() => save(id)} style={{ minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', background: 'none', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--cyan)', fontSize: 'var(--fs-base)', fontFamily: 'var(--font)', cursor: 'pointer' }}>salvar</button>
        <button type="button" onClick={() => setEditing(null)} style={{ minHeight: 'var(--ctl-md)', padding: '0 var(--sp-4)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--muted)', fontSize: 'var(--fs-base)', fontFamily: 'var(--font)', cursor: 'pointer' }}>cancelar</button>
      </div>
      {failed && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--red)', marginTop: 'var(--sp-2)' }}>não foi possível salvar</div>}
    </div>
  )

  return (
    <Section label="redes" summary={filled.map(n => n.label).join(', ') || 'nenhuma'} collapsible>
      {filled.map(n => (
        editing === n.id
          ? <div key={n.id}>{editor(n.id)}</div>
          : <ListRow key={n.id} title={n.label} meta={links[n.id]} onClick={() => open(n.id)} />
      ))}
      {editing && !links[editing] && editor(editing)}
      {free.length > 0 && (
        <ListRow title="adicionar rede" onClick={() => setAdding(a => !a)} />
      )}
      {adding && free.map(n => <ListRow key={n.id} title={n.label} onClick={() => open(n.id)} />)}
    </Section>
  )
}
```

- [ ] **Step 5: Compose the page**

Replace `src/mobile/profile/ProfileMobile.tsx`:

```tsx
import MobilePage from '../MobilePage'
import SectionState from '../SectionState'
import BadgesSection from './BadgesSection'
import BioRow from './BioRow'
import HeatmapSection from './HeatmapSection'
import IdentitySection from './IdentitySection'
import SocialRows from './SocialRows'
import { useProfileData } from './useProfileData'

export default function ProfileMobile() {
  const { stats } = useProfileData()
  const s = stats.data

  return (
    <MobilePage header={<IdentitySection stats={stats} />}>
      <SectionState status={stats.status === 'ready' ? 'ready' : 'loading'}>
        {s && (
          <>
            <HeatmapSection heatmap={s.heatmap ?? {}} />
            <BadgesSection stats={s} />
            <BioRow initialBio={s.user.bio} />
            <SocialRows initialLinks={s.user.social_links ?? {}} />
          </>
        )}
      </SectionState>
    </MobilePage>
  )
}
```

- [ ] **Step 6: Verify**

- `npx tsc -b`, `npm test` green.
- Mobile probe on `/profile`: `under36` empty, `textUnder11` 0, `overflowX` false. Then with `browser_evaluate`: the heatmap grid width is at most 350 and has no horizontal scroll in the 20-week view; tap "ver 365 dias" and confirm the heatmap container scrolls horizontally (its `scrollWidth` exceeds `clientWidth`) while the page does not (`overflowX` false); tap a heatmap cell and confirm the readout text changes; tap a locked badge and confirm "bloqueado" appears.
- The ring: compare `stroke-dashoffset` of the second circle with `circumference * (1 - rank_progress)` read from `/api/users/me/stats` (via `browser_evaluate` fetch with the stored token).
- Desktop snapshot of `/profile` identical to `desktop-profile-before.json`.

- [ ] **Step 7: Commit**

```bash
git add platform/frontend/src/mobile
git commit -m "Build the mobile Profile from independent sections"
```

---

### Task 6: Friends and Guild placeholder pages

**Files:**
- Create: `src/pages/FriendsPage.tsx`, `src/pages/GuildPage.tsx`
- Modify: `src/App.tsx`, `src/components/layout/navItems.tsx`

**Interfaces:**
- Produces: routes `friends` and `guild` under the private layout; `FRIENDS_ITEM`, `GUILD_ITEM` in `navItems.tsx`; `MOBILE_SHEET` order: Perfil, Amigos, Guilda, then the existing items, then Configurações.

- [ ] **Step 1: Write the pages**

`src/pages/FriendsPage.tsx`:

```tsx
export default function FriendsPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-4)', color: 'var(--muted)' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--text)', opacity: 0.5 }}>Amigos</span>
      <span style={{ fontSize: 'var(--fs-base)' }}>Em desenvolvimento</span>
    </div>
  )
}
```

`src/pages/GuildPage.tsx`: the same file with the component named `GuildPage`, the title text `Guilda`, and this icon in place of the four paths:

```tsx
<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
```

- [ ] **Step 2: Routes and sheet entries**

In `src/App.tsx` add `import FriendsPage from './pages/FriendsPage'` and `import GuildPage from './pages/GuildPage'`, and inside the private layout, after the `community` route:

```tsx
<Route path="friends" element={<FriendsPage />} />
<Route path="guild" element={<GuildPage />} />
```

In `src/components/layout/navItems.tsx`, after `PROFILE_ITEM`, add:

```tsx
export const FRIENDS_ITEM: NavItem = {
  to: '/friends', label: 'Amigos',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
}

export const GUILD_ITEM: NavItem = {
  to: '/guild', label: 'Guilda',
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
    </svg>
  ),
}
```

and change the last line to:

```tsx
export const MOBILE_SHEET = [PROFILE_ITEM, FRIENDS_ITEM, GUILD_ITEM, ...NAV.filter(i => !PRIMARY_PATHS.includes(i.to)), CONFIG_ITEM]
```

(`NAV` is unchanged, so the desktop sidebar is unchanged.)

- [ ] **Step 3: Verify**

`npx tsc -b`, `npm test`. In the browser at 390x844: open "Mais", confirm the sheet lists Perfil, Amigos, Guilda, Chat IA, Loja, Comunidade, Configurações, Sair and fits above the dock; tap Amigos and Guilda: each shows "Em desenvolvimento" and the dock highlights "Mais". At 1440px the desktop sidebar has no Amigos or Guilda entry.

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/src/pages/FriendsPage.tsx platform/frontend/src/pages/GuildPage.tsx platform/frontend/src/App.tsx platform/frontend/src/components/layout/navItems.tsx
git commit -m "Add Friends and Guild placeholder pages and Mais entries"
```

---

### Task 7: Final sweep

**Files:** none changed unless a check fails.

- [ ] **Step 1: Full checks**

`npx tsc -b` and `npm test` in `platform/frontend`: both green.

- [ ] **Step 2: Mobile sweep**

Run the mobile probe on `/`, `/profile`, `/friends`, `/guild` at 390x844. Acceptance: `under36` empty, `textUnder11` 0, `overflowX` false on all four; on `/`, `primaryBottom < dockTop`.

- [ ] **Step 3: Desktop sweep**

Desktop snapshots of `/` and `/profile` against the Task 3 `before` files: identical. `git diff --stat <branch point>..HEAD -- platform/frontend/src/pages` lists only `DashboardPage.tsx`, `ProfilePage.tsx` (rename + wrapper + import), the two new placeholder pages.

- [ ] **Step 4: Spec acceptance**

Walk the six acceptance criteria in the spec and write the result of each (measured value or "not verified") in the final message. Log anything found and not fixed in Linear per the backlog rule.

---

## Self-review against the spec

- **Greeting kept as is:** Task 4 `GreetingHeader` (same words, cyan name, blue date).
- **Status card with honest rank numbers and bar, streak/week/honor:** Task 2 `RankCard`, Task 4 `StatusSection`.
- **Next action, one 48px button, resume wins unless passed, "mudar modo" hidden under two distinct choices:** Task 1 `nextAction.ts` and tests, Task 4 `NextActionSection`.
- **Analysis collapsed with a "new" dot, older ones behind "anteriores":** Task 1 `insightSeen.ts`, Task 4 `AnalysisSection`.
- **History of 5 plain rows, no relabelled status, no "ver tudo":** Task 1 `format.ts`, Task 4 `HistorySection`.
- **Profile identity kept (cover, photo, kyu number, ring), real progress, resized:** Task 5 `IdentitySection` (open decision recorded in the spec; streak flame omitted for width, "Nd streak" stays in the chips).
- **Heatmap: 20 weeks, 12px cells, readout, 365-day toggle:** Task 1 `heatmap.ts`, Task 5 `HeatmapSection`.
- **Badges: one row, lock icon only when locked, tap readout:** Task 1 `badges.ts`, Task 5 `BadgesSection`.
- **Bio and social links collapsible, 16px inputs, 44px buttons:** Task 5 `BioRow`, `SocialRows`.
- **Friends and Guild removed from the Profile, own pages, two "Mais" entries, desktop nav unchanged:** Task 6.
- **Building blocks, one file each, sections as an ordered list, per-section states, one fetch per endpoint:** Task 2, `useDashboardData`, `useProfileData`.
- **Guard test (no raw font sizes, no mock data, no emoji, no desktop page imports, no decoration outside the cover):** Task 2.
- **Desktop identical, selection branch only:** Task 3 and Task 7.
- **No new endpoint:** all fetchers reuse existing routes (`api.ts`).
