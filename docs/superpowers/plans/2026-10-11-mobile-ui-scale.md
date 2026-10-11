# Mobile UI scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One small CSS-variable scale (type, spacing, controls, radius, icons) that every page uses on mobile (<= 768px), with desktop pixel-identical.

**Architecture:** Tokens are defined once in `:root` of `platform/frontend/src/index.css` with their desktop value and redefined inside `@media (max-width: 768px) { :root { ... } }`. Inline styles and shared classes use `var(--token)`, so they follow the breakpoint with no JS. A call site migrates to a token only when its current desktop literal equals the token's desktop value; otherwise it uses `isMobile ? 'var(--token)' : <literal>`.

**Tech Stack:** React 19 + Vite + TypeScript, inline styles + `index.css`, `node --experimental-strip-types --test` for the token guard test, Playwright MCP for measurements.

**Spec:** `docs/superpowers/specs/2026-10-10-mobile-ui-scale.md`

## Global Constraints

- Scope is viewports `<= 768px` (`MOBILE_QUERY`). Desktop stays pixel-identical.
- No redesign: same colors, JetBrains Mono as the only font, same layout (the one layout change is the Store sidebar stacking in Task 8).
- Tokens only through CSS custom properties. No shared `Button/Chip/Input/Text` components. No global `!important` touch-target floor: undersized controls are fixed at their call sites.
- Token values (desktop -> mobile), verbatim from the spec:
  - `--fs-xs` 10 -> 11, `--fs-sm` 11 -> 12, `--fs-base` 13 -> 14, `--fs-input` 13 -> 16, `--fs-lg` 15 -> 17, `--fs-xl` 22 -> 22 (one size, used on mobile only).
  - `--lh-xs` 1.3, `--lh-sm` 1.5, `--lh-base` 1.6, `--lh-input` 1.4, `--lh-lg` 1.35, `--lh-xl` 1.25 (same on both).
  - `--sp-1..--sp-7` = 4, 8, 12, 16, 20, 24, 32 (same on both). Gutter stays 20 (`MOBILE_GUTTER`).
  - `--ctl-primary` 40 -> 48, `--ctl-md` 32 -> 44, `--ctl-chip` 28 -> 36, `--ctl-icon` 32 -> 44, `--ctl-row` 44 -> 52, `--ctl-tag` 18 -> 20.
  - `--radius-sm` 4 -> 4, `--radius-md` 6 -> 8, `--radius-lg` 8 -> 12, `--radius-pill` 999.
  - `--icon-sm` 16, `--icon-md` 20.
- Minimum touch target 44x44. Chips are 36px visible and sit in rows with >= 8px spacing.
- UI copy stays Portuguese. Code, comments and commit messages are English.
- Out of scope: `/chats` (DEV-24), `/profile` (DEV-25), the Monaco font, the PDF canvas.
- Frontend checks after every task: `npx tsc -b` and `npm test` in `platform/frontend`. Known pre-existing failure on `dev`: the `skillPath` "frozen source" test; do not "fix" it here.
- Commits: one per task, imperative English, end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never push.

## Migration rules (used by Tasks 3-9)

For every inline style you touch, apply in this order:

| Property | Current literal | Becomes |
|---|---|---|
| `fontSize` | `10` | `'var(--fs-xs)'` |
| `fontSize` | `11` | `'var(--fs-sm)'` |
| `fontSize` | `13` on text/buttons | `'var(--fs-base)'` |
| `fontSize` | `13` (or 12/14/15) on `input`/`textarea`/`select` | `isMobile ? 'var(--fs-input)' : <literal>` |
| `fontSize` | `15` | `'var(--fs-lg)'` |
| `fontSize` | `8`, `9` | `isMobile ? 'var(--fs-xs)' : <literal>` |
| `fontSize` | `12` | `isMobile ? 'var(--fs-sm)' : 12` |
| `fontSize` | `14` | `isMobile ? 'var(--fs-base)' : 14` |
| `fontSize` | `16`-`19` on card/section titles | `isMobile ? 'var(--fs-lg)' : <literal>` |
| `fontSize` | page `h1` (any of 16, 19, 20, 24, 26, 32, 36, 40) | `isMobile ? 'var(--fs-xl)' : <literal>` |
| `height`/`minHeight` | `40` primary action | `'var(--ctl-primary)'` |
| `height`/`minHeight` | `32` secondary button, input, tab | `'var(--ctl-md)'` |
| `height`/`minHeight` | `28` chip or pill | `'var(--ctl-chip)'` |
| `height`/`minHeight` | `44` list row | `'var(--ctl-row)'` |
| `height`/`minHeight` | anything else on a control | `isMobile ? 'var(--ctl-<role>)' : <literal>` |
| `borderRadius` | `6` | `'var(--radius-md)'` |
| `borderRadius` | `8` | `'var(--radius-lg)'` |
| `borderRadius` | `4` | `'var(--radius-sm)'` |
| `gap`/`padding` | off-grid (2, 3, 5, 6, 7, 9, 10, 14, 18, 22, 28, 36) | nearest `--sp-*` step, only when `isMobile` (desktop keeps the literal) |

Leave numbers that are display numbers (rank 28, streak 20), SVG `strokeWidth`, `letterSpacing`, and `50%` radii untouched. Do not change any value that is not on a control or text element. Where a file has no `isMobile`, add `const isMobile = useMediaQuery(MOBILE_QUERY)` from `../hooks/useMediaQuery`.

## Verification probes (used by Tasks 2-9)

Mobile probe: resize the browser to 390x844, log in with "Entrar em modo dev", open the route, then run `browser_evaluate` with:

```js
() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
  const ctrls = [...document.querySelectorAll('button, a, input, textarea, select, [role=button]')].filter(vis)
  const texts = [...document.querySelectorAll('h1,h2,h3,h4,p,span,label,li,div')]
    .filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
  const h = e => Math.round(e.getBoundingClientRect().height)
  return {
    path: location.pathname, vw: innerWidth,
    controls: ctrls.length,
    under44: ctrls.filter(e => h(e) < 44).map(e => ({ t: (e.innerText || e.placeholder || e.ariaLabel || '').trim().slice(0, 20), h: h(e) })),
    textUnder11: texts.filter(e => parseFloat(getComputedStyle(e).fontSize) < 10.5).length,
    fontSizes: [...new Set(texts.map(e => getComputedStyle(e).fontSize))].sort((a, b) => parseFloat(a) - parseFloat(b)),
    h1: [...document.querySelectorAll('h1')].filter(vis).map(e => getComputedStyle(e).fontSize),
    overflowX: document.documentElement.scrollWidth > innerWidth,
  }
}
```

Desktop snapshot (must be byte-identical before and after a task): resize to 1440x900, open the route, run `browser_evaluate` with `filename` set to `.playwright-mcp/desktop-<route>-<before|after>.json`:

```js
() => [...document.querySelectorAll('main *, nav *')].slice(0, 1500).map((e, i) => {
  const s = getComputedStyle(e), r = e.getBoundingClientRect()
  return [i, e.tagName, s.fontSize, s.lineHeight, s.borderRadius, s.padding, s.gap, Math.round(r.width), Math.round(r.height)].join('|')
})
```

Compare with `diff .playwright-mcp/desktop-<route>-before.json .playwright-mcp/desktop-<route>-after.json` (no output means identical). Take the `before` file before editing the page.

## Review Focus

1. Long Portuguese strings at 14px body text wrap to more lines inside cards and rows; nothing may clip or overlap (Dashboard insight card, course cards, Config rows).
2. Dock labels at 11px must fit a ~67px slot: "Dashboard" is the longest label; no ellipsis, no wrap.
3. Inputs at 16px must not trigger iOS zoom: no `input`/`textarea` below 16px on mobile (Store search was 12px).
4. 36px chips stay tappable: >= 8px between neighbors, and a chip row that wraps does not push a primary action under the dock.
5. Stacked Store filters: many categories must scroll horizontally inside their row without making the page scroll sideways (`overflowX` false).

---

### Task 1: Tokens and a guard test

**Files:**
- Modify: `platform/frontend/src/index.css` (add tokens after the existing `:root` block, before `*, *::before`)
- Create: `platform/frontend/src/lib/uiScale.test.ts`
- Modify: `platform/frontend/package.json` (append the new test file to the `test` script)
- Modify: `docs/superpowers/specs/2026-10-10-mobile-ui-scale.md` (`--sp-1..--sp-8` -> `--sp-1..--sp-7`, there are seven steps)

**Interfaces:**
- Produces: the CSS custom properties listed in Global Constraints, defined in `:root` (desktop) and in the mobile media block. Later tasks reference them only as `var(--name)`.

- [ ] **Step 1: Write the failing guard test**

`platform/frontend/src/lib/uiScale.test.ts`:

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const DESKTOP: Record<string, string> = {
  '--fs-xs': '10px', '--fs-sm': '11px', '--fs-base': '13px', '--fs-input': '13px', '--fs-lg': '15px', '--fs-xl': '22px',
  '--lh-xs': '1.3', '--lh-sm': '1.5', '--lh-base': '1.6', '--lh-input': '1.4', '--lh-lg': '1.35', '--lh-xl': '1.25',
  '--sp-1': '4px', '--sp-2': '8px', '--sp-3': '12px', '--sp-4': '16px', '--sp-5': '20px', '--sp-6': '24px', '--sp-7': '32px',
  '--ctl-primary': '40px', '--ctl-md': '32px', '--ctl-chip': '28px', '--ctl-icon': '32px', '--ctl-row': '44px', '--ctl-tag': '18px',
  '--radius-sm': '4px', '--radius-md': '6px', '--radius-lg': '8px', '--radius-pill': '999px',
  '--icon-sm': '16px', '--icon-md': '20px',
}

const MOBILE_CHANGES: Record<string, string> = {
  '--fs-xs': '11px', '--fs-sm': '12px', '--fs-base': '14px', '--fs-input': '16px', '--fs-lg': '17px',
  '--ctl-primary': '48px', '--ctl-md': '44px', '--ctl-chip': '36px', '--ctl-icon': '44px', '--ctl-row': '52px', '--ctl-tag': '20px',
  '--radius-md': '8px', '--radius-lg': '12px',
}

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

function rootBlocks(): { desktop: Record<string, string>; mobile: Record<string, string> } {
  const media = css.match(/@media \(max-width: 768px\) \{\s*:root \{([^}]*)\}/)
  assert.ok(media, 'mobile :root block inside @media (max-width: 768px) is missing')
  const withoutMedia = css.replace(media[0], '')
  const desktopBlocks = [...withoutMedia.matchAll(/:root \{([^}]*)\}/g)].map(m => declarations(m[1]))
  return { desktop: Object.assign({}, ...desktopBlocks), mobile: declarations(media[1]) }
}

describe('mobile ui scale tokens', () => {
  const { desktop, mobile } = rootBlocks()

  it('defines every token with its desktop value', () => {
    for (const [name, value] of Object.entries(DESKTOP)) assert.equal(desktop[name], value, name)
  })

  it('redefines exactly the tokens that change on mobile', () => {
    assert.deepEqual(mobile, MOBILE_CHANGES)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `platform/frontend`): `node --experimental-strip-types --test src/lib/uiScale.test.ts`
Expected: FAIL with `mobile :root block inside @media (max-width: 768px) is missing`.

- [ ] **Step 3: Add the tokens to `index.css`**

Insert after the closing `}` of the first `:root` block:

```css
/* ─── Size scale ────────────────────────────────────────────
   Desktop values are what the app already uses; the mobile block below
   redefines only what changes. Inline styles use var(--token). */
:root {
  --fs-xs: 10px;   --lh-xs: 1.3;
  --fs-sm: 11px;   --lh-sm: 1.5;
  --fs-base: 13px; --lh-base: 1.6;
  --fs-input: 13px; --lh-input: 1.4;
  --fs-lg: 15px;   --lh-lg: 1.35;
  --fs-xl: 22px;   --lh-xl: 1.25;

  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 20px; --sp-6: 24px; --sp-7: 32px;

  --ctl-primary: 40px; --ctl-md: 32px; --ctl-chip: 28px;
  --ctl-icon: 32px; --ctl-row: 44px; --ctl-tag: 18px;

  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-pill: 999px;
  --icon-sm: 16px; --icon-md: 20px;
}

@media (max-width: 768px) {
  :root {
    --fs-xs: 11px; --fs-sm: 12px; --fs-base: 14px; --fs-input: 16px; --fs-lg: 17px;
    --ctl-primary: 48px; --ctl-md: 44px; --ctl-chip: 36px;
    --ctl-icon: 44px; --ctl-row: 52px; --ctl-tag: 20px;
    --radius-md: 8px; --radius-lg: 12px;
  }
}
```

Fix the spec typo: in `docs/superpowers/specs/2026-10-10-mobile-ui-scale.md` replace `--sp-1..--sp-8` with `--sp-1..--sp-7`.

- [ ] **Step 4: Register the test and run everything**

In `platform/frontend/package.json` append ` src/lib/uiScale.test.ts` to the end of the `test` script. Run `npm test` and `npx tsc -b`.
Expected: all pass (plus the pre-existing `skillPath` failure on `dev`), `tsc` exit 0. The file is excluded from `tsc` by `"exclude": ["src/**/*.test.ts"]`.

- [ ] **Step 5: Verify in the browser, then commit**

Open any route, then run `browser_evaluate`: `() => ['--fs-base','--ctl-md','--radius-lg'].map(k => getComputedStyle(document.documentElement).getPropertyValue(k).trim())`.
Expected at 1440 wide: `["13px","32px","8px"]`; at 390 wide: `["14px","44px","12px"]`. No screenshot diff anywhere (nothing references the tokens).

```bash
git add platform/frontend/src/index.css platform/frontend/src/lib/uiScale.test.ts platform/frontend/package.json docs/superpowers/specs/2026-10-10-mobile-ui-scale.md
git commit -m "Add the mobile UI scale tokens and a guard test"
```

---

### Task 2: Shared classes and the app shell

**Files:**
- Modify: `platform/frontend/src/index.css` (`.tag`, `.diff-badge`, `.stat-label`, `.section-label`, `.sheet-item`, `.tab-item span`, `.btn`)
- Modify: `platform/frontend/src/components/layout/AppLayout.tsx` (chat FAB position)
- Modify: `platform/frontend/src/components/layout/MobileNav.tsx` only if the dock label does not fit (see Step 4)

**Interfaces:**
- Consumes: the tokens from Task 1.
- Produces: shared classes that already follow the scale, so Tasks 3-9 do not touch them.

- [ ] **Step 1: Baseline**

Run the desktop snapshot for `/`, `/exercise`, `/courses`, `/books`, `/store`, `/config` into `desktop-<route>-before.json`, and the mobile probe for the same routes. Record `under44` and `textUnder11` counts.

- [ ] **Step 2: Move the shared classes onto tokens (desktop values are unchanged)**

In `index.css`:
- `.tag`: `font-size: 10px` -> `font-size: var(--fs-xs)`.
- `.diff-badge`, `.stat-label`, `.section-label`: their `font-size: 10px` -> `font-size: var(--fs-xs)`.
- `.sheet-item`: `font-size: 13px` -> `font-size: var(--fs-base)`.
- `.tab-item`: `font-size: 9px` -> `font-size: var(--fs-xs)` (the class only renders on mobile, so this is 9 -> 11 there).

Then add inside the existing `@media (max-width: 768px) { ... }` block:

```css
  .btn {
    font-size: var(--fs-base);
    min-height: var(--ctl-md);
    padding: 0 var(--sp-4);
    border-radius: var(--radius-md);
  }
```

- [ ] **Step 3: Chat FAB gutter and bottom CTAs (open question A)**

In `AppLayout.tsx` `ChatBubble`, change the right offset from `24` to `isMobile ? 20 : 24` (both the bubble and the panel). **Confirm open question A with João before changing anything else here.** Recommended default: when `document.body.dataset.courseLesson === '1'` or the route matches `/exercise/:slug` (the "about" page), raise the bubble by `var(--ctl-primary) + var(--sp-4)` so it clears the bottom CTA. If João chooses "hide" or "reserve space", implement that instead and note it in the commit message.

- [ ] **Step 4: Verify**

Mobile probe on every route: `textUnder11` must be 0 for the dock; `.btn` controls >= 44px. Open the dock: "Dashboard" label must not wrap or ellipsize at 390px (`scrollWidth <= clientWidth` on each `.tab-item span`); if it does, set `.tab-item span { letter-spacing: -0.02em }` in the mobile block and re-measure.
Desktop snapshot `after` for the six routes: `diff` must print nothing.
Run `npx tsc -b` and `npm test`.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/src/index.css platform/frontend/src/components/layout/AppLayout.tsx platform/frontend/src/components/layout/MobileNav.tsx
git commit -m "Move shared classes and the chat button onto the mobile scale"
```

---

### Task 3: Dashboard

**Files:**
- Modify: `platform/frontend/src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: tokens and shared classes from Tasks 1-2; the `isMobile` already in `DashboardPage`.

- [ ] **Step 1: Baseline** — desktop snapshot of `/` (`before`) and the mobile probe (expect 8 controls under 44, 27 texts under 12 from the audit).

- [ ] **Step 2: Apply the migration rules** to `DashboardPage.tsx`. Known call sites from the audit:
  - mode tabs and chips at 28px (`:203`, `:735`, `:751`, `:766`) -> `height: 'var(--ctl-chip)'`.
  - "Treinar" button 32px / 12px (`:276`) -> `height: isMobile ? 'var(--ctl-primary)' : 32`, `fontSize: isMobile ? 'var(--fs-base)' : 12`.
  - carousel arrows 22x22 (`:823`, `:840`) -> `width`/`height: isMobile ? 'var(--ctl-icon)' : 22`.
  - greeting `h1` 26px (`:713`) -> `isMobile ? 'var(--fs-xl)' : 26`.
  - section labels and meta text at 8-11px -> rules table.

- [ ] **Step 3: Verify** — mobile probe: `under44` lists only chips at 36 (and nothing under 36); `textUnder11` 0; `h1` is `22px`; `overflowX` false. Desktop snapshot `after`: `diff` prints nothing. `npx tsc -b`, `npm test`.

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/src/pages/DashboardPage.tsx
git commit -m "Apply the mobile scale to the dashboard"
```

---

### Task 4: Kata list, exercise about and solver

**Files:**
- Modify: `platform/frontend/src/pages/KataListPage.tsx`
- Modify: `platform/frontend/src/pages/ExerciseAboutPage.tsx`
- Modify: `platform/frontend/src/pages/ExercisePage.tsx`

- [ ] **Step 1: Baseline** — desktop snapshots for `/exercise`, `/exercise/<slug>` and `/exercise/<slug>/solve` (use the one existing kata), plus mobile probes.

- [ ] **Step 2: Apply the migration rules.** Known call sites:
  - `KataListPage.tsx:636` page `h1` 16px -> `isMobile ? 'var(--fs-xl)' : 16`; kata card `kyu` 8px and 10px meta -> rules table.
  - `ExerciseAboutPage.tsx:135` `h1` 19px -> `isMobile ? 'var(--fs-xl)' : 19`; `:96` "fazer o desafio" 52px / 14px -> `minHeight: isMobile ? 'var(--ctl-primary)' : 52`; section labels 10px -> `'var(--fs-xs)'`.
  - `ExercisePage.tsx:425`, `:504`, `:522` bottom bar side padding 12 -> `isMobile ? 'var(--sp-5)' : 12`; "enviar" 52px / 13px -> `isMobile ? 'var(--ctl-primary)' : 52`.
  - Leave the Monaco options (`fontSize: isMobile ? 16 : 13`) as they are.

- [ ] **Step 3: Verify** — mobile probes on the three routes: `under44` empty, `textUnder11` 0, `h1` 22px; the solver bottom bar side margin is 20 (`getBoundingClientRect().left` of its first child is 20). Desktop snapshots: `diff` prints nothing. `npx tsc -b`, `npm test`.

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/src/pages/KataListPage.tsx platform/frontend/src/pages/ExerciseAboutPage.tsx platform/frontend/src/pages/ExercisePage.tsx
git commit -m "Apply the mobile scale to the kata screens"
```

---

### Task 5: Courses, lessons and the lesson map

**Files:**
- Modify: `platform/frontend/src/pages/CoursesPage.tsx`
- Modify: `platform/frontend/src/components/SkillPath.tsx`

- [ ] **Step 1: Baseline** — desktop snapshot of `/courses` with the Python course open and with a lesson open; mobile probes for the list, the open course and the lesson.

- [ ] **Step 2: Apply the migration rules.** Known call sites:
  - `CoursesPage.tsx:296`, `:406` back links ("← cursos", "← Python") 21px tall -> add `minHeight: isMobile ? 'var(--ctl-md)' : undefined` and `display: 'inline-flex'`, `alignItems: 'center'`.
  - `CoursesPage.tsx:408` course `h1` 32px -> `isMobile ? 'var(--fs-xl)' : 32`.
  - `:331` "continuar" ~50px / 15px -> `minHeight: isMobile ? 'var(--ctl-primary)' : <current>`, `fontSize: isMobile ? 'var(--fs-base)' : 15`.
  - `SkillPath.tsx`: lesson title and description sizes -> rules table with `isMobile`; do not touch the frozen geometry constants in `lib/skillPath.ts`.

- [ ] **Step 3: Verify** — mobile probes: back links 44px, `h1` 22px, `textUnder11` 0, `overflowX` false; the lesson footer button is 48px. Desktop snapshots: `diff` prints nothing. `npx tsc -b`, `npm test`.

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/src/pages/CoursesPage.tsx platform/frontend/src/components/SkillPath.tsx
git commit -m "Apply the mobile scale to courses and lessons"
```

---

### Task 6: Books and the reader

**Files:**
- Modify: `platform/frontend/src/pages/BooksPage.tsx`
- Modify: `platform/frontend/src/pages/BookReaderPage.tsx`
- Modify: `platform/frontend/src/components/AddBookModal.tsx` (path may differ; locate with Grep for `AddBookModal`)
- Modify: `platform/frontend/src/components/PdfViewer.tsx` (toolbar controls only)

**Interfaces:**
- Consumes: open question B must be answered by João before Step 3.

- [ ] **Step 1: Baseline** — desktop snapshot of `/books`, mobile probe.

- [ ] **Step 2: Apply the migration rules.** Known call sites:
  - `BooksPage.tsx:391` `h1` 40px -> `isMobile ? 'var(--fs-xl)' : 40`.
  - `BooksPage.tsx:414-416` "adicionar livro" 11px / 32px -> `fontSize: isMobile ? 'var(--fs-base)' : 11`, `height: isMobile ? 'var(--ctl-md)' : 32`.
  - Modal and viewer toolbar buttons under 44px -> `var(--ctl-icon)` on mobile.

- [ ] **Step 3: Empty book slot (open question B)** — `BooksPage.tsx:23` keeps `aspectRatio: '2/3'` at full width (350x525 on 390px). Ask João: shrink the slot on mobile (default: `maxWidth: 140` and a two-column grid), or show one "add" tile instead of four. Implement the chosen option on mobile only.

- [ ] **Step 4: Verify** — mobile probe: `h1` 22px, add button >= 44px, no empty slot taller than ~200px (or the single add tile), `textUnder11` 0. Desktop snapshot: `diff` prints nothing. `npx tsc -b`, `npm test`.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/src/pages/BooksPage.tsx platform/frontend/src/pages/BookReaderPage.tsx platform/frontend/src/components
git commit -m "Apply the mobile scale to books"
```

---

### Task 7: Configuration

**Files:**
- Modify: `platform/frontend/src/pages/ConfigPage.tsx`
- Modify: `platform/frontend/src/index.css` (the `.cfg-ctrl` / `.cfg-row` rule inside the mobile media block)

- [ ] **Step 1: Baseline** — desktop snapshot of `/config`, mobile probe (expect 4 controls under 44, 23 texts under 12).

- [ ] **Step 2: Apply the migration rules.** Known call sites:
  - `ConfigPage.tsx:670` `h1` 20px -> `isMobile ? 'var(--fs-xl)' : 20`.
  - `ConfigPage.tsx:656` `btnGhost` 11px / `5px 12px` (30px tall) -> `fontSize: isMobile ? 'var(--fs-base)' : 11`, `minHeight: isMobile ? 'var(--ctl-md)' : undefined`; "revogar" and other small buttons the same way.
  - Provider chips: remove the blanket 44px from `.cfg-ctrl button` and instead set `minHeight: isMobile ? 'var(--ctl-chip)' : undefined` with `fontSize: isMobile ? 'var(--fs-base)' : 11` so the text no longer floats in a tall empty box.
  - Keep `.cfg-ctrl input { min-height: 44px }` semantics through `--ctl-md` and `font-size: var(--fs-input)`.

- [ ] **Step 3: Verify** — mobile probe: `under44` lists only chips at 36, inputs 44 / 16px, `h1` 22px, `textUnder11` 0. Desktop snapshot: `diff` prints nothing. `npx tsc -b`, `npm test`.

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/src/pages/ConfigPage.tsx platform/frontend/src/index.css
git commit -m "Apply the mobile scale to configuration"
```

---

### Task 8: Store and store item

**Files:**
- Modify: `platform/frontend/src/pages/StorePage.tsx`
- Modify: `platform/frontend/src/pages/StoreItemPage.tsx`

- [ ] **Step 1: Baseline** — desktop snapshot of `/store` and a store item, mobile probe (expect 10 controls under 44, 25 texts under 12).

- [ ] **Step 2: Stack the sidebar on mobile (approved layout change).** `StorePage.tsx:123` holds the 220px sidebar next to the grid. On mobile render the filters as a horizontally scrolling row above the grid: container `display: 'flex'`, `overflowX: 'auto'`, `gap: 'var(--sp-2)'`, `paddingBottom: 'var(--sp-2)'`, each category a chip with `height: 'var(--ctl-chip)'`; the grid becomes full width. Desktop markup and sizes stay identical (`isMobile` branch only).

- [ ] **Step 3: Apply the migration rules.** Known call sites:
  - `StorePage.tsx:236` `h1` 36px -> `isMobile ? 'var(--fs-xl)' : 36`.
  - `StorePage.tsx:170` search input 30px / 12px -> `height: isMobile ? 'var(--ctl-md)' : 30`, `fontSize: isMobile ? 'var(--fs-input)' : 12`.
  - category rows 31px -> `minHeight: isMobile ? 'var(--ctl-row)' : <current>` (when kept as rows) or chips as in Step 2.
  - `StoreItemPage.tsx`: buy button -> `isMobile ? 'var(--ctl-primary)' : <current>`, 27 sub-12px texts via the rules table (add `isMobile` to this component).

- [ ] **Step 4: Verify** — mobile probe on `/store` and an item: `under44` only chips at 36, search input 44 / 16px, `h1` 22px, `overflowX` false (the filter row scrolls inside itself), `textUnder11` 0. Desktop snapshots: `diff` prints nothing. `npx tsc -b`, `npm test`.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/src/pages/StorePage.tsx platform/frontend/src/pages/StoreItemPage.tsx
git commit -m "Apply the mobile scale to the store and stack its filters"
```

---

### Task 9: Login and Community

**Files:**
- Modify: `platform/frontend/src/pages/LoginPage.tsx`
- Modify: `platform/frontend/src/pages/CommunityPage.tsx`

- [ ] **Step 1: Baseline** — desktop snapshots and mobile probes of `/login` (log out first) and `/community`.

- [ ] **Step 2: Apply the migration rules.** Add `isMobile` to `LoginPage` if missing; the primary button -> `isMobile ? 'var(--ctl-primary)' : <current>`, inputs -> `isMobile ? 'var(--fs-input)' : <current>`.

- [ ] **Step 3: Verify** — mobile probe: `under44` empty, `textUnder11` 0, `overflowX` false. Desktop snapshots: `diff` prints nothing. `npx tsc -b`, `npm test`.

- [ ] **Step 4: Final sweep.** Run the mobile probe on every route (`/`, `/exercise`, an exercise, its `/solve`, `/courses` list/course/lesson, `/books`, `/store`, `/config`, `/login`, `/community`). Acceptance: `textUnder11` is 0 everywhere, `under44` contains only 36px chips and tags, every `h1` is `22px`, `overflowX` is false. `/chats` and `/profile` are excluded.

- [ ] **Step 5: Commit**

```bash
git add platform/frontend/src/pages/LoginPage.tsx platform/frontend/src/pages/CommunityPage.tsx
git commit -m "Apply the mobile scale to login and community"
```

---

## Self-review against the spec

- **Tokens, one source in `index.css`, media-query redefinition:** Task 1 (with the guard test).
- **Rule 2/3 (migrate only on equal desktop value, otherwise `isMobile` ternary):** "Migration rules" table, enforced by the per-task desktop snapshot `diff`.
- **Shared classes (`.btn`, `.tag`, `.stat-label`, `.section-label`, `.tab-item`, `.diff-badge`, `.sheet-item`):** Task 2.
- **FAB gutter and covering CTAs (question A):** Task 2, Step 3, gated on João.
- **Dashboard, Kata/About/Solver, Courses/lessons, Books, Config, Store, Login/Community PRs:** Tasks 3-9, one per spec PR.
- **Empty book slot (question B):** Task 6, Step 3, gated on João.
- **Desktop outliers (question C):** resolved as the `isMobile ? 'var(--x)' : <literal>` ternary (the spec's proposed option); confirm with João when starting Task 3 if he prefers extra desktop tokens.
- **Store sidebar stacking:** Task 8, Step 2.
- **No global touch floor:** Global Constraints and per-site fixes.
- **Out of scope (`/chats`, `/profile`, Monaco, PDF canvas):** Global Constraints; excluded from the final sweep.
- **Spec typo `--sp-1..--sp-8`:** fixed in Task 1, Step 3.
