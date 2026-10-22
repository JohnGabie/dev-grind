# Platform tools for learning

Which tools the platform must have to support learning, which it must not have, and which are allowed only under
conditions. Kept by the Learning Advisor; every row cites `EVIDENCE.md`. Everything here is `@proposed` until João
approves the row; approved rows become `@decided`. The current platform is not the reference: a row says what the
vision needs, not what exists.

## Must have
| Tool | Why (EVIDENCE.md) | Status |
|---|---|---|
| Code runner with tests and readable failure messages (what failed, where to look) | 3.1 feedback | @proposed |
| Predict-before-run prompt ("what will this print?") | 2.6 PRIMM, 1.1 retrieval | @proposed |
| Worked example → fill-the-gap / Parsons → blank editor, per concept | 2.1, 2.2, 2.3 | @proposed |
| Help that fades per concept as the learner succeeds | 2.2 expertise reversal | @proposed |
| Hint ladder (nudge → concept → partial code → answer last) with an explain-before-next step | 3.2, 4.6 | @proposed |
| Spaced review: concepts come back after days | 1.2 spacing | @proposed |
| Recall at the end of a lesson (produce, not re-read) | 1.1 retrieval | @proposed |
| "Explain in your words" prompt after examples and passed tests | 2.7 self-explanation | @proposed |
| AI tutor with pedagogy built in (see `AI-BEHAVIOR.md`) | 4.1, 4.2 | @proposed |
| Course and manual authoring where the learner explains and the AI questions, checks and grounds | 5.1, 4.1, 4.3 | @proposed |
| Source grounding for AI-made content (books, the learner's own code) | 4.3 | @proposed |
| Community review and comments on courses and exercises | 5.2, 4.3 | @proposed |
| Small first contributions for newcomers (react, review, add an exercise) | 5.3 | @proposed |
| Guided tours through real code (ZionHub), predicting and explaining at each stop | 4.4 | @proposed |
| Progress shown against the learner's own past | 6.3, 6.5 | @proposed |
| Mastery per concept, with a definition João sets | 1.4 | @proposed |

## Must not have
| Tool | Why (EVIDENCE.md) | Status |
|---|---|---|
| AI code completion in practice and lesson editors | 4.7 | @proposed |
| "Show solution" available before an attempt | 4.6, 1.1 | @proposed |
| AI chat that writes the full solution on request by default | 4.1, 4.6 | @proposed |
| AI that writes the whole course while the learner only reads | 4.1, 5.1 | @proposed |
| Global absolute leaderboard as the default view | 6.5 | @proposed |
| Coins or points paid per completed lesson as the main reward | 6.2, 6.1 | @proposed |
| Hard punishment for a missed day (lost streak with no recovery) | 6.4 | @proposed |
| Long unbroken reading before any activity | 2.4, 1.1 | @proposed |

## Allowed under conditions
| Tool | Condition | Why | Status |
|---|---|---|---|
| Full solution | Only after real attempts and the hint ladder, followed by "explain it back" | 4.6, 2.7 | @proposed |
| Struggle-first problems | Only on concepts the learner already touched | 2.5 | @proposed |
| Mixing concepts in one session | Only after each concept's basics hold | 1.3 | @proposed |
| Streaks | Soft, with recovery; never the main engine | 6.4, 6.1 | @proposed |
| Coins | Tied to value for others (used courses, useful reviews) | 6.2 | @proposed — João decides |
| Leaderboards | Relative or opt-in, for the community side | 6.5 | @proposed |
