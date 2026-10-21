# Lesson map on narrow screens: zigzag with the text under each node

**Status:** written 2026-10-21, awaiting João's approval. Extends `2026-09-29-trilha-do-curso.md`; that spec and `lib/skillPath.ts` (frozen geometry) are not changed.

## The request (João's words)

"a trilha do curso ta quebrada" (screenshot of the Python course on a phone: labels cut at the right edge, the map scrolling sideways). Direction chosen on 2026-10-21 among two options: "Zigue-zague com texto embaixo" (keep the S-shaped path, put each lesson's text under its node).

## Cause (measured)

Every node reserves a label column of `LABEL_W = 510` px to its right. For the Python course the map is 816 px wide, the phone gives it 350 px, so the labels are clipped and the user must scroll sideways. The same happens on any container narrower than about 816 px, including a small desktop window (the sidebar plus gutters leave about 610 px at 769 px width).

## Reading of it

A second, narrow layout for the same map. The desktop layout is untouched. The narrow layout keeps the same lane order (the zigzag is the same S for the same course), but puts the text under each node and compresses the lanes to the container width, so nothing is clipped and nothing scrolls sideways.

## Proposals (undecided until approved)

1. **When it applies.** The narrow layout is used whenever the container is narrower than the desktop map (`container width < desktop map width`), measured with a `ResizeObserver`; this covers phones and small windows. Wider containers keep today's layout.
2. **Where the code lives.** A new pure module `lib/skillPathNarrow.ts` with `placeSkillPathNarrow(courseId, lessons, completed, width): SkillMap` (same `SkillMap` shape plus, per node, its label box). `lib/skillPath.ts` stays frozen. `SkillPath.tsx` picks the layout and renders the label from the node's label box.
3. **Lanes.** Same `mainLanes(courseId, n)` order. Lane centres are `NODE / 2`, `width / 2` and `width - NODE / 2`, so at 280 px (320 px phones) the three nodes still fit side by side. Node size is unchanged.
4. **Label under the node.** Width `min(width, 260)`; left lane left-aligned to the left edge, center lane centred on the node, right lane right-aligned to the right edge. Title on one line with ellipsis, description clamped to 2 lines, the word `opcional` under it for optional lessons. The label has an opaque `var(--bg)` background.
5. **Connectors.** Same `connector()` shapes between node centres, drawn behind the labels; where a label covers the line it hides it, so the line goes behind the text. The vertical step between required nodes stays `V_STEP` (192) when no optional lesson hangs under a node; label block height (up to 81 px plus 27 px for `opcional`) plus node 84 plus gaps fits inside it.
6. **Progress fraction** (`2/2`) sits beside the node on the side facing the centre of the screen (right of left-lane and centre nodes, left of right-lane nodes).
7. **Optional lessons.** Instead of a side branch (which would leave the screen), each optional lesson is a smaller row (node 56 px, dashed as today, title and `opcional` to its right) placed under its parent's label, indented from the lane. The vertical step after a required node grows by 64 px per optional lesson it owns. No sideways branch connector in this layout.
8. **Section titles.** Same band above the first node of each section, centred in the container, clamped to the container width (long titles end in an ellipsis).
9. **Scrolling.** No horizontal scroll in the narrow layout. The existing behaviour of centring the current node vertically on open stays.
10. **Behaviour that does not change.** Node states and colours, locked-node explanation, tapping a node to open the lesson, `aria` labels, the 56/84 hit area rules, tests of `lib/skillPath.ts` and `SkillPath.contract.test.ts`.

## Out of scope

Changing the desktop geometry, `mainLanes`, node size or colours; drawing a sideways branch on narrow screens; zoom or pinch on the map; a different map for tablets beyond rule 1.

## Acceptance

```gherkin
Background:
  Given I am logged in
  And the course "Python" has 4 required lessons in one section, the first 3 completed

Scenario: Nothing is clipped on a phone
  When I open "/courses/<python id>" at 390px
  Then the map does not scroll sideways
  And every lesson title is fully visible or ends in an ellipsis inside the screen
  And every description shows at most 2 lines inside the screen

Scenario: Nothing is clipped on the smallest phone
  When I open the same course at 320px
  Then the map does not scroll sideways
  And no node or label crosses the left or right edge

Scenario: The zigzag is kept
  When I open the course at 390px
  Then the nodes use the same left, center and right lanes as at 1280px for the same course

Scenario: The text sits under its node
  When I open the course at 390px
  Then each label is directly under its node
  And no label covers another node

Scenario: The line goes behind the labels
  When I open the course at 390px
  Then the connector between two nodes is visible between the labels
  And no connector is drawn over label text

Scenario: Progress fraction stays on screen
  Given a lesson with 3 parts and 1 done in each lane
  When I open the course at 320px
  Then each "1/3" is fully visible and does not overlap a node or a label

Scenario: Optional lessons hang under their parent
  Given the first lesson owns two optional lessons
  When I open the course at 390px
  Then both appear as smaller rows under that lesson's label, each with "opcional"
  And the next required node moves down by 128px
  And nothing is clipped

Scenario: Opening a lesson still works
  When I tap the current node
  Then the address is "/courses/<python id>/0-3"

Scenario: The current node is centred on open
  When I open a long course at 390px
  Then the current node is vertically near the middle of the screen

Scenario: Desktop is unchanged
  When I open the course at 1280px
  Then the map looks as before, with the text to the right of each node
  And the tests of lib/skillPath.ts pass unchanged

Scenario: A small desktop window uses the narrow layout
  When I open the course at 800px with the sidebar
  Then the map does not scroll sideways
```
