#!/usr/bin/env bash
# guard-python.sh — warn on dangerous Python patterns in Bash
set -euo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)

if [ -z "$CMD" ]; then
  echo '{}'
  exit 0
fi

if printf '%s' "$CMD" | grep -qE 'python.*-c.*\beval\b|python.*-c.*\bexec\b' 2>/dev/null; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"[guard] Python eval/exec in command. Verify the code is safe before executing."}}'
  exit 0
fi

exit 0
