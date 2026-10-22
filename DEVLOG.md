# DEVLOG

Evidence journal. One entry per verified fact or surprise that the code and `git log` do not explain: date, versions that worked, how it was verified, gotchas (symptom -> cause -> fix). No secrets, no personal data, no absolute machine paths.

## 2026-10-21 — local D1 reads
- `npx wrangler d1 execute study-platform --local --command "SELECT ..."` from `platform/worker` reads the local D1 that `npm run dev` uses. Without `--local` it targets the production database.
