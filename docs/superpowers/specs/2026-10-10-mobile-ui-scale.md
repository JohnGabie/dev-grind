# Mobile UI scale: type, spacing and control sizes

Status: scale approved by João on 2026-10-11 (type, controls, spacing, radius; Store sidebar stacking is in scope;
no global touch floor). Written spec awaiting João's review. Still open: questions A, B and C.
Scope: viewports `<= 768px` (`MOBILE_QUERY`). Desktop stays pixel-identical.

## The request

> "reorganize the button sizes, text size and create a pattern ... something too small and
> others too big ... standard of mobile development, grid, text, buttons all types"

## Reading of it

- This is not a redesign. Colors, JetBrains Mono, layout and desktop stay as they are.
- What is missing is a **rule**: one small set of sizes that every page uses on mobile, so the
  same kind of thing (page title, primary button, chip, meta text) looks the same everywhere.
- "Too small" = 8–10px text and 21–31px tall tap targets. "Too big" = 32–40px page titles,
  a 525px-tall empty book slot, and 44px boxes wrapped around 11px text.

## Inventory

### Code (`src/pages/*.tsx`, `src/components/**/*.tsx`, `src/index.css`)

Static inline `fontSize` (388 occurrences, **23 distinct values**) plus 7 `isMobile ? a : b` and 9 in CSS:

| px | 8 | 9 | 10 | 10.5 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 20 | 21 | 22 | 24 | 26 | 28 | 32 | 36 | 40 | 48 |
|----|---|---|----|------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
| n  | 8 | 39| 72 | 1    | 89 | 73 | 36 | 19 | 7  | 3  | 3  | 10 | 12 | 1  | 2  | 2  | 3  | 2  | 2  | 1  | 1  | 1  |

209 of 388 (54%) are below 12px. Files with most sub-12 values: ProfilePage 30, DashboardPage 28,
StoreItemPage 27, ConfigPage 20, BooksPage 17, ExercisePage 16, KataListPage 14.

Other values:

| Property | Distinct values (count) |
|---|---|
| Control `height` | 22 (2), 26, 28 (14), 30 (5), 32 (9), 36 (4), 38 (2), 40 (8), 42 (3), 44 (5), 48 (6), 52 (2), 56 (4); `minHeight` 44 (9), 52 (5) |
| `padding` pairs | 50+ distinct; top: `8px 12px` (8), `0 12px` (7), `2px 8px` (6), `12px 16px`, `0 14px`, `0 10px` (5 each) |
| `borderRadius` | 15 numeric values: 5 (38), 6 (30), 8 (26), 4 (19), 3 (17), 7 (14), 10 (13), 9 (7), 2 (7), 20 (4), 14 (3), 12 (3), 1, 16, 22; plus `50%` (26) and 999px in CSS |
| `gap` | 19 values: 6 (36), 8 (39), 10 (21), 12 (21), 5 (15), 16 (11), 4, 14, 7, 3, 2, 20, 9, 18, 24, 28, 32, 36 |
| `lineHeight` | 13 values: 1 (18), 1.6 (11), 1.5 (11), 1.4 (7), 1.7, 1.65, 1.85, 1.8, 1.3, 1.75, 1.35, 1.25, 1.2 |
| SVG icon size | 16 values: 12 (19), 20 (15), 13 (15), 11 (13), 10 (10), 16 (6), 17 (5), 18 (3), 9, 14, 22, ... |
| `letterSpacing` | 12+ values between -0.03em and 0.12em |

Shared CSS classes are few and small: `.btn` 12px / `6px 14px` (~30px tall, used 7x), `.tag` and
`.diff-badge` 10px, `.stat-label` and `.section-label` 10px, dock `.tab-item` label 9px.

### Browser, 390x844, dev login

"Ctrl" = visible `button, a, input, textarea, select, [role=button]`. "Text" = elements with own
text node. The dock (5 controls 46px tall, 5 labels at 9px) is on every page and included.

| Route | Ctrl | <44px | <32px | Text | <12px | Notable |
|---|---|---|---|---|---|---|
| `/` | 15 | 8 | 7 | 35 | 27 | mode tabs + chips 28px, carousel arrows 22x22, "Treinar" 32px; h1 26px |
| `/exercise` | 13 | 0 | 0 | 21 | 14 | filters/search already 44px, 16px input; h1 16px; `kyu` 8px |
| `/exercise/:slug` | 8 | 0 | 0 | 24 | 17 | CTA 52px; title 19px; section labels 10px |
| `/exercise/:slug/solve` | 26 | 0 | 0 | 7 | 6 | all 44px; bottom bar gutter 12px, not 20 |
| `/courses` | 8 | 0 | 0 | 11 | 5 | course cards 143px tall |
| `/courses` (Python) | 11 | 1 | 1 | 11 | 5 | "← cursos" 21x62; h1 32px |
| `/courses` (lesson) | 8 | 1 | 1 | 6 | 5 | "← Python" 21px; "continuar" ~50px |
| `/books` | 7 | 1 | 0 | 16 | 12 | h1 40px; "adicionar livro" 32px/11px; empty slot 350x525 |
| `/store` | 16 | 10 | 9 | 37 | 25 | desktop sidebar on mobile; search input 30px/12px; category rows 31px; h1 36px |
| `/config` | 39 | 4 | 4 | 43 | 23 | "revogar" 30px; 44px chips with 11px text; h1 20px |
| `/chats` (DEV-24) | 8 | 1 | 1 | 12 | 10 | "Nova conversa" 26x26 |
| `/profile` (DEV-25) | 16 | 10 | 2 | 52 | 42 | social buttons 40x40, an icon button 17x21 |
| **Total** | **175** | **36** | **25** | **275** | **191** | |

Excluding the dock labels, 131 of 215 text elements (61%) render below 12px.
Rendered text sizes seen: 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 26, 28, 32, 36, 40.
No route scrolls horizontally (`scrollWidth` = 390 everywhere).

Screenshots reviewed (in `.playwright-mcp/`): `scale-dashboard.png`, `scale-katalist.png`,
`scale-exercise-about.png`, `scale-solve.png`, `scale-course-python.png`, `scale-lesson.png`,
`scale-books.png`, `scale-store.png`, `scale-config.png`.

## Diagnosis

1. **Page title has 8 sizes.** h1: Kata 16 (`KataListPage.tsx:636`), About 19 (`ExerciseAboutPage.tsx:135`),
   Config 20 (`ConfigPage.tsx:670`), Profile 24 (`ProfilePage.tsx:810`), Dashboard 26 (`DashboardPage.tsx:713`),
   Course 32 (`CoursesPage.tsx:408`), Store 36 (`StorePage.tsx:236`), Books 40 (`BooksPage.tsx:391`).
   This is the main "too big" feeling: Books/Store titles take ~2 lines of a 390px screen.
2. **Primary CTA has 4 heights.** "Treinar" 32px/12px (`DashboardPage.tsx:276`), Config actions 44px,
   lesson "continuar" ~50px/15px (`CoursesPage.tsx:331`), "fazer o desafio" 52px/14px (`ExerciseAboutPage.tsx:96`),
   solve "enviar" 52px/13px.
3. **Chips and pills: 28, 31, 44px for the same role.** Dashboard mode tabs and stat chips 28px
   (`DashboardPage.tsx:203,735,751,766`), Store category rows 31px, Config provider chips 44px via the
   blanket `.cfg-ctrl button { min-height: 44px }` (`index.css:205-208`) but text stays 11px, so they look
   like tall empty boxes ("Sair", "editar").
4. **Back links are 21px tall with no padding** (`CoursesPage.tsx:296,406`), while the solve back button is 44px.
5. **Small buttons under 32px**: `.btn` is ~30px (`index.css` `.btn`, 12px, `6px 14px`), "adicionar livro" overrides
   it to 11px → 32px (`BooksPage.tsx:414-416`), Config `btnGhost` 11px / `5px 12px` → 30px (`ConfigPage.tsx:656`),
   Dashboard carousel arrows 22x22 (`DashboardPage.tsx:823,840`).
6. **Micro text 8–10px everywhere**: dock labels 9px (`index.css:150`), section/stat labels and tags 10px,
   `kyu` 8px, timestamps 9px. Sizes differ by 1px with no meaning (9 vs 10 vs 11 for the same "meta" role).
7. **Inputs inconsistent**: Kata search 44px/16px (good), Store search 30px/12px (`StorePage.tsx:170`, triggers iOS zoom).
8. **Gutter drift**: pages use `MOBILE_GUTTER` 20, but the solve bottom bar uses 12 (`ExercisePage.tsx:425,504,522`)
   and the chat FAB uses `right: 24` (`AppLayout.tsx:181,197`).
9. **Chat FAB covers bottom CTAs**: it sits on top of "continuar" in a lesson and "fazer o desafio" on the
   About page (see `scale-lesson.png`, `scale-exercise-about.png`).
10. **Oversized block**: empty book slot keeps `aspectRatio: '2/3'` at full width → 350x525 (`BooksPage.tsx:23`).
11. **Radius has 15 values** with no role mapping (3/4/5/6/7/8/9/10 used for similar controls).
12. **Store is still the desktop layout** on mobile: 220px sidebar (`StorePage.tsx:123`) squeezes the grid to
    ~130px. The Store PR has to stack it (filters above the grid) before the scale can show; flagged
    as an open question because it is a layout change, not only a size change.

## Proposal (approved; questions A-C still open)

Approach **A** (decided by João): CSS custom properties are the token system. Each token is defined
once in `:root` in `src/index.css` with its **desktop** value, and redefined with its **mobile** value
inside `@media (max-width: 768px) { :root { ... } }`. Inline styles use `var(--token)` and follow the
breakpoint with no JS. The "desktop" column is the most frequent current value for that role in the
inventory; the numbers in the tables below were approved by João.

### Type scale (`--fs-*`, `--lh-*`)

| Token | Desktop | Mobile px / line-height | Use | Mobile replaces |
|---|---|---|---|---|
| `--fs-xs` | 10 | 11 / 1.3 | uppercase section/stat labels, tags, dock labels, badges | 8, 9, 10 |
| `--fs-sm` | 11 | 12 / 1.5 | meta: dates, counters, secondary lines | 10.5, 11, 12 |
| `--fs-base` | 13 | 14 / 1.6 | body text, buttons, chips, list rows | 13, 14, 15 |
| `--fs-input` | 13 | 16 / 1.4 | every `input`/`textarea` (iOS no-zoom) | 12, 13, 15 in inputs |
| `--fs-lg` | 15 | 17 / 1.35 | card and section titles, lesson prose | 15–19 |
| `--fs-xl` | none dominant | 22 / 1.25 | page title (one per page) | 16, 19, 20, 24, 26, 32, 36, 40 |

Big display numbers (rank 28, streak 20) stay as-is: they are numbers, not text. Dock labels use
`--fs-xs` = 11 (approved; each dock slot is ~67px and "Dashboard" at 11px is ~59px).

### Spacing grid (`--sp-*`)

Base unit **4px**. Steps `--sp-1..--sp-7` = 4, 8, 12, 16, 20, 24, 32 (same on desktop and mobile). Gutter stays 20 (`MOBILE_GUTTER`).
Gap inside a control/row: 8. Between controls: 8–12. Between cards: 12. Between sections: 24 (32 for
page-title → content). Off-grid values (2, 3, 5, 6, 7, 9, 10, 14, 18, 22, 28, 36) map to the nearest step
when a page is migrated. `letterSpacing` and `lineHeight` collapse to the line-heights in the type table.

### Controls (`--ctl-*`, heights)

| Token | Control | Desktop | Mobile height | Text | Padding-x | Radius | Mobile replaces |
|---|---|---|---|---|---|---|---|
| `--ctl-primary` | primary button (one per screen) | 40 | 48 | base 600 | 20 | md | 32, 44, 50, 52 |
| `--ctl-md` | secondary / ghost button, input, select, tab | 32 | 44 | base (input: `--fs-input`) | 16 / 12 | md | `.btn` ~30, `btnGhost` 30, 32, 40 |
| `--ctl-chip` | chip / pill (filter, mode tab) | 28 | 36 visible | base | 14 | pill | 28, 31, 44 |
| `--ctl-icon` | icon button (square), icon 20 | 32 | 44 | — | 0 | md or 50% | 17x21, 22x22, 26x26 |
| `--ctl-row` | tappable list row (min-height) | 44 | 52 | base + sm meta | 16 | lg | 31, 44 |
| `--ctl-tag` | tag (not tappable) | 18 | 20 | xs | 6 | sm | 10px tags at 18–20 |

Back links ("← cursos") use `--ctl-md` as min-height (was 21px). Minimum touch target **44x44**
(HIG / WCAG 2.5.5); 36px chips sit in rows with ≥8px spacing (WCAG 2.5.8 spacing exception).

### Radius (`--radius-*`)

`--radius-sm` 4 (tags), `--radius-md` desktop 6 / mobile 8 (controls), `--radius-lg` desktop 8 / mobile 12
(cards, sheets, panels), `--radius-pill` 999 (pills, dock). Mobile replaces 1, 2, 3, 5, 6, 7, 9, 10, 14, 16, 20, 22.

### Icons

16 inline with text, 20 in icon buttons and dock (`--icon-sm` / `--icon-md`; SVG `width` attributes
become `style={{ width: 'var(--icon-md)' }}` only where touched). Replaces 9–14, 17, 18, 22.

### Implementation rules

1. **PR 1 adds tokens only.** Nothing references them yet, so no visual change anywhere.
2. A call site migrates to `var(--token)` **only if its current desktop value equals the token's desktop
   value**: then desktop is pixel-identical and mobile picks up the media-query value.
3. Desktop outliers (e.g. page titles: no dominant desktop size) keep their literal on desktop with the
   existing pattern `isMobile ? 'var(--fs-xl)' : 40`. Every migrated page except StoreItemPage and
   LoginPage already has `isMobile`. Open question C: alternatively add per-role desktop tokens, which would
   grow the token count.
4. Shared classes (`.btn`, `.tag`, `.stat-label`, `.section-label`, `.tab-item`, `.diff-badge`,
   `.sheet-item`) get their mobile values from the tokens. `.tag`, `.stat-label`, `.section-label`,
   `.diff-badge` (10 = `--fs-xs`) and `.sheet-item` (13 = `--fs-base`) match the desktop defaults directly;
   `.tab-item` and `.sheet-item` only render on mobile; `.btn` (12px, ~30px tall) does not match, so its
   mobile values go in a `.btn` override inside the media query.
5. `src/lib/layout.ts` keeps JS geometry (`MOBILE_GUTTER`, `DOCK_HEIGHT`); `--gutter` mirrors 20 in CSS
   only if a CSS rule needs it.
6. **No global touch-target floor.** Measured in-scope (excluding Chats/Profile): 25 controls under 44px,
   22 under 32px, all from ~15 call sites (Dashboard 8, Store 10, Config 4, Courses 2, Books 1). A blanket
   `button, a { min-height: 44px !important }` would also hit inline text links, the dock and tags, so the
   fix goes at the source. The existing scoped `.cfg-ctrl` rule (`index.css:205-208`) is replaced by tokens.

Rejected alternatives: **B** shared `Button/Chip/Input/Text` components (more code and churn, decided against).
**C** global `!important` CSS floor (hits links/tags/dock, hides call sites).

## Out of scope

- `/chats` (DEV-24) and `/profile` (DEV-25): separate desktop-layout bugs on mobile; not migrated here.
- Monaco editor font (already 16px) and the PDF canvas.
- Desktop, colors, font family, any new component library.

## PR plan

Verify each PR at 390x844 with the same `browser_evaluate` probe used here (counts of controls
<44px and text <12px per route), plus a desktop screenshot at 1440px that must match before/after.

| # | Scope | Files | Risk | Verify |
|---|---|---|---|---|
| 1 | Tokens only (`--fs-*`, `--lh-*`, `--sp-*`, `--ctl-*`, `--radius-*`, `--icon-*`) in `:root` + mobile redefinition | `index.css` | None: nothing references them | `getComputedStyle(document.documentElement).getPropertyValue('--fs-base')` = 13 at 1440, 14 at 390; no screenshot diff |
| 2 | Shared classes + shell | `index.css` classes, `MobileNav.tsx`, `AppLayout.tsx` (FAB `right` → 20, lift above bottom CTAs), `ChatPanel.tsx` | Medium: classes reach every page; FAB position | `.btn` ≥44, labels 11, dock labels fit; FAB clear of "continuar"/"fazer o desafio"; desktop identical |
| 3 | Dashboard | `DashboardPage.tsx` | Low | controls <44: 8 → 0; h1 22 |
| 4 | Kata list + about + solver | `KataListPage.tsx`, `ExerciseAboutPage.tsx`, `ExercisePage.tsx` (bottom bar gutter 20) | Low; solve bar width | text <12 drops; CTA 48 |
| 5 | Courses + lessons | `CoursesPage.tsx`, `SkillPath.tsx` | Low | back links 44; h1 22; CTA 48 |
| 6 | Books + reader | `BooksPage.tsx`, `BookReaderPage.tsx`, `AddBookModal.tsx`, `PdfViewer.tsx` (toolbar only) | Low; empty-slot sizing | h1 22; empty slot ≤ ~200px; add button 44 |
| 7 | Config | `ConfigPage.tsx`, `.cfg-*` rule in `index.css` | Low | chips 36 with 14px text; `btnGhost` 44; controls <44: 4 → 0 |
| 8 | Store + item | `StorePage.tsx` (stack sidebar), `StoreItemPage.tsx` | Medium: layout change | input 44/16px; rows 52; controls <44: 10 → 0 |
| 9 | Login, Community | `LoginPage.tsx`, `CommunityPage.tsx` | Low | same probe |

Each PR from 3 on: desktop screenshot at 1440 identical before/after (rule 2 and 3 above).

Order follows traffic (dock order: Dashboard, Kata, Cursos, Livros, then "Mais").

## Decisions and open questions

Decided (2026-10-11):

1. Body text is 14 on mobile. Approved with the scale.
2. Dock labels are 11px. Approved with the scale.
3. Chips are 36px visible with spacing. Approved with the scale.
4. Page title is 22px on every page, including Books and Store. Approved with the scale.
5. Store: the 220px sidebar is stacked above the grid on mobile in PR 8. Approved.
6. No global touch-target floor; fix at the call sites. Approved.

Still open (decide before the PR that touches them):

A. FAB (chat button): move it, hide it on pages with a bottom CTA, or reserve space for it? (PR 2)
B. Empty book slots: shrink them, or show one "add" tile instead of four? (PR 6)
C. Desktop outliers: `isMobile ? 'var(--x)' : literal` at the call site (proposed), or extra desktop tokens? (rule 3)
