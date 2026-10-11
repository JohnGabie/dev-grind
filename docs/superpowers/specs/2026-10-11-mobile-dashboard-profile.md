# Mobile Dashboard and Profile redesign

Status: draft, awaiting João's review. Nothing below is implemented.
Scope: viewports `<= 768px` (`MOBILE_QUERY`) only. Desktop stays pixel-identical.
Branch: `feat/mobile-dashboard-profile` (based on `feat/course-lesson-progress`, which has the mobile scale tokens).

## The request

João, in his words:

> "i wanna redesign both for mobile ONLY, and we need make a brainstorm and make a spec"
> "i dont feel the things are placed correct. the analysis is good to show, but idk need to be on focus, because you read only 2 times per week"
> "now im care about the thing fit better, and looks right and not vibecoded and create a standard pattern. after that when the project gaining maturity i will change adding and remove, this applies to profile. I wanna organize, and dont let broken"

## Reading of it

- Two existing screens get a **mobile-only layout of their own**. The desktop files are not edited.
- No single hero thing. The numbers (kyu, streak, honor) are valuable and today sit in the wrong place. The agent's analysis is valuable but is read about twice a week, so it must be reachable and visibly new, not a main block.
- The result is a **repeatable pattern**: a small set of mobile building blocks and a page that is an ordered list of independent sections, so adding or removing a section later cannot break the others.
- It must look intentional, not generated: the existing palette, JetBrains Mono, the size scale, 1px borders, no decoration.

## Decisions already taken (with João)

| Topic | Decision |
|---|---|
| Dashboard header | **Kept as is**: the greeting, the cyan name and the date. Only size and spacing follow the scale. |
| Profile identity | **Kept as is**: photo, cover, kyu number and the progress circle. Mobile means resize and re-space, not redesign. |
| Dashboard hierarchy | **Status first**: header, status card, next action, analysis collapsed, history |
| Profile, visible without a tap | Identity + rank progress, activity heatmap, badges |
| Profile, collapsible rows | Bio, social links |
| Friends and Guild | **Removed from the mobile Profile.** Each gets its own page, shown as "em desenvolvimento" until real |
| Locked badges | A lock icon only, no progress numbers |
| Section labels | Match the app's existing label style |
| Animated store background | Kept on mobile, behind the content (content sits on solid surfaces) |
| Progress circle on mobile Profile | Shows the real `rank_progress`. Desktop ring unchanged until DEV-27. |
| Cover edit on mobile | Display only; adjust and upload stay desktop-only until a touch version is specced |
| Rank on the Dashboard status card | Bar and numbers (the Profile keeps its circle) |
| Build approach | Separate mobile components chosen by one `useMediaQuery` check; desktop files untouched |

## Today (facts from the code)

- Dashboard: greeting, stat pills, "continuar" card, insight carousel with arrows, "Treinar agora" widget with three mode tabs, horizontal history carousel (not touch-scrollable).
- Profile: 360px cover with identity overlaid, then two desktop columns. The rank ring is hardcoded to 50% (DEV-27). Friends, guild and parts of dashboard history use mock data shown as real (DEV-28). Cover adjust/upload uses mouse events only.
- Stats API already returns `rank`, `rank_progress`, `honor`, `honor_for_next_rank`, `completion_rate`, `recent_completions` (`worker/src/routes/users.ts`). No backend change is needed.

## Design

### Surfaces and tone (applies to both screens)

- At most **two raised surfaces per screen** for the NEW blocks (`--bg-card` + 1px `--border` + `--radius-lg`): on the Dashboard the status card and the next-action card. Everything else is a heading plus rows on `--bg`, separated by 1px `--border` lines.
- **Exception, by João's choice:** the Dashboard greeting and the Profile cover/identity block keep their current look (cover image, frosted identity backdrop, ring). The rules below apply to everything new, not to these two things.
- No emoji as icons, no gradients, no glow or `text-shadow`, no frosted glass, no coloured accent stripe on cards, no per-section fade-in.
- Motion only in response to a tap: expand/collapse and readout change.
- Sizes only from the scale tokens (`var(--fs-*)`, `var(--ctl-*)`, `var(--sp-*)`, `var(--radius-*)`). One justified exception: heatmap cells (data marks, not tap targets).
- Section labels use the app's existing `.section-label` style.

### Dashboard (mobile)

1. **Header (kept)**: the existing greeting ("boa noite, João" with the cyan name) and the date, exactly as they are today. Only their size and spacing follow the scale tokens. No profile entry here (it lives in "Mais").
2. **Status card** (surface 1): rank line `8kyu` at `--fs-xl` in the rank colour with `84 / 120 honor` at the right; a 4px bar filled to `rank_progress`; a line "faltam 36 para 7kyu"; then three figures in a row separated by 1px vertical lines: streak (dias), completed this week, honor. Words as labels. The whole card opens the Profile.
3. **Next action** (surface 2): the in-progress item if one exists ("continuar"), otherwise today's first exercise ("começar"). Title as heading, kyu tag, one 48px primary button. A small "mudar modo" link reveals the existing modes (Rank Up / Aquecimento / Praticar); it is hidden when there are fewer than two distinct choices.
4. **Agent analysis**: one 52px row: "análise do agente" with its date and the first line, ellipsized, plus a dot when there is something new. Tap expands it inline to the full text and the gap tokens as plain text. Older insights sit behind an "anteriores" row.
5. **History**: a plain list of the last 5 items from `/progress/recent-exercises` (kyu tag, title ellipsized, status word, age). Status words are never relabelled ("em progresso" stays "em progresso"). Empty state: "nada por aqui ainda". No "ver tudo" until a history page exists.

Removed on mobile: stat pills, the "iniciar chat com a IA" pill (the chat button exists), carousel arrows, the gradient trainer widget, all mock data.

### Profile (mobile)

1. **Identity (kept)**: the existing cover with the identity laid over it: photo, name, "membro há", the kyu number and the **progress circle**, as João likes them today. Mobile only resizes and re-spaces it: a shorter cover (about 200px instead of 360px), a smaller avatar and ring from the size scale, the identity block sized to the 20px gutters, nothing added and nothing redesigned. The ring is fed the real `rank_progress` (today it is hardcoded to 50%, DEV-27), see open question 6. Below it, one row with completion rate (and active days if the stats API returns it; otherwise omitted).
2. **Activity heatmap**: the last **20 weeks**, 12px cells with 4px gaps (16px pitch, about 320px plus a day-letter column), the existing four cyan opacity steps. Tapping or dragging selects the nearest day, drawn with a 1px `--text` outline; a one-line **readout** under the grid always shows the selected day ("ter 7 out · 2 katas, 1 aula", default today). A "365 dias" toggle turns the grid into a horizontal scroller anchored at today. Cells are not shrunk.
3. **Badges**: one row of 36px squares with 8px gaps (up to 8; a 4-column wrap otherwise). Earned: 1px border and icon in the badge colour. Locked: `--border` border and a lock icon in `--faint`. Tapping fills the same readout with the badge name and what it is for. The whole row is one 44px-tall hit area.
4. **Collapsible rows**: bio (collapsed shows its first line; edit inline with a 16px textarea and 44px buttons) and social links (rows: icon in `--muted`, network, handle; only filled networks plus one "adicionar rede" row; no brand colours).

Removed on mobile: the recent-completions list (it duplicates the Dashboard history), friends, guild, all mock data. The cover stays visible; its adjust and upload controls are mouse-only today, so they stay desktop-only for now (open question 7).

### Friends and Guild pages

Two new routes, `/friends` and `/guild`, each a plain "em desenvolvimento" page in the same style as the existing Community page. The mobile "Mais" sheet gets two entries ("Amigos", "Guilda"). The desktop navigation is not changed in this work (mobile only).

### Building blocks (`platform/frontend/src/mobile/`, one file each)

| Block | Job |
|---|---|
| `MobilePage` | Shell: 20px gutters, top inset, bottom dock space, vertical rhythm from `--sp-*` |
| `Section` | Labelled block; optional collapsible; optional "new" dot |
| `Stat` | Figure with a word label (no card of its own) |
| `RankCard` | Rank, honor numbers, progress bar, "faltam N"; shared by both screens |
| `ActionCard` | Title, meta, one 48px primary button |
| `ListRow` | Tappable 52px row: leading tag, title, trailing meta |
| `Readout` | One fixed-height line under a grid showing the selected item (heatmap, badges) |
| `SectionState` | Loading (a static line, no shimmer), empty, and error with retry, per section |

A page is an **ordered list of sections**. Each section receives its data as props from one page-level hook, so a failure shows that section's error state and leaves the others intact. Adding a section is adding one element; removing one is deleting it.

### Data

- One page-level hook per screen (`useDashboardData`, `useProfileData`) fetches each endpoint once and hands slices to sections, so `/users/me/stats` is requested once per page and not once per section.
- The mobile code never imports or renders any `MOCK_*` data. Missing data is an empty state or an omitted section.
- No new endpoint and no schema change.

### Selection

`DashboardPage` and `ProfilePage` get a single early branch: `useMediaQuery(MOBILE_QUERY) ? <DashboardMobile/> : <existing desktop body>`. The desktop body is moved into the same file unchanged (hooks stay unconditional), or the branch lives in a thin wrapper route component, whichever leaves the diff to desktop code empty.

## Acceptance criteria (measured at 390x844 unless stated)

1. The Dashboard's primary 48px button is fully visible above the dock without scrolling.
2. No text under 11px, no control under 36px (chips) / 44px (taps), no horizontal page overflow on `/` and `/profile`, `/friends`, `/guild`.
3. Desktop computed-style snapshots of `/` and `/profile` at 1440px are byte-identical before and after (the existing snapshot method), and no desktop file under `src/pages` changes except the selection branch.
4. Every section has working loading, empty and error states; breaking one fetch (offline mock) leaves the other sections rendered.
5. `src/mobile/` contains no raw `fontSize: <number>` outside the heatmap cell constant, no emoji icons, and no `MOCK_` references (guard test, source-contract style like `uiScale.test.ts`).
6. Frontend `tsc -b` and `npm test` are green.

## Out of scope

- Any desktop change, including DEV-27 (rank ring 50%) and DEV-28 (mock data on desktop).
- A history page; real friends and guild features; cover upload on mobile; backend changes.
- `/chats` (DEV-24), the Store item page (DEV-26).

## PR plan

| # | Scope | Verify |
|---|---|---|
| 1 | Foundation: `src/mobile/` blocks, `SectionState`, the guard test, the selection branch rendering an empty mobile page | desktop snapshot identical; guard test fails on a raw size |
| 2 | `DashboardMobile` and `useDashboardData` | criteria 1, 2, 4 on `/` |
| 3 | `ProfileMobile` and `useProfileData` (identity/rank, heatmap + readout, badges, collapsibles) | criteria 2, 4 on `/profile` |
| 4 | `/friends` and `/guild` placeholder pages and the two "Mais" entries | routes render; dock highlight |

## Open questions (defaults in brackets)

1. The "new" dot on the analysis row: [per-device "opened since this insight was generated" marker in local storage] or [generated in the last 3 days, no storage].
2. When both exist, which wins in the next-action card: [the in-progress item, unless it is already passed] or [today's new exercise].
3. Does the stats API return active days? [Show it only if present.]
4. Do Friends and Guild also appear in the desktop navigation later? [Not in this work.]
5. Is 20 weeks the right default window on a real phone? [Yes; verify on device in PR 3.]

(Questions 6 to 8 of the first draft were answered by João and moved to the decisions table.)
