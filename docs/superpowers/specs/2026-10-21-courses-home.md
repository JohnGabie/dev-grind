# Courses home: make a course usable

**Status:** written, awaiting João's approval. First of five Courses pieces (see Out of scope).

## The request (João's words)

"whats missing on courses. The roadmap or career is a group of courses making a roadmap ... second organize make main page of menu usable with individual courses."

"... on course main page, we need starting fit the first versions of this idea. first at all make a course useble."

"you will build your courses using IA, so later I will build the mcp or api to do that."

On 2026-10-21 João decided: roadmaps wait for the marketplace; the kata as a lesson step is the next piece after this one; and on mobile, inside a course the bottom menu is hidden and the AI button moves to the top as a small, discreet square.

## Reading of it

Today `/courses` is a flat list of cards (`CoursesPage.tsx`). Which course and lesson is open lives only in React state, so reload, back button and links lose it. A card shows "N de M lições" and nothing else. This piece makes one course usable end to end, for the user's own courses.

## Proposals (undecided until approved)

1. **Course card.** Title, description, a progress bar with `completed / total lessons`, and one state word: `não iniciado`, `em andamento` or `concluído`. The count excludes nothing: optional lessons count only when done, never as required (same rule as the lesson map).
2. **Continue button.** On a card with progress, `continuar` opens the first lesson not completed, in map order; on `concluído` it reads `revisar`; on `não iniciado` it reads `começar`. The card body still opens the course map.
3. **URL state.** `/courses/:courseId` is the map and `/courses/:courseId/:lessonKey` is the lesson. Reload, back and shared links work. An unknown course or lesson shows a labelled "curso não encontrado" with a link back to the list. The `body.dataset.courseLesson` flag that the chat bubble reads stays, set from the route.
4. **Empty state.** "Nenhum curso ainda." with one line that courses are created by the AI assistant. No create button, because authoring is not in the app.
5. **List order.** Courses in progress first, then not started, then completed. Stable by creation date inside each group.
6. **Mobile inside a course.** The bottom menu is hidden on the map and on the lesson routes. The chat (AI) button becomes a small square at the top, styled like the screen's other controls. On the list and on all other pages nothing changes. (João's decision A; the square's exact size and corner are mine: top right, `--ctl-md`, to be checked in the browser.)
7. **Desktop.** Same list, progress and URLs. The sidebar stays; no change to the chat bubble on desktop.

## Contract kept

The `modules` JSON and the tools `create_course` and `append_course_modules` do not change. `GET /courses` already returns `completed_lessons` and `lesson_parts`; the progress and continue target are computed on the client from them. No migration, no new endpoint, no worker change.

## Out of scope

Roadmaps (groups of courses), the kata as a lesson step (next piece), ownership, price and publish flag, marketplace, reviews and reactions, buying G coins, any authoring UI, the AI/MCP authoring flow, changes to the lesson player or the lesson map.

## Acceptance

At 390x844 and desktop: list shows progress and state for the two local courses (HTML, Python) plus the empty and error states; `continuar` lands on the first unfinished lesson; reload on a lesson URL reopens that lesson; back from the lesson returns to the map, then to the list; the bottom menu is gone inside a course and the AI square is at the top without covering a control; frontend `npx tsc -b`, `npm run build` and `npm test` green; pure logic (state, progress, continue target, ordering) in a `.ts` module with `node --test` tests.
