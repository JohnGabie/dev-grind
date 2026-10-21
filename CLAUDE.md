# CLAUDE.md — DevGrind Architect

> This file is loaded automatically every session. It is the only source of truth
> on HOW to work. The real state of the project is in the code and in `git log`.

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
├── docs/superpowers/       ← specs/ and plans/ (YYYY-MM-DD-<topic>.md)
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

## WORK PROTOCOL

### Spec before code
A feature or behavior change requires a short spec in `docs/superpowers/specs/`: the request
in João's words, your reading of it, your proposals marked "undecided", out of scope.
Once the spec is written, STOP and ask for approval. The original request or silence is not approval.
Every spec ends with an **Acceptance** section written as natural-language tests: `Scenario:` blocks
in Given/When/Then, in English, inside the spec itself. One scenario per behavior, including the empty,
error and unknown-address states. There is no test framework for them: when finishing, run each
scenario by hand in the browser and report which passed. A fixed bug adds a scenario that fails before the fix.
Spec wrong midway: stop, update it and ask approval for the changed part.
No spec needed for: typo, formatting, docs, bug with an obvious local cause.

### When starting a task
1. Read the spec or the task — understand the completion criterion before starting
2. If it depends on another unfinished task, stop and flag it
3. Write the minimum code that satisfies the criterion. Nothing more.
4. Back from a pause: list the parked branches in one line and suggest finishing, slicing
   or dropping them before opening another. If João wants to go straight in, go.

### Models and subagents
- Opus: ambiguous decisions, architecture, auth, data, and every code review.
- Sonnet: clear scope, new logic across several files. Haiku: mechanical tasks.
- One agent = one concern, distinct files; the contract (route, type, schema) goes in the spec.
- Whoever integrates re-runs typecheck and tests. A failed agent = nothing delivered.

### When something breaks
Reproduce first. Read logs, the HTTP response and D1 before asking. Find the root
cause and only then fix. Explain the cause to João in one sentence.

### When finishing a task
1. Worker: `npx tsc --noEmit` and `npm test`. Frontend, if touched: `npm run build` and `npm test`.
   Green, with the exit code checked, before saying it is done. Do not filter output to hide a failure.
2. A fixed bug gets a test that fails before and passes after. New rule: break the code
   on purpose, watch the named test fail, restore.
3. Touched a screen: open it in the browser and go through the empty, error and with-data states, running the spec's Acceptance scenarios.
4. Say what you ran and what you saw. What was not run is "not verified".
5. If the decision changes the architecture: record it in the feature's spec.

### Autocommit
Authorized: commit without asking when a unit of work is ready. Push only to `backup/*` (section below), never to the working branch, `dev` or `main`.
1. **Ready** = does one thing, typecheck and tests of what it touched are green. Broken or half-done is not committed.
2. **Atomic**: one reason per commit. Mixed feature, fix and docs: split them.
3. **Working branches only** (`feat/…`, `fix/…`). Never on `main`; on `dev` only if the user asks.
4. **Explicit staging** by path. No `git add -A`/`.`. Keep out of the commit: secrets, `.env`, `.dev.vars`, `node_modules`, build artifacts, screenshots and files the user edited by hand that are unrelated to the task.
5. **Message**: imperative, English, states the why in ≤ 72 characters, in the style of `git log`. Body only if the why is not obvious.
6. **History belongs to the user**: no `--amend`, `--no-verify`, `reset --hard`, `push --force`. A hook failed: fix the cause and make a new commit. Only exception: `--force-with-lease` on `backup/*`.
7. State the hash and the message at the end.

### Automatic backup (autopush)
A disposable copy of the working branch `<b>` as `backup/<b>`, local and on `origin`. It exists only so work is not lost.
1. **When**: before and after every context compaction; and if the last backup of `<b>` is older than 24h or missing, checked at session start and on every commit.
2. **How** (does not touch the working tree or the index; untracked and ignored files are left out):
   `s=$(git stash create); git branch -f backup/<b> ${s:-HEAD}; git push --force-with-lease origin backup/<b>`
   Includes the commits and the not-yet-committed work. It does not replace the commit: what is ready still goes through the rule above.
3. **Only `backup/*`**: never a plain push or a force on any other branch. Do not back up `main`, `dev` or a `backup/*`.
4. **Cleanup**: when `<b>` lands in `dev` (`git merge-base --is-ancestor <b> dev`) or the user declares the branch finished, delete only `backup/<b>`, local and remote: `git branch -D backup/<b>` and `git push origin --delete backup/<b>`. Use the full name, checking that it starts with `backup/` and is not the current branch. Never with a glob or an empty variable. The working branch is deleted only if the user asks.
5. Say in one line that a backup was made (branch and time). Network or permission failure: warn and move on, without insisting.

### When blocked
Say what is missing and why, instead of inventing a solution that increases coupling.

### Backlog in Linear
Linear holds only what is left for later. What we are doing now does not become an issue: it lives in
the conversation, the spec and the commit. Global `linear` skill (team `DEV`, project `DevGrind`). Never write
the API key in a file, command or conversation. If `py -3` fails, use the win-sandbox-lab Python 3.14.
- **Create an issue only when**: (a) you found a bug or problem that must be done separately: fixing
  it now would mix another subject into the current task and commit, pollute the context or call for
  another branch; (b) work came up that stays for after the current task (idea, improvement, next step).
  Do not create one for the task in progress, for what is already done, or for everything that crosses the mind.
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
