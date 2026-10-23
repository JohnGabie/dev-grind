# Architecture Decision Records

Decisions that apply to more than one feature (stack, auth, data conventions, D1 schema rules, rules for the
product's AI, contracts shared across features). A decision that applies to one feature only stays in that
feature's MD in `docs/superpowers/specs/`. Rules: `CLAUDE.md`, "ADRs (transversal decisions)".

- File: `NNNN-<short-title>.md`, numbered in order, never renumbered.
- The Architect writes it as `Proposed`; João approves it (`Accepted`). After acceptance it is never edited:
  a change is a new ADR with `Supersedes: NNNN`, and the old one gets `Superseded by: NNNN`.

## Template
```markdown
# ADR-NNNN: <decision in a few words>

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD
- Supersedes: (none | NNNN)
- Features affected: <MDs in docs/superpowers/specs/>

## Context
What forces the decision; facts from the code, with paths.

## Decision
What we do, stated so it can be checked.

## Alternatives considered
Each with why it lost.

## Consequences
What gets easier, what gets harder, what must change.
```

## Index
| # | Title | Status |
|---|---|---|
| — | none yet | — |
