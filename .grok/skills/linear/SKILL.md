---
name: linear
description: Use when the user runs /linear or asks to organize, list, create, update, or comment on the Linear backlog (issues, status, priority, teams, projects, LINEAR_API_KEY). The bundled script is the only reader of the API key.
---

# Linear backlog

Run this from the repository root. `python` on this machine is the Microsoft Store stub; use `py -3`.

```bash
py -3 .grok/skills/linear/scripts/linear.py <command>
```

The script loads `LINEAR_API_KEY` from the process environment, then the Windows user environment, then a `.env` file walked up from the working directory. It never prints the key.

Do not read, echo, or log `LINEAR_API_KEY`. Do not open `.env`. Do not pass the key as an argument or header. Do not call `https://api.linear.app` yourself. If the user pastes a key, do not repeat it; tell them to store it in the environment.

`auth` reports whether a key is available. If it exits with "LINEAR_API_KEY is not set", stop and say so. Do not ask for the key in chat.

## Commands

| Need | Command |
|---|---|
| Key present? | `auth` |
| Which account | `whoami` |
| Teams | `teams` |
| Status names | `states --team TEAM` |
| Projects | `projects` |
| Labels | `labels` |
| Backlog | `issues --project DevGrind --state-type backlog` |
| One issue | `issue DEV-12` |
| Create | `create --team TEAM --title "..."` |
| Move / edit | `update DEV-12 --state "In Progress"` |
| Comment | `comment DEV-12 --body "..."` |

Run `<command> --help` for flags. Output is JSON. Tell the user the identifier, title, state, and url.

## Board

Team `DEV`. Project `DevGrind`. One `Area` label on every new issue: `platform`, `courses`, `practice`, or `agent`.

| Column | What belongs there |
|---|---|
| Backlog | Not now |
| Todo | The single next issue |
| In Progress | The issue being built |
| Done | Shipped |

Search `issues --query` before creating. The title is a concrete outcome. New issues start in Backlog with `--project DevGrind`, one `--label`, and a priority. Move an issue to Todo only when Todo is empty. Do not add a project, label, or status for one task.

Priority labels: `urgent`, `high`, `medium`, `low`, `none`. Assignee: `me`, `none`, or an email.

## Before writing

1. `teams` when the team key is unknown.
2. `states --team KEY` before `--state`. Status names belong to a team. `--state-type` is the bucket: `triage`, `backlog`, `unstarted`, `started`, `completed`, `canceled`.
3. Run the mutation, then report the returned issue.

## Examples

```bash
py -3 .grok/skills/linear/scripts/linear.py issues --team DEV --state-type backlog
py -3 .grok/skills/linear/scripts/linear.py create --team DEV --title "Retry failed webhook" --priority high
py -3 .grok/skills/linear/scripts/linear.py update DEV-12 --state "In Progress" --assignee me
```

## Red flags

| Thought | Action |
|---|---|
| Echo the variable to see if it is set | Run `auth` |
| curl is faster | Use the script |
| The key was pasted in chat | Do not repeat it or put it on a command line |
