#!/usr/bin/env bash
# guard-terraform.sh — block direct tofu/terraform commands
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

FIRST_LINE=$(echo "$COMMAND" | head -1)

if echo "$FIRST_LINE" | grep -qE '^\s*(tofu|terraform)\s'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"[guard] Direct tofu/terraform command detected. Use your project wrapper to ensure secrets and backend are configured correctly."}}'
  exit 0
fi

exit 0
