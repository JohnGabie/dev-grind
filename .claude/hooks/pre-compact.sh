#!/usr/bin/env bash
# PreCompact hook. Enforces the "context diary before compaction" rule (CLAUDE.md, Context diary).
# manual /compact: blocks (exit 2) until the newest diary (<30 min) has no TODO-CONTEXT markers left.
# auto compaction: never blocks (could stall the session); ensures a skeleton with automatic facts exists.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}" || exit 0
input="$(cat || true)"
trigger=manual
printf '%s' "$input" | grep -Eq '"(trigger|compaction_type)"[[:space:]]*:[[:space:]]*"auto"' && trigger=auto
latest="$(ls -1t .journal/*.md 2>/dev/null | head -1 || true)"
fresh=0
if [ -n "$latest" ]; then
  age=$(( $(date +%s) - $(stat -c %Y "$latest") ))
  [ "$age" -lt 1800 ] && fresh=1
fi
if [ "$fresh" -eq 0 ]; then latest="$(bash scripts/dev/journal-skeleton.sh "pre-compact-$trigger")"; fi
if grep -q '<!-- TODO-CONTEXT -->' "$latest" 2>/dev/null; then
  if [ "$trigger" = "manual" ]; then
    echo "Context diary incomplete: $latest still has '<!-- TODO-CONTEXT -->' markers. Ask the agent to fill every section (and remove the markers), then run /compact again." >&2
    exit 2
  fi
  echo "Auto-compaction proceeding; diary skeleton at $latest has only automatic facts." >&2
fi
exit 0
