# DevGrind — Roadmap to the MVP

**Status:** draft, 2026-10-24.
João approved the MVP definition and the version order on 2026-10-24.
All other content in this file is `@proposed` until João approves it.

This file is the single roadmap of DevGrind. It holds no specs. It tells:
- where the project is;
- what the MVP needs;
- which decisions block the MVP;
- what does not matter for the MVP.

The content comes from two reviews:
- **The product review** reads `docs/PRODUCT.md` against itself. It finds what the MVP needs and the vision does not define.
- **The code review** reads the code against `docs/PRODUCT.md`. It finds what exists, what is missing and what contradicts the vision.

A number marked `[T]` is an example to tune. João decides each `[T]` number. The code keeps each one in one named constant.

---

## 1. The MVP, in João's words

The MVP is the first version that João uses for his own study. Other learners are not a goal of the MVP.

The MVP is done when:
1. João creates a course.
2. João does courses and katas.
3. João reads his books.
4. The adaptive core shows the gaps in João's profile.
5. All of the above works in the native mobile app.
6. The app is on the Play Store. Decision D1 sets the exact type of release.

The phone is the main way that João uses DevGrind.
The web is the workbench. The web is faster to build, and the app ports from it.

## 2. Where we are

The data comes from the code of the Courses branch on 2026-10-24.

| Area | State today | Contradiction with the vision |
|---|---|---|
| Courses | Built. The step types are text, fill, browser, terminal and kata. | `create_course` saves the modules JSON without validation (`platform/worker/src/lib/tools.ts:380`). Course steps have no concepts. Only katas have concepts (`tools.ts:672`, `tools.ts:681`). |
| Katas | Built. Only Python runs, through Pyodide. | The web saves an attempt only when all tests pass (`platform/frontend/src/components/KataSolver.tsx:158`). |
| Books | Built: upload, PDF reader, slots. The store sells extra slots. | `get_book_content` returns a full page through MCP (`tools.ts:622`). The vision says excerpts. A book delete removes the reading record (`routes/books.ts:227`). The vision keeps the record. |
| AI | Built: the chat with the learner's own key, and the MCP tools. | `delete_roadmap` can delete courses. Only the tool description guards it (`tools.ts:785`). |
| Adaptive core | A daily LLM batch job writes free-form JSON into `user_profiles`. The job ran one time. | The vision puts learning algorithms in code. There is no process data, no skill map and no mastery estimate. |
| Rank | One kyu rank. Each passed kata adds honor (`lib/rank.ts`, `lib/honor.ts`). | The rank measures activity. The vision says that a level means "knows". |
| Leveling test | Not built. | — |
| Mobile | The web has a phone layout (Mobile feature MD). There is no native app. | — |
| Language | The components contain Portuguese text. There is no i18n layer. | The vision says English first. |
| Learner data | There is no export and no account delete. | The vision, LGPD and Google Play require both. |
| Post-MVP modules | The store, guild, community and friends pages are visible. | The MVP cut hides them. |
| Security | Section 9 lists the findings. Kata code runs inside the page and can read the session token. | Section 9 sets the security rules. |
| Docs | `README.md:24` and the `CLAUDE.md` concept list describe a backend-only tool. | The vision covers beginners to seniors and frameworks. |

## 3. What the MVP needs

| # | Piece | Source | State today |
|---|---|---|---|
| N1 | Save every attempt as an event, failures included. | `PRODUCT.md` 4.1, 11 | Missing in the web. |
| N2 | One course format, owned and validated by the Worker. | `PRODUCT.md` 3, 5.1 | Missing. |
| N3 | A skill map. Each step and each kata names its concepts from the map. | `PRODUCT.md` 4.4 | Missing. Concepts are free strings. |
| N4 | Process data collection, with a store. | `PRODUCT.md` 4.1 | Missing. |
| N5 | A mastery estimate per concept, and spaced review, in code. | `PRODUCT.md` 4.8 | Missing. |
| N6 | A gap card that shows the attempts behind the gap. | `PRODUCT.md` 4.5; João, 2026-10-24 | Missing. |
| N7 | The leveling test and the first session. | `PRODUCT.md` 4.2, 4.3 | Missing. |
| N8 | Course creation with AI from the phone. | João, 2026-10-24 | Missing. Today the creation runs through MCP or the web chat. |
| N9 | Books with 3 free slots. | João, 2026-10-24 | Exists with other numbers. |
| N10 | The post-MVP modules hidden. | João, 2026-10-24 | Missing. |
| N11 | The native Android app. | `PRODUCT.md` 8; João, 2026-10-24 | Missing. |
| N12 | Account and data delete in the app, and a web link for the same request. | [Google Play policy](https://support.google.com/googleplay/android-developer/answer/13327111) | Missing. |
| N13 | A privacy policy and the Play data-safety form. Both declare the process data. | Google Play; LGPD (`PRODUCT.md` 13) | Missing. |
| N14 | A closed test with 12 testers for 14 days, before a production release. | [Google Play, new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465) | Not started. Decision D1 sets if the MVP needs it. |
| N15 | The security rules SEC1-SEC8, in an ADR. | João, 2026-10-24 | Missing. |
| N16 | An isolated code runner: code cannot reach the session, the page or the network. | João, 2026-10-24; finding F1 | Missing. |

## 4. Product review: what the vision does not define for the MVP

Each item is a gap in `docs/PRODUCT.md`, not in the code. Each item goes to a decision in section 5.

1. **Course creation on the phone.** The vision creates courses through MCP with the learner's own AI. A phone has no terminal. The in-app chat needs the AI key, and the vision does not say where the app keeps the key. Decision D2.
2. **"Only João" and "on the Play Store".** A production release is public, so other people can sign up. Google also requires 12 testers for 14 days first. Decision D1.
3. **The MVP subjects.** The skill map, the runtimes and the leveling test depend on the subjects. The vision starts with Python, SQL and web front-end. The code covers backend only. Decision D3.
4. **The leveling test without AI.** The first session uses cards and an AI follow-up. Without an AI key, the AI follow-up cannot run. Decision D4.
5. **Books on a phone.** A PDF is hard to read on a small screen. The vision says that EPUB is probably better. Decision D5.
6. **Transparency of process data.** The vision says that the collection is ethical. The vision does not say how the learner sees the collected data. Decision D6.
7. **The daily agent.** The vision puts the adaptation in code. Today the daily agent is the only adaptation. Decision D7.

## 5. Decisions that block the MVP

The recommended option is first in each row.

| # | Decision | Options | Blocks |
|---|---|---|---|
| D1 | The type of Play Store release for the MVP | (a) A closed test with João and up to 12 testers. Production comes later. (b) Production, after the 14-day test. (c) Internal testing only. | v1.0 |
| D2 | Course creation from the phone | (a) The in-app chat. The phone keeps João's AI key in secure storage. (b) MCP from a computer only. The phone only does courses. (c) Both. | v0.4 |
| D3 | The MVP subjects | (a) Python and backend: HTTP, SQL, FastAPI. (b) Option (a) plus SQL that runs in the browser. (c) Option (b) plus HTML, CSS and JS. | v0.2, v0.3 |
| D4 | The leveling test without an AI key | (a) Cards and fixed questions. The AI follow-up runs only when a key exists. (b) The test requires a key. | v0.3 |
| D5 | The book format in the MVP | (a) PDF only. (b) PDF and EPUB. | v0.4 |
| D6 | How the learner sees the process data | (a) A settings screen shows what is collected and why. A switch stops the collection. (b) The privacy policy only. | v0.2 |
| D7 | The daily agent after the core | (a) The agent reads the core estimate and only creates exercises. (b) The core replaces the agent. (c) Both run independently. | v0.2 |
| D8 | The kyu rank | (a) Hide the rank in the MVP. (b) Keep the rank with the label "activity". (c) Calculate the rank from the mastery estimate. | v0.1 |
| D9 | The MVP language | (a) Portuguese. Each screen keeps its strings in one place, for i18n later. (b) English and Portuguese before the Play Store. | v1.0 |
| D10 | Book text through MCP | (a) Excerpts with a length limit `[T]`. (b) Full pages. | v0.1 |
| D11 | A book delete | (a) Keep the reading record: title, pages read, related work. (b) Delete everything. | v0.1 |
| D12 | A delete that the AI asks for | (a) The platform shows a confirmation before the delete. (b) A soft delete with undo. | v0.1 |
| D13 | The Profile page | (a) Keep the learner-profile parts. Hide the social parts. (b) Hide the page until the core exists. | v0.1 |

## 6. What does not matter for the MVP

The items below wait until after v1.0. An open question in this list does not block the MVP.

- **Economy:** G-Coins, prices, the store, book-slot purchase, inflation, coin caps, cash-out, prize draws, boosters, the free tier.
- **Community:** discussions, subcommunities, search indexing, moderation, guilds, friends, personalization.
- **Publishing:** public courses, the publishing gate, the copy check, course contributions, seed courses, course licenses.
- **The master measure** (`PRODUCT.md` 4.6). João can move it into the MVP. Spike S5 runs anyway, because S5 is cheap and tests belief B7.
- **Learner data and AI:** content quality from learner data (4.7), the public portfolio, the subscription, the platform's own AI.
- **Other:** book audio, companies, the learner's own project, an open-source license, iOS.

## 7. Versions

A version is done when each "Done when" item passes. Write the evidence next to each item.

### v0.1 Foundation and risk spikes

**Part A — Foundation**
1. Merge the Courses work into `dev`. Start each later version from `dev`.
2. Hide the post-MVP modules (N10). Keep one list of active modules. The navigation, the frontend routes and the Worker routes read the list. Write an ADR with the status `Proposed`.
3. Set the free book slots to 3 (N9). Remove the slot purchase while the store is hidden.
4. Save every kata attempt, failures included (N1).
5. Validate the course format in the Worker (N2).
6. Apply decisions D8, D10, D11, D12 and D13.
7. For each parked branch, decide: finish, slice or drop.
8. Write the security ADR with the rules SEC1-SEC8 (N15). The status is `Proposed`.
9. Audit the current code against SEC1-SEC8. Record each finding in section 9.
10. Fix each high finding before the deploy. A high finding has a real path to the session token or to learner data.
11. Deploy to production.

**Part B — Risk spikes**

Each spike answers one question. The result is PASS, PASS-WITH-FALLBACK or FAIL.
Each spike ends with an ADR. The ADR records the decision, the evidence and the fallback.
If a spike fails, update the spec and ask João.
Spike code is throwaway. The ADR can make an exception.
S3 needs Part A step 4. The other spikes can run in parallel with Part A.

| Spike | Question and method | PASS | Fallback ladder |
|---|---|---|---|
| S0 Native app path | Can a native app use the same Worker? Build two throwaway screens on João's Android phone: a lesson and the profile. | Google login works. The lesson loads from the web's Worker endpoint, with no Worker change. A cold start takes less than 3 s `[T]`. | 1. Another native framework. 2. A WebView wrapper. Option 2 needs João to change `PRODUCT.md` 8. |
| S1 Code on the phone | Can the app run and grade a Python kata? | A kata with 5 tests gets its grade in less than 10 s `[T]`. João accepts typing 10 lines of code. | 1. Grading in a hidden web view. 2. Katas stay on the web. The app links to them. |
| S2 Process data | What can the editor and the reader record, and at what cost? Record 3 real sessions of João. | A 30-min session is less than 200 KB `[T]` compressed. D1 storage stays in its limits at 100 learners `[T]`. MCP cannot read raw events. | 1. Coarse events: run, submit, hint, time per step. 2. Results only. Belief B1 waits. |
| S3 Mastery algorithm | Which estimate per concept predicts the next attempt best? Replay João's attempts and a public dataset through 2-3 candidates from `docs/learning/EVIDENCE.md`. The Learning Advisor takes part. | The model is better than "overall pass rate" by 0.05 AUC `[T]` or more, on held-out attempts. | 1. The simplest model that beats the baseline. 2. A clear rule: pass rate per concept with decay, labelled provisional. |
| S4 Skill map anchor | Which open external source anchors the skill map? Compare 2-3 candidates. | One source covers each concept in use and each MVP subject (D3). Its license allows reuse. | 1. Two sources together. 2. Our own versioned list, with a source for each concept. |
| S5 Comprehension items | Can AI make good "read this code, tell what it does" items for Python? Make 20 items. | Running the code confirms each answer. João rates 16 of 20 `[T]` or more as fair. | 1. Items from a known code-comprehension bank. 2. The master measure waits until after the MVP. |
| S6 Isolated code runner | Can Pyodide run outside the page, with no session, no page and no network? Try a Web Worker in a sandboxed iframe with an opaque origin. | A test kata tries to read the token, read the page and call the network. Each try fails. A normal kata passes. An infinite loop stops after 5 s `[T]`. The page stays responsive. | 1. A Web Worker without the iframe, plus a strict Content Security Policy. 2. Katas run only on a separate origin with no session. |

**Done when**
- `dev` contains the Courses work. Production runs `dev`.
- The navigation shows only MVP modules.
- `/store`, `/guild`, `/community` and `/friends` show the unknown-address state. Their Worker routes return 404.
- The platform refuses a fourth book upload. The message names the 3-slot limit.
- A failed kata attempt in the web appears in `submissions`, with `status` and `test_results`.
- `create_course` with an unknown step type returns an error that names the step. Nothing is saved.
- `create_course` with a kata step and an unknown slug returns an error that names the step. Nothing is saved.
- The security ADR exists with the status `Proposed`.
- Section 9 lists the audit findings. No high finding is open.
- Each spike has an ADR.
- This file contains the spike results, and João approves it again.

### v0.2 Core — the platform knows what João knows

The spec of v0.2 uses the ADRs of S2, S3 and S4. Decisions D3, D6 and D7 come first. Pieces: N3, N4, N5, N6.

**Done when**
- Each course step and each kata has one or more concepts from the skill map. The Worker refuses a step or kata without a concept.
- João's profile shows an estimate for each concept with 5 attempts `[T]` or more.
- The Worker calculates each estimate with the S3 model.
- A gap is an estimate below the threshold `[T]`. The gap card shows the attempts behind the gap.
- After the review interval `[T]`, a gap gets a review. The review result changes the estimate.
- The process-data screen (D6) shows the collected data. The switch on the screen stops the collection.
- On a replay of João's history, João agrees with 4 of the top 5 gaps `[T]` or more.

### v0.3 Leveling — the first picture comes from a test

The spec of v0.3 needs decision D4. Piece: N7.

**Done when**
- The leveling test takes 15 min `[T]` or less.
- The leveling test writes an estimate for each concept of the MVP subjects.
- The learner can skip the first session. The dashboard then shows a reminder to finish the first session.
- A second leveling test shows the change per concept since the last test.

### v0.4 App — the platform in João's pocket

The spec of v0.4 uses the ADRs of S0 and S1. Decisions D2 and D5 come first. Pieces: N8, N11, N12.

**Done when**
- In the app, João does each of these actions:
  1. Logs in.
  2. Creates a course.
  3. Does a lesson.
  4. Reads a book.
  5. Sees his gaps.
  6. Takes the leveling test.
- João deletes a test account and its data from the app.
- João requests the same delete from the web link.
- João studies only on the phone for 7 days `[T]`. João records each blocker. No blocker stays open.

### v1.0 MVP — on the Play Store

Decisions D1 and D9 come first. Pieces: N13, N14.

**Done when**
- The release type from D1 is live.
- João installs the app from the Play Store.
- Each item of section 1 works in the installed app.
- The privacy policy and the data-safety form declare the process data.
- A security review of the full MVP (Worker, web, app, MCP) has no open high finding.

### v2 and later — the hidden modules come back

Each version brings back one module, with its own spec. João decides the order after v1.0.

## 8. Cheap precautions now

Each precaution costs little now and prevents a rewrite later. Each feature spec from v0.1 on checks its work against this list.

| # | Precaution | Protects |
|---|---|---|
| P1 | The Worker decides each rule. A client only shows data. The app is one more client. | v0.4 |
| P2 | Each endpoint of the web has a written contract: owner, units, format. The app uses the same contract. | v0.4 |
| P3 | Auth uses a bearer token. The token works outside a browser. | v0.4 |
| P4 | Each course step and each kata names its concepts from the skill map. | v0.2 |
| P5 | The Worker owns one course step schema. The web and the app use the same schema. | v0.4, publishing |
| P6 | Progress points to stable step ids. A course edit does not orphan the progress. | course versions |
| P7 | Each screen keeps its user-visible strings in one place. | i18n (D9) |
| P8 | Each new table with learner data goes into the export and delete list. | N12, LGPD |
| P9 | The module list also controls the app screens. | v2 |
| P10 | Each attempt is an append-only event: what, concept, result, time. | v0.2, the beliefs in `PRODUCT.md` 15 |

## 9. Security

Security is one of the priorities of the project. The adaptive core stays the main priority.
The security rules apply to each version and to each new feature.

### The rules

| # | Rule |
|---|---|
| SEC1 | Code from a learner, an AI or a course never runs on the server. Code runs only in the isolated runner on the learner's device. |
| SEC2 | The isolated runner has no access to the session token, the page, the network or the device files. |
| SEC3 | Each new language or framework passes a security gate before it ships. The gate tests isolation, the network block, a time limit and a memory limit. |
| SEC4 | Each MCP tool has a written contract: what it reads, what it writes, what it deletes. |
| SEC5 | A personal token has scopes. A token without the delete scope cannot delete. |
| SEC6 | A delete that an agent asks for needs a confirmation in the platform (D12). |
| SEC7 | Content from an agent is untrusted data. The Worker validates its schema (N2). The web shows it as text, never as executable HTML. |
| SEC8 | No MCP tool returns a kata solution, raw process data or a full book page. The learner's AI key passes through the Worker only. The Worker never stores or logs the key. |

### Findings in the code today

| # | Finding | Evidence | Severity |
|---|---|---|---|
| F1 | Pyodide runs inside the page, on the main thread. Pyodide code can reach the page through the `js` module (Pyodide docs; not tested here). The session token is in `localStorage`. So kata code can read the token and send it out. | `platform/frontend/src/hooks/usePyodide.ts:60`, `platform/frontend/src/auth/AuthContext.tsx:20` | High when content comes from other authors. Today João is the only author. |
| F2 | An infinite loop in kata code freezes the page. `runPython` runs synchronously, with no time limit. | `usePyodide.ts:71` | Medium. |
| F3 | The page loads Pyodide from a CDN without an integrity hash. | `usePyodide.ts:6`, `usePyodide.ts:57` | Medium. |
| F4 | A personal token has no scopes. One MCP token can use each tool, the delete tools included. | `platform/worker/src/routes/tokens.ts`, `platform/worker/src/lib/tools.ts:785` | Medium. |
| F5 | Good: the two step frames in the courses page use `sandbox=""`, the strictest value. | `platform/frontend/src/pages/CoursesPage.tsx:229` | — |
| F6 | Good: the Worker keeps only the hash of a personal token. | `tokens.ts:22` | — |

The v0.1 audit (Part A step 9) completes this list. Spike S6 decides the fix of F1 and F2.

### When a new language or framework comes

1. Write its runner spec. The spec states how the runner meets SEC1-SEC3.
2. Run the security gate tests of SEC3. Record the evidence in the spec.
3. If a gate test fails, do not ship the runtime. Ask João.

## 10. Next step: the MVP architecture session

Do this session after section 5 has decisions and the spikes have results. The session settles:
1. The data model of the core: events, concepts, estimates, and their links to courses, katas and books.
2. The API contract that the web and the app share (P2, P5).
3. The place of each rule: the Worker, the app, or the learner's AI through MCP.
4. What the app keeps on the phone, and what the app never keeps.

The session produces ADRs. The version specs follow the ADRs.

## 11. How to update this file

1. When a version starts, add "In progress" and the branch name to its heading.
2. When a version ends, write the evidence next to each "Done when" item. Add "Done" to the heading.
3. When a spike ends, write the result and the ADR number in its row.
4. When João takes a decision from section 5, write the option and the date in its row.
5. A change to the MVP cut, the order or a `[T]` number is João's decision. Write the date next to the change.
