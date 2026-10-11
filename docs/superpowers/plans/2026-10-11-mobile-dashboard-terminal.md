# Mobile Dashboard, terminal and colour: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Restyle the mobile Dashboard sections to the "revision 2" design of the spec: status as a coloured JSON object, a mode-coloured prompt line, always-visible coloured mode tabs, log-style analysis and history.

**Architecture:** Same independent sections and data hooks as today (`src/mobile/dashboard/*`). New pure module `src/mobile/statusJson.ts` (tokens for the JSON block, the block-character bar) covered by `node --test`; new `src/mobile/palette.ts` names every colour; sections only change their rendering.

**Tech Stack:** React 19, inline styles with scale tokens, `node --experimental-strip-types --test`.

**Spec:** `docs/superpowers/specs/2026-10-11-mobile-dashboard-profile.md` (section "Dashboard (mobile), revision 2: terminal and colour")

## Global Constraints

- Mobile only (`src/mobile/dashboard`, `src/mobile`); desktop files untouched; the Profile untouched.
- Sizes only from tokens (`var(--fs-*)`, `var(--ctl-*)`, `var(--sp-*)`, `var(--radius-*)`). JetBrains Mono only (`var(--font)`).
- Colour only through `src/mobile/palette.ts` constants or existing CSS variables (`--green`, `--yellow`, `--cyan`, `--muted`, `--border`, `--text`). No hex literal outside `palette.ts` and `rank.ts` (rank colours already live there).
- No gradients, glow, `text-shadow`, `box-shadow`, `backdrop-filter`, emoji or accent stripes. The glyphs `✓ ✗ ◉ █ ░ ● $ >` are plain text and allowed.
- The greeting ("boa tarde, João", cyan name, blue date) stays exactly as it is.
- The 48px primary button must stay fully above the dock at 390x844 (button bottom < dock top). Touch targets: tabs 36px chips with a 44px hit area, rows 52px, no control under 36px.
- Every section keeps its own loading, empty and error states and labels.
- The guard test `src/mobile/mobile.contract.test.ts` stays green; extend it only to forbid hex colours in `src/mobile` outside `palette.ts` and `rank.ts` and the cover exception file.
- Commits: imperative English, one per task, ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01TqKRYPE7bv9MVhyz7FVdUb`. Never push. `npx tsc -b` and `npm test` in `platform/frontend` after every task.

## Palette (exact values)

`palette.ts` exports: `MODE_COLOR = { rankup: '#22d3ee', warmup: '#f97316', practice: '#22c55e' }`, `STATUS_COLOR = { passed: '#22c55e', failed: '#f97316', in_progress: '#22d3ee' }`, `STREAK_COLOR = '#f97316'`, `HONOR_COLOR = '#eab308'`, `WEEK_COLOR = '#22c55e'`, `SYNTAX_MUTED = '#717171'`.

---

### Task 1: Pure status JSON module and palette

**Files:** Create `src/mobile/palette.ts`, `src/mobile/statusJson.ts`, `src/mobile/statusJson.test.ts`; modify `package.json` test script (append the test).

**Interfaces:**
- Produces `blockBar(progress: number, width = 10): string` (filled `█` = `Math.round(clamp(progress,0,1) * width)`, rest `░`), `buildStatusLines(s: StatusInput): StatusLine[]` where `StatusInput = { rank: string; honor: number; honor_for_next_rank: number; rank_progress: number; current_streak: number; weekly: number }` and `StatusLine = { key: string; value: string | number; color: string; comma: boolean }`; `percentOf(progress)` via `progressPercent` from `rank.ts`.

- [ ] **Step 1: Write the failing tests** (`statusJson.test.ts`): (a) `blockBar(0.07)` is `'█░░░░░░░░░'` (1 filled), `blockBar(0)` all `░`, `blockBar(1.4)` all `█`, `blockBar(NaN)` all `░`; (b) for `{rank:'8kyu', honor:2, honor_for_next_rank:30, rank_progress:0.067, current_streak:0, weekly:3}` the keys in order are `rank, honor, proximo, faltam, progresso, streak, semana`, `proximo` is `'7kyu'`, `faltam` is `28`, `progresso` is `'█░░░░░░░░░ 7%'`, `streak` color is `SYNTAX_MUTED` (0) and becomes `STREAK_COLOR` when `current_streak` is 3, `semana` color is `WEEK_COLOR`, `rank` color is the rank colour of `8kyu`, `proximo` color is the rank colour of `7kyu`; (c) at `rank:'3kyu', honor:4500, honor_for_next_rank:4000` there is no `proximo` and no `faltam`; (d) only the last line has `comma: false`.
- [ ] **Step 2: Run and watch it fail** (`ERR_MODULE_NOT_FOUND`).
- [ ] **Step 3: Implement** `palette.ts` and `statusJson.ts` (pure, imports only `./rank` and `./palette`; use `rankColor`, `nextRank`, `honorMissing`, `progressPercent`).
- [ ] **Step 4: Run** the new test, `npm test`, `npx tsc -b`. Expected: all green.
- [ ] **Step 5: Commit** "Add the pure status JSON model and palette for the mobile Dashboard".

### Task 2: Status as JSON, prompt line, mode tabs

**Files:** Create `src/mobile/dashboard/StatusJson.tsx`; modify `StatusSection.tsx`, `NextActionSection.tsx`, `src/mobile/ActionCard.tsx` (add an optional `accent?: string` that colours the button's text, border (use `${accent}` with 1px) and a tint via a CSS color-mix: `color-mix(in srgb, ${accent} 12%, transparent)`; default stays the cyan it has today), `src/mobile/dashboard/useDashboardData.ts` only if needed.

**Interfaces:** Consumes `buildStatusLines`, `MODE_COLOR`, `MODE_LABEL`, `pickModes`, `distinctModeCount`, `pickNextAction`.

- [ ] **Step 1: StatusJson.tsx**: render `{`, one line per `StatusLine` indented 2 spaces (`"key": value,`) and `}`; keys, quotes, colons, commas, braces in `SYNTAX_MUTED`; string values quoted and in `line.color`; numbers in `line.color`; `fontFamily: 'var(--font)'`, `fontSize: 'var(--fs-base)'`, `lineHeight: 'var(--lh-base)'`, `white-space: pre`, `overflow: hidden`. The block is `aria-hidden`.
- [ ] **Step 2: StatusSection.tsx**: keep `SectionState` and the labelled non-ready states; in the ready state render a `Surface` with `onClick={() => navigate('/profile')}` and `aria-label` "status: {rank}, {honor} de honor, streak {n}, semana {n}" around `StatusJson`.
- [ ] **Step 3: NextActionSection.tsx**: above the card render the prompt line `$ treinar --modo {mode}` (resume: `$ continuar`) in `MODE_COLOR[mode]` (resume: cyan) with `fontSize: var(--fs-base)`, the `$` muted; render the three mode tabs always when `distinctModeCount(list) >= 2` and `action.kind === 'start'` (tabs: `rankup`, `warmup`, `practice`; 36px chips with a 44px hit area as a transparent wrapper; selected = text in its mode colour plus 1px border in that colour; unselected = muted text, `--border` border); remove the "mudar modo" link and its list. Pass `accent={MODE_COLOR[mode]}` to the ActionCard (resume: cyan). Keep the 48px button, the tag in the rank colour and the existing resume/start logic.
- [ ] **Step 4: Verify** `npx tsc -b`, `npm test`.
- [ ] **Step 5: Commit** "Render the Dashboard status as JSON and colour the next action by mode".

### Task 3: Log-style analysis and history

**Files:** Modify `AnalysisSection.tsx`, `HistorySection.tsx`; create no new files; modify the guard test as stated in Global Constraints.

- [ ] **Step 1: HistorySection**: each row is a `ListRow`-like line: glyph (`✓`/`✗`/`◉` from `statusWord` mapping to `STATUS_COLOR`), the kyu tag in its rank colour, the title, the age; keep 52px rows, ellipsis, `statusWord` unchanged (no relabelling). If `ListRow` needs a `lead` prop for the glyph, add it (optional, default none) without changing existing callers.
- [ ] **Step 2: AnalysisSection**: the collapsed row reads `> análise do agente` (the `>` in `MODE_COLOR.rankup`), date and first line ellipsized, the `● novo` dot (cyan) when new; expanded layout unchanged.
- [ ] **Step 3: Guard test**: add the hex-colour rule from Global Constraints; run it and fix any violation by moving the colour into `palette.ts`.
- [ ] **Step 4: Verify** `npx tsc -b`, `npm test`.
- [ ] **Step 5: Commit** "Style the Dashboard analysis and history as terminal log lines".

### Task 4: Screenshots and acceptance (controller)

- [ ] **Step 1:** At 390x844 take full-page screenshots of `/` in three states (default, mode `warmup` selected, analysis expanded) and review them; check the 48px button bottom is below the dock top by measurement (`primaryBottom < dockTop`), 0 controls under 36px, 0 text under 11px, no overflow, text contrast of the muted keys on `--bg` readable.
- [ ] **Step 2:** Desktop snapshot of `/` at 1440px identical to the pre-change snapshot.
- [ ] **Step 3:** Review with a fresh reviewer on the whole diff; fix Critical/Important in one pass.

## Review Focus

1. **Top rank / new account:** no `proximo`/`faltam`; zero streak is muted; empty history and analysis still show labelled empty states (pinned by `statusJson.test.ts` and Task 3 checks).
2. **Long values:** 4-digit honor and a long rank string do not wrap the JSON lines (Task 4 measurement of line widths against 350px).
3. **Only one mode available:** tabs hidden, prompt still shows the mode name.
4. **Colour contrast:** muted keys on the dark background stay readable (Task 4 screenshot review).
5. **Screen readers:** the JSON is `aria-hidden`; the label announces the values (Task 2 Step 2).
