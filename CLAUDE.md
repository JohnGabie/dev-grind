# CLAUDE.md — DevGrind Architect

> This file is loaded automatically every session. It is the only source of truth
> on HOW to work. The real state of the project is in the code and in `git log`.
> It applies to any agent and any model. Roles and their procedures are in `docs/roles/`. Model names
> exist only in `docs/roles/models.md` (and the `.claude/agents/` frontmatter that mirrors it).

---

## LANGUAGE

Replies and questions to João: Portuguese. Everything else in English: code, comments, docs, specs, plans,
commit messages, Linear issues. Another language elsewhere only when João asks.

---

## WRITING (ASD-STE100)

Applies to replies to João, subagent briefs and the docs you write (specs, ADRs, roles, DEVLOG).
Portuguese text follows the same rules. There is no controlled dictionary in either language.
Out of scope: code, and the prompts of the product's AI.

1. Write one idea in each sentence. An instruction has 20 words or fewer. A description has 25 words or fewer.
2. Use the active voice. Write instructions in the imperative.
3. Use the present tense when possible.
4. Name the exact thing each time. Write "the delete-course dialog", not "the dialog". Write "the `deleting`
   state of the delete-course dialog", not "the state". Use the name from the code or `GLOSSARY.md`.
5. Use one term for one thing. Do not change the name of a thing in the same text.
6. Repeat the subject. Do not use "it", "this" or "that" if the reader can be unsure what it refers to.
7. Put steps in a numbered list, one action in each step. Write the condition before the action: "If X fails, do Y".
8. Use exact verbs: "reset", "remove", "return 404". Do not use vague verbs: "handle", "deal with", "adjust".
9. Give a paragraph one topic and 6 sentences or fewer. For a bug, use the parts Cause, Result and Fix.
10. Write only what the reader needs. Do not repeat the request. Do not add filler or a second summary.

---

## MISSION

DevGrind closes **comprehension debt**: the gap between the code AI writes and the code people understand.
The product vision is `docs/PRODUCT.md`; read it (sections 0, 11, 14 and 15 at least) before any product decision.

---

## STACK

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend | Cloudflare Workers + Hono + D1 | One backend, deployed on the edge |
| ORM | Drizzle | Typed SQL, runs on Workers |
| Storage | R2 (PDFs, covers, extracted text) | No local disk |
| Frontend | React 19 + Vite + TypeScript | Simple SPA |
| Editor | Monaco Editor | Same as VS Code |
| Code execution | Pyodide (Python in the browser) | No execution server |
| Typeface | JetBrains Mono (only font) | Dev tool aesthetic, no Syne/Outfit |
| Auth | Google OAuth + dev bypass | Zero friction |
| Agent | Claude Code /schedule (daily, 6am) | Uses the user's account, no API key in the backend |
| Content | study-backend/ (21 books, profile, quizzes) | Source of truth for content |

---

## FILE STRUCTURE

```
devgrind/
├── CLAUDE.md               ← this file
├── README.md               ← stack, local setup, deploy
├── DEVLOG.md               ← evidence journal: verified facts, gotchas (symptom → cause → fix)
├── docs/PRODUCT.md         ← the product vision (the mission comes from it)
├── docs/
│   ├── superpowers/specs/  ← one MD per feature (spec + Acceptance + plan): YYYY-MM-DD-<feature>.md; GLOSSARY.md
│   ├── adr/                ← transversal decisions (NNNN-<title>.md); README = format and index
│   ├── roles/              ← architect, executor, reviewer, qa, learning-advisor, version-control, models (tiers)
│   └── learning/           ← Learning Advisor: EVIDENCE.md, TOOLS.md, AI-BEHAVIOR.md, learning.db (its memory)
├── scripts/
│   ├── dev/                ← journal-skeleton.sh (context diary), mermaid-link.mjs (stdin → mermaid.live link)
│   └── learning/           ← learning.mjs (CLI for learning.db), store.mjs + store.test.mjs
├── .claude/                ← settings.json, hooks/ (context diary), agents/ (learning-advisor)
├── .journal/               ← context diaries (git-ignored)
├── study-backend/          ← content repo (gitignored, not always present): books/, memory/, quizzes/, student/ — DO NOT change structure
├── platform/
│   ├── worker/             ← Hono + D1 (port 8787) — ONLY backend
│   │   ├── src/
│   │   │   ├── index.ts    ← route registration
│   │   │   ├── db/         ← schema.ts (Drizzle), index.ts
│   │   │   ├── lib/        ← tools.ts (MCP+chat registry), honor, rank, progress
│   │   │   ├── middleware/ ← auth.ts (JWT)
│   │   │   └── routes/     ← auth, exercises, submissions, books, store, mcp, chat…
│   │   └── drizzle/        ← migrations
│   └── frontend/           ← React + Vite (port 5173)
│       └── src/
│           ├── pages/      ← Dashboard, Courses, Exercise, Books, Store, Chat, Profile, Config, Login…
│           ├── components/ ← layout/ (Sidebar icon rail 60px, AppLayout), SkillPath…
│           ├── hooks/      ← usePyodide
│           └── auth/       ← AuthContext
└── agent/
    ├── AGENT.md            ← agent state + run history
    ├── daily_prompt.md     ← full prompt that /schedule runs
    └── codewars_sync.py    ← reads public JohnGabie profile via the CodeWars API
```

---

## HOW THE ADAPTIVE AGENT WORKS

Batch, once a day at 6am via /schedule, never real-time validation. Full protocol and calibration: `agent/daily_prompt.md`.
- **Input**: submissions (`status`, `test_results`, `time_spent_seconds`; concepts live on the exercise) read through
  the platform MCP (`/mcp`, personal token): `get_context`, `get_analytics`, `get_progress`, `get_exercises`,
  `get_profile`; plus `study-backend/memory/*` (if present) and `agent/codewars_sync.py --json`.
- **Known gap**: the web UI saves a kata only when every test passes; failures are recorded only through MCP
  `submit_solution`. So gaps (pass rate < 60% with ≥ 5 attempts) from web practice rarely appear.
- **Output**: 1-3 exercises via `create_exercise()` (straight into D1), profile updates, `write_insight()` for the
  dashboard, a line in `agent/AGENT.md`.

**Tracked concepts** (`concepts` field on each exercise):
```
python:types, python:functions, python:async, python:oop
http:methods, http:status-codes, http:headers, http:rest
sql:select, sql:joins, sql:aggregations, sql:transactions
fastapi:routing, fastapi:pydantic, fastapi:auth, fastapi:middleware
arch:separation-of-concerns, arch:error-handling, arch:naming
```

---

## SOURCE OF TRUTH (in this order)

1. Approved feature MDs in `docs/superpowers/specs/` and accepted ADRs in `docs/adr/`.
2. This file and `docs/roles/`.
3. The code and `git log` for the real state.

Conversations and model memory are NOT sources. Two sources conflict, or the spec is vague: stop and ask.
Numbers in specs and in the agent calibration (thresholds, counts, XP, prices) are EXAMPLES to tune:
new code keeps them in one named constant or in D1, never as scattered literals.

---

## ROLES AND FLOW

| Role | File | Job |
|---|---|---|
| Architect | `docs/roles/architect.md` | Requirements, feature MD, ADRs, plan, tests first, briefs, Linear backlog |
| Executor | `docs/roles/executor.md` | Implements ONE task from a brief, at the tier the task needs |
| Reviewer | `docs/roles/reviewer.md` | STRONG, never the agent that wrote the diff; runs checks, calls QA, gives the verdict |
| QA | `docs/roles/qa.md` | Runs the Acceptance scenarios in the browser, returns evidence |
| Learning Advisor | `docs/roles/learning-advisor.md` | STRONG learning-science consultant to the team; never talks to learners; anything that touches the learner's relationship with the platform; advises, never decides |
| Version control | `docs/roles/version-control.md` | Branch health, backup and diary procedures |

Flow for a feature: Architect (+ Learning Advisor) → Executors → Reviewer → QA (+ Learning Advisor) → Reviewer → João.
In a normal session the main agent is the Architect and may also be the Executor.
A rejection goes back to the executor; after 3 cycles, escalate to the Architect and João.

**Models and subagents.** Tiers (STRONG, MEDIUM, FAST): `docs/roles/models.md`; STRONG for ambiguous decisions,
architecture, auth, data and every code review. A subagent gets a brief (format in `architect.md`) with file paths,
not the conversation. One agent = one concern; two executors never edit the same file. Whoever integrates re-runs
typecheck and tests; a failed agent = nothing delivered. An executor that fails twice on the same thing moves up one tier.

---

## WORK PROTOCOL

### Spec before code
- A feature or behavior change needs its feature MD in `docs/superpowers/specs/` (new feature) or a new Part in it
  (existing feature): the request in João's words, your reading, proposals tagged `@proposed`, out of scope.
- Then STOP and ask for approval with AskUserQuestion. The original request or silence is not approval.
  Never implement in the same reply that wrote the spec.
- **Acceptance**: natural-language tests in English inside the MD, `Scenario:` blocks in Given/When/Then with the
  steps in `docs/superpowers/specs/GLOSSARY.md`. One scenario per behavior, including empty, error and
  unknown-address states. No framework runs them: run each by hand in the browser and report which passed.
- Tags: `@decided` (approved; failing = bug) · `@proposed` (needs João's OK) · `@open` (undefined on purpose, safe default written down).
  A behavior with several dimensions gets a decision table; combinations no rule covers are listed as `@open`.
- Wherever state crosses a boundary (Worker ↔ frontend, MCP tools, Pyodide → submission, D1 schema), the MD states
  the contract: owner, units, lifecycle, format.
- An executor never weakens a scenario. Something unforeseen becomes an `@open` scenario and a question for João.
  A fixed bug adds a scenario that fails before the fix. Spec wrong midway: stop, update it, ask approval for the changed part.
- No spec for: typo, formatting, docs, a bug with an obvious local cause, a pure size/layout adjustment of something that exists.

### One feature, one MD
- One feature = one branch = one MD (`YYYY-MM-DD-<feature>.md`): spec, contract, Acceptance AND plan, as sections.
  A plan is a `## Plan: Part N` section; `docs/superpowers/plans/` gets no new files (this overrides any skill
  that saves plans elsewhere). Follow-up work is a new `## Part N`; a new MD only for a new feature on a new branch.
- Keep it current: a change to the feature's behavior, contract or plan updates its MD in the same branch, before
  the commit that ships it. Superseded text is marked superseded. An executed plan is marked "Done — historical".
- Current MDs: `2026-10-21-courses.md` (Courses), `2026-10-10-mobile.md` (Mobile).

### ADRs (transversal decisions)
A decision that applies to more than one feature (stack, auth, data conventions, D1 schema rules, rules for the
product's AI, a shared contract) gets `docs/adr/NNNN-<title>.md` (format: `docs/adr/README.md`). One-feature
decisions stay in the feature MD. The Architect writes it `Proposed`, João makes it `Accepted`; an accepted ADR is
never edited, a new one supersedes it.

### When starting a task
1. Read the feature MD or the task; know the completion criterion before starting.
2. Depends on unfinished work: stop and flag it.
3. Tests first, failing for the right reason; then the minimum code that satisfies the criterion. Nothing more.
4. Back from a pause: list the parked branches in one line and suggest finishing, slicing or dropping them. If João
   wants to go straight in, go.

### When something breaks
Reproduce first. Read logs, the HTTP response and D1 before asking. Find the root cause, then fix.
Explain the cause to João in one sentence. A non-obvious cause goes to `DEVLOG.md` as symptom → cause → fix.

### When finishing a task
1. Run the checks of what you touched, green with the exit code checked; never filter output to hide a failure:
   - Worker: `npx tsc --noEmit` and `npm test` (in `platform/worker`).
   - Frontend: `npm run build` and `npm test` (in `platform/frontend`).
   - `scripts/learning`: `node --test scripts/learning/store.test.mjs`.
2. A fixed bug gets a test that fails before and passes after. A new rule: break the code on purpose, watch the
   named test fail, restore.
3. Touched a screen: open it in the browser; go through the empty, error and with-data states and the Acceptance scenarios.
4. Say what you ran and what you saw. What was not run is "not verified".
5. The feature MD reflects what was built; a transversal decision has its ADR.

### Definition of done (scales with the change)
| Change | Done when |
|---|---|
| Typo, formatting, docs | The text is right; no review, no QA |
| Code without a spec (obvious bug, size/layout fix) | Checks green + the bug's test + review by a fresh STRONG agent (`/code-review` or a reviewer subagent) + browser check if a screen changed |
| Feature (has a feature MD) | All of the above + Acceptance scenarios passed with evidence + Reviewer approved + QA report + Learning Advisor advice if in its scope + no unverified API + `DEVLOG.md` updated if a gotcha came up |
What depends on taste (looks good, is fun, reads well) is João's call: mark it "needs João to look".

### Autocommit
Authorized: commit without asking when a unit of work is ready.
1. **Ready** = does one thing; the checks of what it touched are green. Broken or half-done is not committed.
2. **Atomic**: one reason per commit; split feature, fix and docs. Check `git diff --cached --stat` before each commit,
   so nothing already staged slips into the wrong one.
3. **Branches**: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `test/…`. Never `main`; `dev` only if João asks.
4. **Explicit staging** by path; no `git add -A`/`.`. Never stage secrets, `.env`, `.dev.vars`, `node_modules`, build
   artifacts, screenshots, or files João edited by hand that are unrelated to the task.
5. **Message**: imperative, English, states the why in ≤ 72 characters; body only if the why is not obvious.
6. **History belongs to João**: no `--amend`, `--no-verify`, `reset --hard`, `push --force`. A hook failed: fix the
   cause, new commit. Only exception: `--force-with-lease` on `backup/*`.
7. State the hash and the message at the end. Merging into `dev`/`main` and opening PRs is João's
   (template: `.github/pull_request_template.md`).

### Automatic backup
A disposable copy of the working branch `<b>` as `backup/<b>`, local and on `origin`, so work is not lost.
- **When**: before and after every context compaction; at session start and on every commit if the last backup of
  `<b>` is older than 24h or missing.
- **Push only `backup/*`**: never a plain push or a force on any other branch; never back up `main`, `dev` or a `backup/*`.
- **Cleanup** when `<b>` lands in `dev` or João declares it finished: delete only `backup/<b>`, by its full literal
  name, never with a glob or a variable that could be empty, never the current branch. The working branch is deleted
  only if João asks.
- Commands and reporting: `docs/roles/version-control.md`.

### Context diary before compaction
Before ANY compaction, and proactively when the context grows large or before suggesting `/compact`: create the diary
with `bash scripts/dev/journal-skeleton.sh <reason>`, fill every section, remove the `<!-- TODO-CONTEXT -->` markers,
then back up. Hooks enforce it. The diary is a local draft, not a source of truth, and never holds secrets.
Procedure: `docs/roles/version-control.md`.

### Questions and pending items
Every doubt, pending decision and approval request goes to João through AskUserQuestion: 2-4 concrete options,
the recommended one first and marked "(Recommended)", each saying what it implies; related questions grouped in one
call. Not as open questions at the end of a long reply. A safe, reversible conventional default: take it and say so.
When blocked: say what is missing and why, instead of inventing a solution that increases coupling.

### Backlog in Linear
Linear holds only what is left for later; the work in progress lives in the conversation, the MD and the commit.
Create an issue only for (a) a bug or problem that must be done separately (fixing it now would mix subjects,
pollute the context or need another branch) or (b) work that stays for after the current task. An out-of-scope
problem found mid-task is never fixed in passing: it goes through (a). In doubt, ask. Search before creating.
Never write the Linear API key in a file, command or conversation. Procedure and format: `docs/roles/architect.md`.

---

## CODE PRINCIPLES

1. **Minimum that works** — no abstractions for the "future"
2. **One file per responsibility** — router, service, model separate
3. **No obvious comments** — the function name already documents it
4. **State never in memory** — everything in the database
5. **Zero dependence on the context window** — the files tell everything
6. **Verify APIs in a real source** — installed package types, official docs (Hono, Drizzle, Workers, D1, R2,
   Pyodide, Monaco). Never from model memory. Not found: say it was not found
7. **Worker decides, frontend renders** — every rule that writes state (rank, honor, coins, completion) runs in the
   Worker. The frontend only derives display values; the one result it produces is Pyodide's test outcome
8. **D1 changes go through a Drizzle migration** — learner history lives for years
9. **No personal data in repo files** — no secrets, e-mails, tokens or absolute machine paths; use relative paths

---

## JOÃO DECIDES

Visual style, calibration and reward numbers, scope changes, every `@proposed` scenario and `Proposed` ADR,
merging into `dev`/`main`, deploy, and any irreversible action or one that leaves the machine (except the
`backup/*` push and Linear issues, authorized above).

---

## ANTI-PATTERNS

Product:
- ❌ Pure algorithm exercises (sorting, binary search) — focus is backend
- ❌ Real-time adaptation by the daily agent — it runs in batch. (AI evaluating katas and open answers in real time is
  allowed; where a test can decide, the test decides.)
- ❌ An AI key stored in the backend before the subscription exists — the agent uses /schedule and the chat receives
  the user's key per request. Providing the platform's own AI is a future decision that needs an ADR.
- ❌ Creating a second backend — the Worker is the only implementation of the domain
- ❌ Copying CodeWars exercises — the CodeWars API is only for profile context
- ❌ Modifying `study-backend/`, except what the daily agent writes: `student/profile.md` and the "Métricas de
  Plataforma" section of `memory/user_perfil.md`
- ❌ Using Syne, Outfit or any font other than JetBrains Mono

Process (each one is a rule above, listed here because they are the usual failures):
- ❌ Implementing in the same reply that wrote the spec
- ❌ Relaying "tests passed" from a subagent without re-running them
- ❌ Rebuilding context from the conversation instead of the files
- ❌ Inventing APIs, classes or commands
- ❌ Approving your own work; the Reviewer reading the justification before the diff
- ❌ Calling something done without evidence
