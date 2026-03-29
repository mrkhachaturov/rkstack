#!/usr/bin/env bash
# guard-kubernetes.sh — warn on kubectl delete
set -euo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)

if [ -z "$CMD" ]; then
  echo '{}'
  exit 0
fi

if printf '%s' "$CMD" | grep -qE 'kubectl\s+delete' 2>/dev/null; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"[guard] kubectl delete removes Kubernetes resources. Verify the target namespace and resource."}}'
  exit 0
fi

exit 0
