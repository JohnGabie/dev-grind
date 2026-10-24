# DEVLOG

Evidence journal. One entry per verified fact or surprise that the code and `git log` do not explain: date, versions that worked, how it was verified, gotchas (symptom -> cause -> fix). No secrets, no personal data, no absolute machine paths.

## 2026-10-21 — local D1 reads
- `npx wrangler d1 execute study-platform --local --command "SELECT ..."` from `platform/worker` reads the local D1 that `npm run dev` uses. Without `--local` it targets the production database.

## 2026-10-23 — roadmaps and delete flows
- D1 allows 100 bound parameters per statement. A delete or insert with `IN (...)` over many ids fails above that. `platform/worker/src/lib/roadmaps.ts` chunks ids with `CHUNK = 90`; a test deletes a roadmap of 100 courses.
- D1 enforces foreign keys. Symptom: a delete fails with a foreign key error. Cause: a parent row goes before its children. Fix: delete `roadmap_courses` and `course_lesson_progress` first, then `roadmaps` and `courses`. The Vitest helper clears tables in the same order.
- `docs/learning/learning.db` changes whenever the Learning Advisor records advice. Do not stage it with feature work.
- Several agents share one Playwright browser. Symptom: pages change under a running check. Fix: tell each agent to use its own browser context.
- ESLint rule `react-hooks/set-state-in-effect` rejects `setState` inside `useEffect`. To reset state when a route value changes, store the previous key in state and compare it during render.
- A bulk delete from the app calls `DELETE /courses/:id` once per item and counts a 404 as deleted. No bulk route exists in the Worker.

## 2026-10-24 — testing on a real Android phone
- `adb reverse tcp:<port> tcp:<port>` makes `localhost:<port>` on the phone reach the PC over USB, with no network change. The phone must show "Allow USB debugging".
- Symptom: Firefox on the phone shows "A conexão foi reiniciada". Cause: Vite listens only on `[::1]` (IPv6), and `adb reverse` connects to `127.0.0.1`. Fix without touching the project: a small Node relay that listens on `127.0.0.1:5174` and forwards to `[::1]:5173`, then `adb reverse tcp:5173 tcp:5174`. The Worker listens on `127.0.0.1:8787`, so it needs no relay, and the frontend reaches it through the Vite `/api` proxy.
- Screenshots: `adb exec-out screencap -p > file.png`. Taps: `adb shell input tap X Y` in the full 1080x2400 pixels of the screen.

## 2026-10-24 — Firefox for Android layout traps
- Symptom: a gap of about 60 CSS px under the bottom menu, and empty strips under the kata page buttons and the lesson footer. Cause: Firefox for Android reports the navigation bar as `env(safe-area-inset-bottom)` (48 px) even without `viewport-fit=cover`, while the page does not draw under it. A viewport meta change cannot fix it. Fix: `watchSafeBottom()` sets `--safe-bottom` to the part of the inset that lies inside the viewport (it uses `mozInnerScreenY`, Firefox only); every bottom inset in the app reads `SAFE_BOTTOM`. If Firefox drops `mozInnerScreenY`, the app falls back to `env()`.
- Keyboard: since Firefox 132 the soft keyboard shrinks only the visual viewport. `interactive-widget=resizes-content` in the viewport meta makes the layout shrink too (works on Firefox 158). Then `innerHeight - visualViewport.height` is always 0, so the keyboard is detected from the drop of the visible height at the same width (`src/lib/softKeyboard.ts`). The root must use `100dvh`, not `100vh`.
- Gboard capitalizes and corrects typed answers unless the input sets `autocapitalize="off"`, `autocorrect="off"`, `autocomplete="off"` and `spellcheck="false"`. Monaco already does.
- Phone testing: `adb shell input text` drops characters while Gboard composes; use real taps on the keys. BACK with no keyboard open leaves Firefox. `mobile_open_url` opens a new tab on each call; `adb shell am start -a android.intent.action.VIEW -d <url> org.mozilla.firefox` reuses the tab.
