# Courses home: make a course usable

**Status:** rewritten 2026-10-21 with Gherkin acceptance scenarios; awaiting João's approval. First of five Courses pieces (see Out of scope).

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
3. **URL state.** `/courses/:courseId` is the map and `/courses/:courseId/:lessonKey` is the lesson. Reload, back and shared links work. An unknown course shows a labelled "curso não encontrado" with a link back to the list; an unknown lesson shows "lição não encontrada" with a link back to the course map. The `body.dataset.courseLesson` flag that the chat bubble reads stays, set from the route.
4. **Empty state.** "Nenhum curso ainda." with one line that courses are created by the AI assistant. No create button, because authoring is not in the app.
5. **List order.** Courses in progress first, then not started, then completed. Stable by creation date inside each group.
6. **Mobile inside a course.** The bottom menu is hidden on the map and on the lesson routes. The chat (AI) button becomes a small square at the top, styled like the screen's other controls. On the list and on all other pages nothing changes. (João's decision A; the square's exact size and corner are mine: top right, `--ctl-md`, to be checked in the browser.)
7. **Desktop.** Same list, progress and URLs. The sidebar stays; no change to the chat bubble on desktop.

## Contract kept

The `modules` JSON and the tools `create_course` and `append_course_modules` do not change. `GET /courses` already returns `completed_lessons` and `lesson_parts`; the progress and continue target are computed on the client from them. No migration, no new endpoint, no worker change.

## Out of scope

Roadmaps (groups of courses), the kata as a lesson step (next piece), ownership, price and publish flag, marketplace, reviews and reactions, buying G coins, any authoring UI, the AI/MCP authoring flow, changes to the lesson player or the lesson map.

## Acceptance

Run by hand in the browser at 390x844 and at desktop width. Courses are shown with fixed data (intercept `GET /courses`); "I am logged in" means the dev login. Also green: frontend `npx tsc -b`, `npm run build` and `npm test`, with the pure logic (state, progress, continue target, ordering) in a `.ts` module with `node --test` tests.

```gherkin
Background:
  Given I am logged in

Scenario: The list shows progress and state for each course
  Given there are two courses: "HTML" with 5 lessons and 0 completed, "Python" with 4 lessons and 2 completed
  When I open "/courses"
  Then "HTML" shows state "não iniciado" and progress "0 de 5"
  And "Python" shows state "em andamento" and progress "2 de 4"

Scenario: A finished course shows as completed
  Given there is a course "HTML" with 5 lessons and 5 completed
  When I open "/courses"
  Then "HTML" shows state "concluído" and progress "5 de 5"
  And "HTML" has a "revisar" button

Scenario: Courses in progress come first
  Given there are courses "HTML" (5 of 5 done), "Git" (0 of 3 done) and "Python" (2 of 4 done)
  When I open "/courses"
  Then the order is "Python", "Git", "HTML"

Scenario: Continue opens the first unfinished lesson
  Given "Python" has 4 lessons and the first 2 are completed
  When I open "/courses" and press "continuar" on "Python"
  Then the address is "/courses/<python id>/0-2"
  And I see the lesson player for the third lesson

Scenario: A course that was never started offers to begin
  Given "HTML" has 5 lessons and none are completed
  When I open "/courses"
  Then "HTML" has a "começar" button

Scenario: Opening a course puts it in the address
  Given "Python" has 4 lessons and the first 2 are completed
  When I open "/courses" and press the "Python" card
  Then the address is "/courses/<python id>"
  And I see the lesson map of "Python"

Scenario: Reloading a lesson address reopens the same lesson
  Given "Python" has 4 lessons and the first 2 are completed
  When I open "/courses/<python id>/0-2" and reload the page
  Then I see the lesson player for the third lesson

Scenario: Back from a lesson returns to the map, then to the list
  Given "Python" has 4 lessons and the first 2 are completed
  When I open "/courses/<python id>/0-2" and go back
  Then the address is "/courses/<python id>"
  When I go back
  Then the address is "/courses"

Scenario: An unknown course is labelled, not blank
  When I open "/courses/does-not-exist"
  Then I see "curso não encontrado" and a link back to "/courses"

Scenario: An unknown lesson is labelled, not blank
  When I open "/courses/<python id>/9-9"
  Then I see "lição não encontrada" and a link back to "/courses/<python id>"

Scenario: No courses yet
  Given there are no courses
  When I open "/courses"
  Then I see "Nenhum curso ainda."
  And I see that courses are created by the AI assistant
  And I do not see a button to create a course

Scenario: The courses request fails
  Given `GET /courses` fails
  When I open "/courses"
  Then I see "Não foi possível carregar os cursos."
  When `GET /courses` works again and I press "tentar de novo"
  Then I see the course "Python"

@mobile
Scenario: Inside a course the bottom menu is hidden and the AI button moves to the top
  When I open "/courses/<python id>"
  Then the bottom menu is not visible
  And the AI button is a small square at the top right
  And the AI button does not cover another control

@mobile
Scenario: On the list the bottom menu and the AI button stay as they are
  When I open "/courses"
  Then the bottom menu is visible
  And the AI button is at its usual place above the bottom menu

@desktop
Scenario: Desktop keeps the sidebar and the chat bubble
  When I open "/courses/<python id>"
  Then the sidebar is visible
  And the AI button is at its usual place at the bottom right
```
