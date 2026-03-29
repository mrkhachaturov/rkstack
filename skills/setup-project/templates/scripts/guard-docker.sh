#!/usr/bin/env bash
# guard-docker.sh — warn on destructive Docker operations
set -euo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)

if [ -z "$CMD" ]; then
  echo '{}'
  exit 0
fi

if printf '%s' "$CMD" | grep -qE 'docker\s+(rm\s+-f|system\s+prune|volume\s+rm|network\s+rm)' 2>/dev/null; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"[guard] Destructive Docker command. This may remove running containers, volumes, or networks."}}'
  exit 0
fi

exit 0
