<div align="center">

# DevGrind

**A backend learning platform built for one person.**

*Learn Python · FastAPI · SQL · HTTP by solving real backend problems — not algorithm puzzles.*

<br>

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Pyodide](https://img.shields.io/badge/Pyodide-3776AB?style=flat-square&logo=python&logoColor=white)](https://pyodide.org)

</div>

---

## What is DevGrind?

DevGrind is a personal study platform built for a single developer with ADHD learning backend development — Python, FastAPI, SQL and HTTP — with the goal of fully understanding his own production project without depending on AI to navigate his own code.

It is not a generic coding platform. Every exercise, every lesson, and every AI-generated batch is calibrated to a personal roadmap built on top of 21 real books on backend development.

---

## Two learning tracks

### Track 1 — Courses `(Duolingo-style)`
Structured, linear progression through modules. Content is based on books in `study-backend/books/`. Each lesson maps to a book chapter with practical exercises attached. The learner advances phase by phase.

### Track 2 — Practice `(CodeWars-style, adaptive)`
Standalone exercises with **real Python execution in the browser** via [Pyodide](https://pyodide.org) (WebAssembly). An AI agent runs every 6 hours, analyses performance by concept, and generates a calibrated batch of new exercises targeting identified gaps.

> **Note on CodeWars:** The CodeWars public API is used only to read completed katas (to avoid repeating topics already known). No exercises are copied from CodeWars — all content is generated or curated for real backend scenarios.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Cloudflare Workers + Hono | Edge-deployed, zero cold starts |
| Database | Cloudflare D1 (SQLite) | Serverless SQL; will be migrated to PostgreSQL as a live exercise |
| ORM | Drizzle ORM | Type-safe SQL, runs on Workers |
| Frontend | React 18 + Vite + TypeScript | Simple SPA, no SSR needed |
| Code Editor | Monaco Editor | Same engine as VS Code — identical shortcuts |
| Code Execution | Pyodide (Python → WASM) | No execution server, no rate limits, runs 100% in browser |
| Typography | JetBrains Mono (only font) | Full monospace, weights 400–800. Developer tool aesthetic |
| Auth | Google OAuth + dev bypass | Zero friction; whitelist by email |
| Adaptive Agent | Claude Code `/schedule` (6h) | Uses existing account — no API key needed in the backend |

---

## How the adaptive agent works

The agent does **not** validate exercises in real time. It runs in async cycles every 6 hours.

```
1. User solves exercises
      Pyodide validates code in the browser (pass / partial / fail)
      Submission saved: status, test results, time spent, concepts, cursor heatmap

2. Agent fires every 6h (Claude Code /schedule)
      Reads: GET /analytics/performance  → pass rate per concept
      Reads: study-backend/memory/       → user profile + roadmap
      Reads: chat_messages               → recent questions as gap signal

3. Gap analysis
      Requires ≥ 2 independent signals before acting on a gap
      (e.g. low pass rate + repeated chat questions on same concept)

4. Generates calibrated exercises
      Writes 1–3 JSON files to exercises/generated/YYYY-MM-DD/
      Calls POST /exercises/load
      Saves a brief insight to agent/last_insight.json

5. Roadmap gates progression
      Agent amplifies learning within the current module
      It does not skip modules — the roadmap is the spine, the AI adjusts density
```

### Concept taxonomy (tracked per exercise)

| Domain | Concepts |
|---|---|
| Python | `python:types` `python:functions` `python:async` `python:oop` |
| HTTP | `http:methods` `http:status-codes` `http:headers` `http:rest` |
| SQL | `sql:select` `sql:joins` `sql:aggregations` `sql:transactions` |
| FastAPI | `fastapi:routing` `fastapi:pydantic` `fastapi:auth` `fastapi:middleware` |
| Architecture | `arch:separation-of-concerns` `arch:error-handling` `arch:naming` |

<details>
<summary><strong>Signal quality thresholds (ADR-019)</strong></summary>

<br>

The agent discards noisy signals before making decisions. Multiple weak signals converging are worth more than one strong isolated signal.

| Signal | Valid if | Discarded if |
|---|---|---|
| `time_on_line` | 5s – 300s per line | < 5s (accidental scroll) or > 300s (user left) |
| `time_spent` | 60s – 7200s per session | < 60s (quick test) or > 7200s (abandoned) |
| `cursor_heatmap` | ≥ 3 distinct lines visited | < 3 lines (editor barely used) |
| `chat_messages` | ≥ 10 characters | Test messages, isolated "?" |
| Concept pass rate | ≥ 5 submissions on concept | < 5 submissions (insufficient sample) |

</details>

---

## Local development

Requirements: Node 20+.

### Worker + D1

Two environments, both defined in `wrangler.toml`:

| | Production (default) | Development (`--env dev`) |
|---|---|---|
| Worker | `devgrind-worker` | `devgrind-worker-dev` |
| D1 | `study-platform` (legacy name of this project) | `grind-dev` |
| R2 | `devgrind-books` | `devgrind-books-dev` |

```bash
cd platform/worker
npm install
cp .dev.vars.example .dev.vars          # JWT_SECRET, ENV, Google OAuth

# fully local — D1/R2 simulated in .wrangler/state/ (gitignored, delete to reset)
./node_modules/.bin/wrangler d1 migrations apply grind-dev --local
npm run dev

# or against the real dev resources on Cloudflare
./node_modules/.bin/wrangler dev --env dev --remote
```

Schema changes go through `npm run db:generate` (Drizzle), then `migrations apply` with
`--local`, `--env dev --remote`, and finally `--remote` for production.

Two gotchas worth knowing:

- Use `./node_modules/.bin/wrangler`, not `npx wrangler`. Outside `platform/worker` there is no
  `package.json`, so `npx` tries to download wrangler and blocks on an install prompt.
- `wrangler dev` in **local** mode needs the bundled workerd to support this project's
  `compatibility_date` (2026-06-15), which requires wrangler ≥ 4.114 — and that in turn requires
  **Node 22+**. On Node 20, use `--remote`, where the runtime is Cloudflare's own.

### Frontend

```bash
cd platform/frontend
npm install
npm run dev                             # http://localhost:5173
```

Vite proxies `/api` to the Worker on `http://localhost:8787`; override with
`VITE_PROXY_TARGET`.

Login without Google OAuth: `POST /auth/dev` (blocked when `ENV=production`) — the login
screen exposes it as "Entrar em modo dev".

---

## Deployment

| | Backend | Frontend |
|---|---|---|
| **Platform** | Cloudflare Workers | Cloudflare Pages |
| **Source** | `platform/worker/` | `platform/frontend/` |
| **Deploy** | `wrangler deploy` | `wrangler pages deploy dist` |
| **Database** | D1 — `devgrind` | — |

Worker secrets in production: `wrangler secret put JWT_SECRET` (and `GOOGLE_CLIENT_ID`,
`ALLOWED_EMAILS`).

---

## Roadmap

| Phase | Description | Status |
|---|---|---|
| 0–3 | Architecture, backend MVP, frontend MVP, adaptive agent engine | ✅ Done |
| 4 | Dashboard upgrade: continue card, kata modes, AI insight slot, chat widget | 🔲 Pending |
| 5 | Books section: MD reader + PDF upload + dark mode + reading progress | ✅ Done |
| 6 | Courses track: structured curriculum → modules → lessons referencing book chapters | 🔲 Pending |
| 7 | Roadmap-driven agent: operates within current module, curated default exercises per module | 🔲 Pending |
| 8 | Cursor heatmap: Monaco tracks time-on-line as difficulty signal | 🔲 Pending |
| 9 | Domain map on profile + multi-language (JS native, SQL WASM) | 🔲 Pending |
| 10 | Grind Store: cosmetics, Grind Coins, animated backgrounds, badges | 🟡 Partial |

---

## Project structure

```
dev-grind/
├── vault-obsidian/             # STATE.md · TASKS.md · DECISIONS.md
├── agent/
│   ├── daily_prompt.md         # full prompt Claude Code /schedule executes
│   ├── exercise_schema.md      # JSON schema for generated exercises
│   ├── codewars_sync.py        # reads public profile via CodeWars API
│   └── last_insight.json       # written by agent, shown in dashboard
└── platform/
    ├── worker/                 # Cloudflare Worker (active backend)
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── lib/            # progress.ts · rank.ts
    │   │   └── routes/         # submissions · courses · profile · store · progress · users
    │   ├── drizzle/            # D1 migrations
    │   └── wrangler.toml
    └── frontend/               # React 18 + Vite + TypeScript → Cloudflare Pages
        └── src/
            ├── pages/          # Dashboard · Exercise · Profile · Books · Store
            ├── components/     # Sidebar · AppLayout · StarfieldBg
            └── hooks/          # usePyodide · useCosmetics
```

---

## Principles

- **Minimum that works** — no abstractions for hypothetical futures
- **One file per responsibility** — router, service, model separated
- **State never in memory** — everything in the database
- **No algorithm puzzles** — every exercise is a real backend scenario
- **No real-time AI grading** — Pyodide validates objectively; AI runs in batch cycles
- **No API key in the backend** — the daily agent runs via Claude Code `/schedule`

---

<div align="center">
<sub>Built by João Gabriel · Powered by Claude Code · Deployed on Cloudflare</sub>
</div>
