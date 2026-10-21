# Natural-language acceptance tests (Gherkin + Playwright)

**Status:** written, awaiting João's approval. Nothing installed yet.

## The request (João's words)

"add no projeto frame work de test em linguagem natural e escreve junto da specs o teste"

Answers on 2026-10-21: runner is **Gherkin + Playwright**; scenarios in **English**.

## Reading of it

Each feature spec gets a `.feature` file next to it, written in Given/When/Then, that a command can run in a real browser. The scenarios are the spec's acceptance section made executable. Today the project only has unit and contract tests (`node --test` in the frontend, Vitest in the worker); no browser test exists, and the "go through empty, error and with-data states" finish rule is done by hand.

## Proposals (undecided until approved)

1. **Tool.** `@playwright/test` plus `playwright-bdd` as **frontend devDependencies**. Chromium is downloaded once with `npx playwright install chromium` (about 150 MB, outside the repo).
2. **Where the tests live.** The `.feature` file sits **beside its spec** with the same base name: `docs/superpowers/specs/2026-10-21-courses-home.md` and `2026-10-21-courses-home.feature`. Step definitions live in `platform/frontend/e2e/steps/` and are shared across features. `playwright.config.ts` points `playwright-bdd` at `../../docs/superpowers/specs/*.feature`.
3. **Servers.** `playwright.config.ts` uses `webServer` for the worker (8787) and the frontend (5173) with `reuseExistingServer: true`, so a running dev session is reused and nothing is left running afterwards.
4. **Data.** Scenarios are deterministic: `Given` steps set up fixtures by intercepting `/api/...` responses with `page.route`, so results do not depend on what is in the local D1. Login uses the real `POST /auth/dev`. A scenario tagged `@live` may hit the real local worker and is excluded from the default run.
5. **Viewports by tag.** `@mobile` runs at 390x844 and `@desktop` at 1280x800. Untagged scenarios run on both.
6. **Command.** `npm run test:e2e` in `platform/frontend`. It is **not** part of `npm test`, because it needs a browser. The finish rule (CLAUDE.md, "When finishing a task") would gain one line: for a touched screen, run the feature file of its spec. This CLAUDE.md edit is part of this proposal and needs approval.
7. **Convention.** A new spec's acceptance section is written as a `.feature` in the same commit as the spec. A fixed bug adds a scenario that fails before the fix. Pure logic keeps using `node --test`.
8. **Steps vocabulary.** A small fixed set of steps, kept in English and reused, for example `Given I am logged in`, `Given the courses API returns ...`, `When I open "/courses"`, `Then I see ...`. New steps are added only when a scenario needs them.

## First feature

`2026-10-21-courses-home.feature` is written with this spec, from the acceptance section of `2026-10-21-courses-home.md`. It is a draft: it cannot run until the framework and the Courses home are built, and it changes if that spec changes.

## Out of scope

Running in CI, visual screenshot comparison, accessibility audits, tests for the worker API (Vitest keeps those), converting the existing unit tests, and back-filling `.feature` files for older specs.

## Acceptance

`npm run test:e2e` in `platform/frontend` starts or reuses both servers, runs every non-`@live` scenario in Chromium, and reports pass or fail per scenario; an intentionally broken assertion fails that scenario and the exit code is non-zero; the existing `npm test`, `npx tsc -b` and `npm run build` stay green; no file outside `platform/frontend`, `docs/superpowers/specs` and `CLAUDE.md` changes.
