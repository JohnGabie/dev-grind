## Task
<!-- What it does and the spec path in docs/superpowers/specs/ -->

## What changed
<!-- Concise list of changes -->

## How it was verified
<!-- Commands run with exit codes, Acceptance scenarios passed in the browser -->

## NOT verified
<!-- Be explicit about what was not tested or checked -->

## Risks
<!-- Known risks, side effects, follow-ups (Linear issue ids) -->

## Checklist
- [ ] Worker: `npx tsc --noEmit` and `npm test` green
- [ ] Frontend (if touched): `npm run build` and `npm test` green
- [ ] Acceptance scenarios run by hand in the browser
- [ ] No invented APIs
- [ ] No secrets, personal data or absolute machine paths
- [ ] D1 changes have a Drizzle migration
- [ ] Anti-patterns in CLAUDE.md respected
- [ ] DEVLOG.md updated if a gotcha or verified fact came up
