"""Linear backlog CLI. Loads LINEAR_API_KEY itself and never prints it."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://api.linear.app/graphql"
KEY_RE = re.compile(r"lin_api_[A-Za-z0-9]+")
PRIORITIES = {"none": 0, "urgent": 1, "high": 2, "medium": 3, "low": 4}
STATE_TYPES = {"triage", "backlog", "unstarted", "started", "completed", "canceled", "duplicate"}
MAX_TEXT = 100_000

_key = ""

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def redact(text: str) -> str:
    text = KEY_RE.sub("[redacted]", text)
    if _key:
        text = text.replace(_key, "[redacted]")
    return text


def die(message: str) -> None:
    print(redact(message), file=sys.stderr)
    raise SystemExit(1)


def emit(payload: object) -> None:
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def refuse_key_on_argv() -> None:
    for arg in sys.argv[1:]:
        if KEY_RE.search(arg) or "LINEAR_API_KEY" in arg:
            die("Refusing arguments that contain an API key.")


def _clean(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    return value.strip()


def _from_dotenv() -> str:
    seen: set[Path] = set()
    current = Path.cwd()
    for directory in [current, *current.parents]:
        path = directory / ".env"
        if path in seen:
            continue
        seen.add(path)
        if path.is_file():
            try:
                lines = path.read_text(encoding="utf-8-sig").splitlines()
            except OSError:
                lines = []
            for line in lines:
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                name, raw = stripped.split("=", 1)
                if name.strip() == "LINEAR_API_KEY":
                    return _clean(raw)
        if (directory / ".git").exists():
            break
    return ""


def _from_windows_registry() -> str:
    if sys.platform != "win32":
        return ""
    import winreg

    locations = (
        (winreg.HKEY_CURRENT_USER, r"Environment"),
        (winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment"),
    )
    for hive, subkey in locations:
        try:
            with winreg.OpenKey(hive, subkey) as key:
                value, _ = winreg.QueryValueEx(key, "LINEAR_API_KEY")
        except OSError:
            continue
        cleaned = _clean(str(value))
        if cleaned:
            return cleaned
    return ""


def load_key() -> str:
    global _key
    if _key:
        return _key
    found = _clean(os.environ.get("LINEAR_API_KEY", ""))
    source = "process"
    if not found:
        found = _from_windows_registry()
        source = "windows-env"
    if not found:
        found = _from_dotenv()
        source = "dotenv"
    if not found:
        die(
            "LINEAR_API_KEY is not set. Add it to the user environment or the repo .env. "
            "Do not paste the key into chat."
        )
    _key = found
    os.environ["LINEAR_API_KEY_SOURCE"] = source
    return _key


def key_source() -> str:
    load_key()
    return os.environ.get("LINEAR_API_KEY_SOURCE", "process")


def gql(query: str, variables: dict | None = None) -> dict:
    key = load_key()
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    request = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json", "Authorization": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        die(f"Linear HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        die(f"Linear request failed: {exc.reason}")
    if payload.get("errors"):
        die(json.dumps({"errors": payload["errors"]}, indent=2))
    return payload["data"]


def read_text(path: Path) -> str:
    if path.name.startswith(".env"):
        die(f"Refusing to read {path.name}.")
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        die(f"Could not read {path.name}: {exc.strerror}")
    if len(text) > MAX_TEXT:
        die(f"{path.name} is larger than {MAX_TEXT} characters.")
    if KEY_RE.search(text) or "LINEAR_API_KEY" in text:
        die("Refusing to send a file that contains an API key.")
    return text


def guard_text(text: str | None) -> str | None:
    if text and (KEY_RE.search(text) or "LINEAR_API_KEY" in text):
        die("Refusing to send text that contains an API key.")
    return text


ISSUE_FIELDS = """
  id
  identifier
  title
  url
  priorityLabel
  updatedAt
  state { name type }
  assignee { name }
  project { name }
  labels { nodes { name } }
  team { key }
"""


def fetch_teams() -> list[dict]:
    data = gql("query { teams { nodes { id key name } } }")
    return data["teams"]["nodes"]


def resolve_team(token: str) -> dict:
    rows = fetch_teams()
    wanted = token.lower()
    matches = [row for row in rows if row["id"] == token or row["key"].lower() == wanted or row["name"].lower() == wanted]
    if len(matches) == 1:
        return matches[0]
    known = ", ".join(f"{row['key']} ({row['name']})" for row in rows) or "none"
    die(f"Team {token!r} did not match one team. Known teams: {known}")
    return {}


def fetch_states(team_id: str | None = None) -> list[dict]:
    if team_id:
        data = gql(
            """
            query States($filter: WorkflowStateFilter) {
              workflowStates(filter: $filter) {
                nodes { id name type position }
              }
            }
            """,
            {"filter": {"team": {"id": {"eq": team_id}}}},
        )
    else:
        data = gql(
            """
            query {
              workflowStates {
                nodes { id name type position team { key } }
              }
            }
            """
        )
    return data["workflowStates"]["nodes"]


def resolve_state(team_id: str, name: str) -> dict:
    rows = fetch_states(team_id)
    matches = [row for row in rows if row["name"].lower() == name.lower()]
    if len(matches) == 1:
        return matches[0]
    shown = ", ".join(
        f"{row['name']} [{row['type']}]"
        for row in sorted(rows, key=lambda row: row.get("position") or 0)
    )
    die(f"State {name!r} did not match one status. States: {shown}")
    return {}


def fetch_projects() -> list[dict]:
    data = gql("query { projects(first: 50) { nodes { id name url } } }")
    return data["projects"]["nodes"]


def fetch_labels() -> list[dict]:
    data = gql(
        """
        query {
          issueLabels(first: 50) {
            nodes { id name parent { name } }
          }
        }
        """
    )
    return data["issueLabels"]["nodes"]


def resolve_label(name: str) -> dict:
    wanted = name.lower()
    rows = fetch_labels()
    matches = [row for row in rows if row["name"].lower() == wanted]
    if len(matches) == 1:
        return matches[0]
    known = ", ".join(row["name"] for row in rows) or "none"
    die(f"Label {name!r} did not match one label. Known labels: {known}")
    return {}


def cmd_labels(_: argparse.Namespace) -> None:
    emit(fetch_labels())


def cmd_label_create(args: argparse.Namespace) -> None:
    payload: dict = {"name": guard_text(args.name)}
    if args.color:
        payload["color"] = args.color
    if args.team:
        payload["teamId"] = resolve_team(args.team)["id"]
    if args.group:
        payload["isGroup"] = True
        payload["groupType"] = "singleSelect"
    if args.parent:
        payload["parentId"] = resolve_label(args.parent)["id"]
    data = gql(
        """
        mutation Label($input: IssueLabelCreateInput!) {
          issueLabelCreate(input: $input) {
            success
            issueLabel { id name }
          }
        }
        """,
        {"input": payload},
    )
    emit(data["issueLabelCreate"])


def cmd_project_create(args: argparse.Namespace) -> None:
    payload = {
        "name": guard_text(args.name),
        "teamIds": [resolve_team(args.team)["id"]],
        "leadId": gql("query { viewer { id } }")["viewer"]["id"],
    }
    if args.description:
        payload["description"] = guard_text(args.description)
    data = gql(
        """
        mutation Project($input: ProjectCreateInput!) {
          projectCreate(input: $input) {
            success
            project { id name url }
          }
        }
        """,
        {"input": payload},
    )
    emit(data["projectCreate"])


def resolve_project(token: str) -> dict:
    rows = fetch_projects()
    wanted = token.lower()
    matches = [row for row in rows if row["id"] == token or row["name"].lower() == wanted]
    if len(matches) == 1:
        return matches[0]
    known = ", ".join(row["name"] for row in rows) or "none"
    die(f"Project {token!r} did not match one project. Known projects: {known}")
    return {}


def resolve_user(token: str) -> dict:
    if token.lower() == "me":
        return gql("query { viewer { id name } }")["viewer"]
    data = gql(
        """
        query User($filter: UserFilter) {
          users(filter: $filter, first: 5) { nodes { id name email } }
        }
        """,
        {"filter": {"email": {"eq": token}}},
    )
    rows = data["users"]["nodes"]
    if len(rows) == 1:
        return rows[0]
    die(f"No single user matched {token!r}. Use 'me' or an email.")
    return {}


def priority_value(label: str) -> int:
    try:
        return PRIORITIES[label.lower()]
    except KeyError:
        die(f"Priority must be one of: {', '.join(PRIORITIES)}")
        return 0


def description_from(args: argparse.Namespace) -> str | None:
    if args.description and args.description_file:
        die("Pass --description or --description-file, not both.")
    if args.description_file:
        return guard_text(read_text(Path(args.description_file)))
    return guard_text(args.description)


def cmd_auth(_: argparse.Namespace) -> None:
    emit({"ok": True, "source": key_source()})


def cmd_whoami(_: argparse.Namespace) -> None:
    emit(gql("query { viewer { id name email } }")["viewer"])


def cmd_teams(_: argparse.Namespace) -> None:
    emit(fetch_teams())


def cmd_states(args: argparse.Namespace) -> None:
    team_id = resolve_team(args.team)["id"] if args.team else None
    rows = fetch_states(team_id)
    rows.sort(key=lambda row: ((row.get("team") or {}).get("key", ""), row.get("position") or 0))
    emit(rows)


def cmd_projects(_: argparse.Namespace) -> None:
    emit(fetch_projects())


def cmd_issues(args: argparse.Namespace) -> None:
    if args.mine and args.assignee:
        die("Pass --mine or --assignee, not both.")
    issue_filter: dict = {}
    if args.team:
        issue_filter["team"] = {"id": {"eq": resolve_team(args.team)["id"]}}
    if args.state or args.state_type:
        state_filter: dict = {}
        if args.state_type:
            state_type = "canceled" if args.state_type == "cancelled" else args.state_type
            if state_type not in STATE_TYPES:
                die(f"State type must be one of: {', '.join(sorted(STATE_TYPES))}")
            state_filter["type"] = {"eq": state_type}
        if args.state:
            state_filter["name"] = {"eq": args.state}
        issue_filter["state"] = state_filter
    if args.project:
        issue_filter["project"] = {"id": {"eq": resolve_project(args.project)["id"]}}
    if args.mine or (args.assignee and args.assignee.lower() == "me"):
        issue_filter["assignee"] = {"isMe": {"eq": True}}
    elif args.assignee:
        issue_filter["assignee"] = {"id": {"eq": resolve_user(args.assignee)["id"]}}
    if args.query:
        guard_text(args.query)
        issue_filter["title"] = {"containsIgnoreCase": args.query}
    data = gql(
        f"""
        query Issues($first: Int!, $filter: IssueFilter) {{
          issues(first: $first, filter: $filter, orderBy: updatedAt) {{
            nodes {{ {ISSUE_FIELDS} }}
          }}
        }}
        """,
        {"first": args.limit, "filter": issue_filter},
    )
    emit(data["issues"]["nodes"])


def cmd_issue(args: argparse.Namespace) -> None:
    data = gql(
        f"""
        query Issue($id: String!) {{
          issue(id: $id) {{ {ISSUE_FIELDS} description }}
        }}
        """,
        {"id": args.identifier},
    )
    if not data["issue"]:
        die(f"Issue {args.identifier} was not found.")
    emit(data["issue"])


def build_input(args: argparse.Namespace, team_id: str | None) -> dict:
    payload: dict = {}
    if team_id:
        payload["teamId"] = team_id
    if getattr(args, "title", None):
        payload["title"] = guard_text(args.title)
    description = description_from(args)
    if description is not None:
        payload["description"] = description
    if args.priority:
        payload["priority"] = priority_value(args.priority)
    if args.state:
        if not team_id and not getattr(args, "identifier", None):
            die("A team is required to resolve a state name.")
        owner = team_id or team_of(args.identifier)
        payload["stateId"] = resolve_state(owner, args.state)["id"]
    if args.project:
        payload["projectId"] = resolve_project(args.project)["id"]
    if args.assignee:
        payload["assigneeId"] = None if args.assignee.lower() == "none" else resolve_user(args.assignee)["id"]
    if args.parent:
        payload["parentId"] = args.parent
    if getattr(args, "labels", None):
        payload["labelIds"] = [resolve_label(name)["id"] for name in args.labels]
    return payload


def team_of(identifier: str) -> str:
    data = gql(
        "query IssueTeam($id: String!) { issue(id: $id) { team { id } } }",
        {"id": identifier},
    )
    if not data["issue"]:
        die(f"Issue {identifier} was not found.")
    return data["issue"]["team"]["id"]


def cmd_create(args: argparse.Namespace) -> None:
    payload = build_input(args, resolve_team(args.team)["id"])
    if not payload.get("title"):
        die("--title is required.")
    data = gql(
        f"""
        mutation Create($input: IssueCreateInput!) {{
          issueCreate(input: $input) {{
            success
            issue {{ {ISSUE_FIELDS} }}
          }}
        }}
        """,
        {"input": payload},
    )
    emit(data["issueCreate"])


def cmd_update(args: argparse.Namespace) -> None:
    payload = build_input(args, None)
    if not payload:
        die("Pass at least one field to update.")
    data = gql(
        f"""
        mutation Update($id: String!, $input: IssueUpdateInput!) {{
          issueUpdate(id: $id, input: $input) {{
            success
            issue {{ {ISSUE_FIELDS} }}
          }}
        }}
        """,
        {"id": args.identifier, "input": payload},
    )
    emit(data["issueUpdate"])


def cmd_comment(args: argparse.Namespace) -> None:
    if args.body and args.body_file:
        die("Pass --body or --body-file, not both.")
    body = read_text(Path(args.body_file)) if args.body_file else args.body
    body = guard_text(body)
    if not body:
        die("--body is required.")
    data = gql(
        """
        mutation Comment($input: CommentCreateInput!) {
          commentCreate(input: $input) { success comment { id } }
        }
        """,
        {"input": {"issueId": args.identifier, "body": body}},
    )
    emit(data["commentCreate"])


def add_fields(parser: argparse.ArgumentParser, with_title: bool) -> None:
    if with_title:
        parser.add_argument("--title")
    parser.add_argument("--description")
    parser.add_argument("--description-file")
    parser.add_argument("--priority", choices=sorted(PRIORITIES))
    parser.add_argument("--state", help="Status name on that team, such as Backlog or In Progress")
    parser.add_argument("--project", help="Project name")
    parser.add_argument("--assignee", help="me, none, or an email")
    parser.add_argument("--parent", help="Parent issue identifier, such as DEV-12")
    parser.add_argument("--label", action="append", dest="labels", help="Label name. One Area label per issue.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="linear",
        description="Linear backlog commands. Reads LINEAR_API_KEY and never prints it.",
    )
    commands = parser.add_subparsers(dest="cmd", required=True)

    commands.add_parser("auth", help="Report whether the key is available, without printing it").set_defaults(func=cmd_auth)
    commands.add_parser("whoami", help="Show the Linear user for this key").set_defaults(func=cmd_whoami)
    commands.add_parser("teams", help="List teams").set_defaults(func=cmd_teams)

    states = commands.add_parser("states", help="List workflow states")
    states.add_argument("--team", help="Team key or name")
    states.set_defaults(func=cmd_states)

    commands.add_parser("projects", help="List projects").set_defaults(func=cmd_projects)
    commands.add_parser("labels", help="List labels").set_defaults(func=cmd_labels)

    project_create = commands.add_parser("project-create", help="Create a project on a team")
    project_create.add_argument("--name", required=True)
    project_create.add_argument("--team", required=True)
    project_create.add_argument("--description")
    project_create.set_defaults(func=cmd_project_create)

    label_create = commands.add_parser("label-create", help="Create a team label")
    label_create.add_argument("--name", required=True)
    label_create.add_argument("--team", required=True)
    label_create.add_argument("--color")
    label_create.add_argument("--parent", help="Parent label group name")
    label_create.add_argument("--group", action="store_true", help="Create a single-select label group")
    label_create.set_defaults(func=cmd_label_create)

    issues = commands.add_parser("issues", help="List issues")
    issues.add_argument("--team")
    issues.add_argument("--state", help="Status name")
    issues.add_argument("--state-type", choices=sorted(STATE_TYPES | {"cancelled"}))
    issues.add_argument("--project")
    issues.add_argument("--mine", action="store_true")
    issues.add_argument("--assignee", help="me or an email")
    issues.add_argument("--query", help="Match title")
    issues.add_argument("--limit", type=int, default=25)
    issues.set_defaults(func=cmd_issues)

    issue = commands.add_parser("issue", help="Show one issue")
    issue.add_argument("identifier")
    issue.set_defaults(func=cmd_issue)

    create = commands.add_parser("create", help="Create an issue")
    create.add_argument("--team", required=True)
    add_fields(create, with_title=True)
    create.set_defaults(func=cmd_create)

    update = commands.add_parser("update", help="Update an issue")
    update.add_argument("identifier")
    add_fields(update, with_title=True)
    update.set_defaults(func=cmd_update)

    comment = commands.add_parser("comment", help="Comment on an issue")
    comment.add_argument("identifier")
    comment.add_argument("--body")
    comment.add_argument("--body-file")
    comment.set_defaults(func=cmd_comment)
    return parser


def main() -> None:
    refuse_key_on_argv()
    args = build_parser().parse_args()
    if getattr(args, "limit", None) is not None and not 1 <= args.limit <= 50:
        die("--limit must be between 1 and 50.")
    args.func(args)


if __name__ == "__main__":
    main()
