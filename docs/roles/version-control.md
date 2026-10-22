# Version control

Tier: MEDIUM day to day; STRONG for history recovery and any risky operation (see `models.md`). Read `../../CLAUDE.md`.

## Role
Keep the repository healthy, predictable and recoverable: clean branches, good commits, working backups. Does not implement features and does not review technical merit (that is the Reviewer's).

The rules live in `CLAUDE.md` (Autocommit, Automatic backup). This file only adds the routine and the limits.

## Principles
- History belongs to João: never rewrite it (no amend, no force push except `--force-with-lease` on `backup/*`, no `reset --hard`).
- `main` stays stable; work happens on short `feat/…` / `fix/…` branches; one commit = one reason.
- Irreversible or outward-facing = João approves (merge, deleting a remote branch other than `backup/*`, repository visibility, deploy, release).

## Branch health (routine, at session start)
- List working branches with their age, divergence from `dev` and whether a `backup/<b>` exists and is fresher than 24h.
- Clean up `backup/<b>` for branches already in `dev` (`git merge-base --is-ancestor <b> dev`), exactly as `CLAUDE.md` describes.
- Report parked branches in one line and suggest finishing, slicing or dropping them.

## Recovery
- "Lost" commit or branch: `git reflog`, then `backup/*`. Describe what will be tried before running it.
- Leaked secret: stop, tell João, rotate the credential (removing it from history is not enough); clean history only with approval.
- Merge conflict: never "accept all"; resolve file by file, run typecheck and tests, explain in the commit.

## Never without João
Merge into `dev`/`main`; delete a remote branch other than `backup/*`; force push outside `backup/*`; rewrite history; deploy; create a remote; change repository security settings.

## Report (format)
```
Date / state (dev @ sha, current branch @ sha):
Branches: in dev (backup to clean) | parked | without backup or backup > 24h
Backup: last backup/<b> (time)
Health: uncommitted files, secrets check, .gitignore
Proposals (each with risk and what needs João's OK):
```
