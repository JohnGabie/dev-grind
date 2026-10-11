# Mobile Dashboard: analysis tab, reading page, macOS captions

**Status:** written, awaiting João's approval. Extends `2026-10-11-mobile-dashboard-profile.md` (revision 3).

## The request (João's words)

"put analises with a new aba on side of status.json, and put on my database a mock analysis. dont resize with text, a new page to read. and change Captions for macOS style. i feel the colors is too simple."

## Reading of it

1. **Tab beside `status.json`.** The first window gets a tab strip in its title bar, like an editor: `status.json` and `analise.md`. The `analise.log` window is removed from the page, so the Dashboard has three windows.
2. **No inline expanding.** The analysis tab shows a fixed-height preview (date, first line, `novo` dot) that never grows. Tapping it opens a **new page** `/analysis` for reading the full message (and older analyses). Back returns to the Dashboard.
3. **Mock analysis in the database.** One row in the local D1 `agent_insights` for João's user, with message, highlights and gaps. Local database only, inserted with a one-off SQL command; not part of the code or a migration.
4. **macOS captions.** Title bars use the three traffic-light dots (red, yellow, green) on the left, with the file name centred, replacing the `_ □ X` on the right. Decorative, `aria-hidden`.
5. **"Colours too simple."** After the calm pass the page is nearly monochrome. Proposals below.

## Proposals (undecided)

- **A. Colour (undecided):** (a) traffic-light dots plus a soft per-window accent on the prompt `$` and tab underline (cyan, green, orange, purple), JSON keys blue again; (b) only the traffic lights added, rest unchanged; (c) restore the previous multi-colour look. Recommended: (a), one accent per window, never more than two colours inside a window.
- **B. Reading page content (undecided):** latest analysis first, older ones as a list below; highlights and gaps as labelled lists. Style: same terminal window (`analise.md`, prompt `cat analise.md`).
- **C. Route:** `/analysis`, reachable only from the Dashboard tab; no dock entry.
- **D. Desktop:** untouched; `/analysis` redirects to `/` on desktop.

## Revision: real IDE look (João: "let more looks like a real code, with our themes and IDE")

This replaces proposal A. The windows look like an editor showing real files:

- **Editor chrome:** macOS dots left, then editor tabs (`status.json`, `analise.md`) with the active tab joined to the code area and a 2px accent underline; inactive tab muted.
- **Code area:** a line-number gutter (muted, right-aligned, not selectable) and syntax-highlighted content. `status.json` is real JSON: keys blue, strings green, numbers orange, braces/punctuation muted, `rank` value in its rank colour. `analise.md` is real Markdown: `#` heading in blue, `-` list markers orange, `**bold**` in yellow, code spans in cyan.
- **Status bar** at the bottom of each window, one line like an IDE footer: `JSON  UTF-8  Ln 7, Col 1` (static text, muted, with one coloured language label).
- **Theme (undecided):** colours come only from the app tokens already in `index.css` (`--cyan --green --red --yellow --blue`, plus orange and purple added as tokens), so it matches the rest of the app. The app has no theme switcher and no Monaco theme to reuse, so "our themes" is read as these tokens. If you meant a specific IDE theme (e.g. One Dark, Dracula), say which.
- This reintroduces colour, but as syntax colour in code and only inside windows. The reading page uses the same Markdown highlighting.

## Decision: black theme, blue on focus (João: "IDE looks, BLACK THEME WITH OUR BLUE ON FOCOUS")

- Windows use a near-black editor background (darker than `--bg-card`, e.g. `#0a0a0a`, one token) with a 1px `--border`.
- **Blue (`--blue`, `#3b82f6`) is the focus colour:** active tab underline, selected mode tab, the ASCII button, the prompt `$` and command, the cursor, the focus ring, and the status-bar language label. This replaces cyan as the Dashboard accent.
- Syntax colours stay as in the revision above (JSON keys blue, strings green, numbers orange, etc.) but muted so blue still reads as "where you are": keys use a softer blue than the focus blue.
- The greeting keeps its cyan name, unchanged.

## Out of scope

Editing or deleting analyses, a desktop reading page, creating analyses from the app, changes to the Profile, changes to the agent or MCP tool.

## Acceptance

At 390x844: three windows; tab switch changes the first window without changing its height by more than the content of one line; the analysis tab never grows with long text; tapping it opens `/analysis`; the reading page shows the full text with no overflow; no control under 36px; the mock row appears; tests, typecheck and guard test green; desktop snapshot unchanged.
