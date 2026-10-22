# CLAUDE.md — DevGrind Architect

> This file is loaded automatically every session. It is the only source of truth
> on HOW to work. The real state of the project is in the code and in `git log`.
> It applies to any agent and any model. Roles are in `docs/roles/`. Model names
> exist only in `docs/roles/models.md` (and the `.claude/agents/` frontmatter that mirrors it).

---

## LANGUAGE

English is the default for everything: code, comments, docs, specs, plans, commit messages,
Linear issues and replies. Translating or using another language is an exception, only when João asks.

---

## MISSION

Build a backend learning platform for João — a single user with ADHD who is learning
Python/FastAPI/SQL/HTTP to understand ZionHub (his production project, vibecoded with AI).

The platform has **two separate tracks**:

### Track 1 — Courses (Duolingo style)
Structured content based on the books in `study-backend/books/`. Each lesson is a
chapter with text + attached practical exercises. Linear progression by roadmap phase.
The learner advances module by module.

### Track 2 — Practice (CodeWars style, adaptive)
Standalone exercises with real execution in the browser (Pyodide). The differentiator is the
adaptive engine: the AI analyzes performance per concept and calibrates the next batch.

**Content focus:** BACKEND exercises — HTTP, SQL, FastAPI, architecture,
Python for backend. Not algorithm katas. Not puzzles. Real backend development problems.

**The CodeWars API** is context only: know what João has already solved there so
exercises are not repeated, and understand his level. Do not copy CodeWars exercises.

**The end goal:** João understands ZionHub down to the last detail, without depending on AI
to know what is happening in his own code.

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
├── CLAUDE.md               ← this file (architect)
├── README.md               ← stack, local setup, deploy
├── DEVLOG.md               ← evidence journal: verified facts, gotchas (symptom → cause → fix)
├── docs/
│   ├── superpowers/specs/  ← one MD per feature (spec + Acceptance + plan): YYYY-MM-DD-<feature>.md; GLOSSARY.md
│   ├── adr/                ← transversal decisions (NNNN-<title>.md), README = format and index
│   ├── roles/              ← architect, executor, reviewer, qa, learning-advisor, version-control, models (tiers)
│   └── learning/           ← EVIDENCE.md (research), TOOLS.md (must / must not have), AI-BEHAVIOR.md (how our AI teaches),
│                             learning.db (the Learning Advisor's memory: research, articles, insights, data, findings,
│                             decisions; local SQLite, via scripts/learning/learning.mjs)
├── scripts/dev/            ← journal-skeleton.sh
├── scripts/learning/       ← learning.mjs (CLI for learning.db), store.mjs, tests: node --test scripts/learning/store.test.mjs
├── .claude/                ← settings.json + hooks/ (context diary before compaction) + agents/ (learning-advisor)
├── .journal/               ← context diaries (git-ignored)
├── study-backend/          ← source content, separate repo (gitignored) — DO NOT change structure
│   ├── CLAUDE.md           ← Socratic mentor instructions
│   ├── books/              ← 21 books in MD (Python, FastAPI, SQL, etc.)
│   ├── memory/             ← learner profile, roadmap, feedback
│   ├── quizzes/            ← diagnostic tests already taken
│   └── student/            ← dynamic profile + sessions
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

The agent does NOT validate exercises in real time. It runs in asynchronous cycles:

```
Exercise round
    ↓ (Pyodide validates whether the code passed/failed)
Submission saved in the database with: status, test_results, time_spent, concepts
    ↓
Agent runs daily at 6am via /schedule
    ↓
Connects to the platform MCP (/mcp, personal token)
    ↓
Calls: get_context() and get_profile()  → rank, streak, gaps, style
Reads: study-backend/memory/user_perfil.md  → who the learner is
Reads: study-backend/memory/project_roadmap.md  → where they are on the roadmap
Reads: codewars_sync.py output  → what they already solved on CodeWars
    ↓
Analyzes: which concepts have a rate < 60%? what came from the previous session?
    ↓
Creates: 1-3 exercises via create_exercise() — they go straight into D1
Updates: update_profile() / add_profile_note() / write_insight() (message of the day)
Records: agent/AGENT.md with timestamp and what was generated
```

**Quantity calibration:**
- 0 exercises in the last 3 days → 1 easy exercise (re-engagement)
- Normal activity → 2 exercises on the identified gaps
- High activity (5+/day) → 3 exercises, difficulty grows

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

1. Approved specs in `docs/superpowers/specs/`.
2. This file and `docs/roles/`.
3. The code and `git log` for the real state.

Conversations and model memory are NOT sources. Two sources conflict, or the spec is vague: stop and ask. Do not decide alone.
Numbers in specs and in the agent calibration (thresholds, counts, XP, prices) are EXAMPLES to tune:
new code keeps them in one named constant or in D1, never as scattered literals.

---

## ROLES AND FLOW

Architect → Executors → Reviewer → QA → Reviewer → João.
- Architect (`docs/roles/architect.md`): requirements, spec, plan, tests first, task briefs.
- Executor (`docs/roles/executor.md`): implements ONE task from a brief. Several in parallel, each at the tier the task needs.
- Reviewer (`docs/roles/reviewer.md`): always STRONG, never the agent that wrote the diff. Checks against spec and rules, runs typecheck and tests, calls QA, gives the verdict.
- QA (`docs/roles/qa.md`): runs the Acceptance scenarios in the browser and returns evidence to the Reviewer.
- Learning Advisor (`docs/roles/learning-advisor.md`): STRONG, the learning-science consultant to the team; never
  talks to learners. Covers everything that touches the learner's relationship with the platform: shapes those
  features with the Architect, tests them in the browser in the role of a learner, and advises the Reviewer. Keeps `docs/learning/` (evidence, tools the platform must and must not have, how our AI models behave
  with learners). Focused only on learning; advises, never decides.
- Version control (`docs/roles/version-control.md`): branch health and backups. Does not implement or review merit.

In a normal session the main agent is the Architect and may also be the Executor; review still runs in a fresh
STRONG agent (`/code-review` or a reviewer subagent). Not needed for typo, formatting or docs.
A rejection goes back to the executor. Limit: 3 cycles per task, then escalate to the Architect and João.

---

## WORK PROTOCOL

### Spec before code
A feature or behavior change requires a short spec in `docs/superpowers/specs/`: the request
in João's words, your reading of it, your proposals marked `@proposed` (needs João's OK), out of scope.
Once the spec is written, STOP and ask for approval (with AskUserQuestion, see "Questions and pending items").
The original request or silence is not approval.
Every spec ends with an **Acceptance** section written as natural-language tests: `Scenario:` blocks
in Given/When/Then, in English, inside the spec itself, with the steps in `docs/superpowers/specs/GLOSSARY.md`.
One scenario per behavior, including the empty, error and unknown-address states. There is no test framework
for them: when finishing, run each scenario by hand in the browser and report which passed.
A fixed bug adds a scenario that fails before the fix.
Tags: `@decided` (approved; failing = bug), `@proposed` (needs João's OK), `@open` (undefined on purpose, safe default written down).
A behavior with several dimensions gets a decision table in the spec; combinations no rule covers are listed as `@open`.
An executor never weakens a scenario. Something the spec did not foresee becomes an `@open` scenario and a question for João.
Wherever state crosses a boundary (Worker ↔ frontend, MCP tools, Pyodide → submission, D1 schema), the spec states
the contract: owner, units, lifecycle, format.
Spec wrong midway: stop, update it and ask approval for the changed part.
No spec needed for: typo, formatting, docs, bug with an obvious local cause.

### One feature, one MD
- A feature has exactly one MD in `docs/superpowers/specs/` (`YYYY-MM-DD-<feature>.md`): request, reading, proposals,
  contract, Acceptance AND the implementation plan, as sections of the same file. `docs/superpowers/plans/` gets no
  new files; a plan is a `## Plan: Part N` section (this overrides any skill that saves plans elsewhere).
- One feature = one branch = one MD. Follow-up work on an existing feature is a new `## Part N` in its MD, not a new file.
  A new MD only for a new feature on a new branch.
- The MD is kept current: any change to the feature's behavior, contract or plan updates its MD in the same branch,
  before the commit that ships it. Superseded text is marked superseded, not left to contradict the current state.
- Current MDs: `2026-10-21-courses.md` (Courses), `2026-10-10-mobile.md` (Mobile).

### ADRs (transversal decisions)
- A decision that applies to more than one feature (stack, auth, data conventions, D1 schema rules, rules for the
  product's AI, a contract shared across features) gets an ADR in `docs/adr/NNNN-<short-title>.md`.
  Format and index: `docs/adr/README.md`.
- A decision that applies to one feature only stays in that feature's MD.
- The Architect writes the ADR as `Proposed`; João approves it (`Accepted`). An ADR is never edited after acceptance:
  a change is a new ADR that supersedes it.

### When starting a task
1. Read the spec or the task — understand the completion criterion before starting
2. If it depends on another unfinished task, stop and flag it
3. Write the tests first; they must fail for the right reason. Then write the minimum code that satisfies the criterion. Nothing more.
4. Back from a pause: list the parked branches in one line and suggest finishing, slicing
   or dropping them before opening another. If João wants to go straight in, go.

### Models and subagents
- Tiers (STRONG, MEDIUM, FAST) and what each is for: `docs/roles/models.md`. STRONG for ambiguous decisions,
  architecture, auth, data, and every code review.
- A subagent gets a short brief (format in `docs/roles/architect.md`) with file paths, NOT the conversation.
- One agent = one concern, distinct files; the contract (route, type, schema) goes in the spec. Two executors never edit the same file.
- Whoever integrates re-runs typecheck and tests. A failed agent = nothing delivered.
- Executor failed twice on the same thing: move it up one tier.

### When something breaks
Reproduce first. Read logs, the HTTP response and D1 before asking. Find the root
cause and only then fix. Explain the cause to João in one sentence.
A non-obvious cause goes to `DEVLOG.md` as symptom → cause → fix.

### When finishing a task
1. Worker: `npx tsc --noEmit` and `npm test`. Frontend, if touched: `npm run build` and `npm test`.
   Green, with the exit code checked, before saying it is done. Do not filter output to hide a failure.
2. A fixed bug gets a test that fails before and passes after. New rule: break the code
   on purpose, watch the named test fail, restore.
3. Touched a screen: open it in the browser and go through the empty, error and with-data states, running the spec's Acceptance scenarios.
4. Say what you ran and what you saw. What was not run is "not verified".
5. The feature's MD reflects what was built (One feature, one MD). A transversal decision has its ADR.

### Definition of done
Done = typecheck and tests green + Acceptance scenarios passed in the browser with evidence + no anti-pattern broken
+ no unverified API + Reviewer approved + QA report received + `DEVLOG.md` updated if a gotcha came up.
What depends on taste (looks good, is fun, reads well) is João's call: mark it "needs João to look".

### Autocommit
Authorized: commit without asking when a unit of work is ready. Push only to `backup/*` (section below), never to the working branch, `dev` or `main`.
1. **Ready** = does one thing, typecheck and tests of what it touched are green. Broken or half-done is not committed.
2. **Atomic**: one reason per commit. Mixed feature, fix and docs: split them.
3. **Working branches only** (`feat/…`, `fix/…`). Never on `main`; on `dev` only if the user asks.
4. **Explicit staging** by path. No `git add -A`/`.`. Keep out of the commit: secrets, `.env`, `.dev.vars`, `node_modules`, build artifacts, screenshots and files the user edited by hand that are unrelated to the task.
5. **Message**: imperative, English, states the why in ≤ 72 characters, in the style of `git log`. Body only if the why is not obvious.
6. **History belongs to the user**: no `--amend`, `--no-verify`, `reset --hard`, `push --force`. A hook failed: fix the cause and make a new commit. Only exception: `--force-with-lease` on `backup/*`.
7. State the hash and the message at the end.
8. Merging into `dev`/`main` and opening PRs is João's. PRs use `.github/pull_request_template.md`.

### Automatic backup (autopush)
A disposable copy of the working branch `<b>` as `backup/<b>`, local and on `origin`. It exists only so work is not lost.
1. **When**: before and after every context compaction; and if the last backup of `<b>` is older than 24h or missing, checked at session start and on every commit.
2. **How** (does not touch the working tree or the index; untracked and ignored files are left out):
   `s=$(git stash create); git branch -f backup/<b> ${s:-HEAD}; git push --force-with-lease origin backup/<b>`
   Includes the commits and the not-yet-committed work. It does not replace the commit: what is ready still goes through the rule above.
3. **Only `backup/*`**: never a plain push or a force on any other branch. Do not back up `main`, `dev` or a `backup/*`.
4. **Cleanup**: when `<b>` lands in `dev` (`git merge-base --is-ancestor <b> dev`) or the user declares the branch finished, delete only `backup/<b>`, local and remote: `git branch -D backup/<b>` and `git push origin --delete backup/<b>`. Use the full name, checking that it starts with `backup/` and is not the current branch. Never with a glob or an empty variable. The working branch is deleted only if the user asks.
5. Say in one line that a backup was made (branch and time). Network or permission failure: warn and move on, without insisting.

### Context diary before compaction
1. Before ANY compaction (manual or automatic), and proactively when the context grows large or before suggesting `/compact`:
   `bash scripts/dev/journal-skeleton.sh <reason>` creates `.journal/YYYY-MM-DD-HHMMSS-<reason>.md` (git-ignored).
   Fill EVERY section (goal; decisions and why, including rejected options; João's preferences and corrections,
   verbatim when possible; done and verified with evidence; in flight with agent/task ids; next steps in order;
   open questions; gotchas and commands that worked or failed; files to re-read; what NOT to redo; what to promote)
   and delete the `<!-- TODO-CONTEXT -->` markers. Then run the backup above.
2. Enforced by hooks in `.claude/settings.json`: PreCompact blocks a manual `/compact` while markers remain
   (automatic compaction is never blocked, it only gets a skeleton); SessionStart (compact/resume) re-injects the newest diary.
3. The diary is a local draft, not a source of truth: what lasts is promoted to the spec, `DEVLOG.md`, this file or Linear.
   Never put secrets in it.

### When blocked
Say what is missing and why, instead of inventing a solution that increases coupling.

### Questions and pending items
Every doubt, pending decision and approval request goes to João through the AskUserQuestion tool (Ask user mode):
2-4 concrete options, the recommended one first and marked "(Recommended)", with what each option implies.
Not as open questions buried at the end of a long reply. Group related questions in one call (up to 4).
If a decision has a conventional default that is safe and reversible, take it and say so instead of asking.

### Backlog in Linear
Linear holds only what is left for later. What we are doing now does not become an issue: it lives in
the conversation, the spec and the commit. Global `linear` skill (team `DEV`, project `DevGrind`). Never write
the API key in a file, command or conversation. If `py -3` fails, use the win-sandbox-lab Python 3.14.
- **Create an issue only when**: (a) you found a bug or problem that must be done separately: fixing
  it now would mix another subject into the current task and commit, pollute the context or call for
  another branch; (b) work came up that stays for after the current task (idea, improvement, next step).
  Do not create one for the task in progress, for what is already done, or for everything that crosses the mind.
  An out-of-scope problem found mid-task is never fixed in passing: it goes through (a).
  When in doubt, do not create it and ask. Search (`issues --query`) first.
- Issue = title with a concrete outcome + one Area label + one type label (`Bug`, `Feature`,
  `Improvement`) + priority. In the description: what was seen, why it was left for later and, if any,
  `Spec:` with the path in `docs/superpowers/` and `Branch:`. Specs and plans stay in the repo.
- Board: Backlog = for later; Todo = only the next one, a single issue. When resumed, move to In Progress;
  when it lands in `dev`, Done. If you solved on the spot what you were about to log: do not log it.

---

## CODE PRINCIPLES

1. **Minimum that works** — no abstractions for the "future"
2. **One file per responsibility** — router, service, model separate
3. **No obvious comments** — the function name already documents it
4. **State never in memory** — everything in the database
5. **Zero dependence on the context window** — the files tell everything
6. **Verify APIs in a real source** — installed package types, official docs (Hono, Drizzle, Workers, D1, R2,
   Pyodide, Monaco). Never from model memory. Not found: say it was not found
7. **Worker decides, frontend renders** — every rule that writes state (rank, honor, coins, completion) runs
   in the Worker. The frontend only derives display values from what the Worker returns; the one result it
   produces is Pyodide's test outcome
8. **D1 changes go through a Drizzle migration** — learner history lives for years
9. **No personal data in repo files** — no secrets, e-mails, tokens or absolute machine paths; use relative paths

---

## JOÃO DECIDES

Visual style, calibration and reward numbers, scope changes, every `@proposed` scenario, merging into `dev`/`main`,
deploy, and any irreversible action or one that leaves the machine (except the `backup/*` push and Linear issues,
already authorized above).

---

## ANTI-PATTERNS

- ❌ Pure algorithm exercises (sorting, binary search) — focus is backend
- ❌ Real-time answer validation by AI — the agent operates in batch
- ❌ Storing an AI key in the backend — the agent uses /schedule; the chat receives the user's key per request
- ❌ Creating a second backend — the Worker is the only implementation of the domain
- ❌ Copying CodeWars exercises — the CodeWars API is only for profile context
- ❌ Modifying `study-backend/` except `student/profile.md` via the agent
- ❌ Using Syne, Outfit or any font other than JetBrains Mono
- ❌ Starting to implement in the same reply in which you wrote the spec
- ❌ Relaying "tests passed" from a subagent without having re-run them
- ❌ Trusting the conversation to rebuild context — always read the files
- ❌ Inventing APIs, classes or commands — if it is not in the source, say so
- ❌ Approving your own work, or the Reviewer reading the executor's justification before the diff
- ❌ Mixing tasks in one commit, or fixing an unrelated problem "in passing"
- ❌ Hiding a failure, skipping a test, or calling something done without evidence
- ❌ Compacting without a filled context diary
