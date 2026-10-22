# Model tiers (the only place with model names)

Roles and briefs speak in TIERS. Change the mapping here without touching any other file.
One exception: Claude Code agent files in `.claude/agents/` need a `model:` alias in their frontmatter. They must
match this table; when the mapping changes, update them too.

| Tier | Capability | Use for | Current mapping |
|---|---|---|---|
| STRONG | Highest reasoning | Architect, Reviewer, ambiguous decisions, architecture, auth, data, migrations, anything without precedent in the project | Opus |
| MEDIUM | Good quality, balanced cost and speed | QA, clear-scope logic across several files | Sonnet |
| FAST | Cheap and quick | Mechanical, fully specified tasks (renames, copy, boilerplate, simple tests) | Haiku |

Escalation: an executor that fails the same task twice moves up one tier. Architect and Reviewer always stay STRONG.
Review this mapping when new models ship.
