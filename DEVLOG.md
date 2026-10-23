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
