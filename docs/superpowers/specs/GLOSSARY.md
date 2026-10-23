# Acceptance vocabulary (spec scenarios)

Acceptance scenarios are Gherkin (Given/When/Then) in English, inside each spec. UI text the user sees is quoted exactly as shown (Portuguese included). Reuse the steps below; add a step here before using a new shape, so any agent (and João) can read and extend them.

## Tags
| Tag | Meaning |
|---|---|
| `@decided` | João approved it. Failing = bug. Untagged scenarios in an approved spec count as decided. |
| `@proposed` | Architect's proposal; needs João's OK before it is a requirement. |
| `@open` | Left undefined on purpose; the scenario documents the safe default. |

An executor never edits a scenario to make it pass. Changes go through the Architect and, for `@proposed`/`@open`, João.

## Given
- `I am logged in` · `I am not logged in`
- `there is a course "<name>" with <N> lessons and <M> completed`
- `"<course>" has <N> lessons and the first <M> are completed`
- `there is an exercise "<title>" on concept "<concept>"` (concepts from `CLAUDE.md`)
- `I have <N> submissions on "<concept>" with <P>% passed`
- `the screen is <W> px wide` (phone: 390)
- `the Worker returns <status> for <route>` (error states)

## When
- `I open "<path>"` · `I reload the page` · `I press the on-screen back button`
- `I press "<button text>"` · `I press "<button text>" on "<item>"`
- `I type "<text>" into <field>` · `I run the code`

## Then (observable in the browser, the HTTP response or D1; never internals)
- `I see <thing>` · `I do not see <thing>`
- `"<item>" shows <label> "<value>"`
- `the address is "<path>"`
- `the order is "<a>", "<b>", ...`
- `D1 has <row description>` (read with a local `SELECT`, see `docs/roles/qa.md`)

## Decision tables
When a behavior depends on several dimensions (state × input × screen size …), the spec lists the dimensions and their values, then rules in order (first match wins). Combinations no rule covers are written down as `@open` with the safe default, so the cases nobody foresaw show up before code.
