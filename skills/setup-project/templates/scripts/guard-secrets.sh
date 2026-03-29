#!/usr/bin/env bash
# guard-secrets.sh — block dangerous writes to secret files
set -euo pipefail

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE" ]]; then
  exit 0
fi

if [[ "$TOOL" == "Write" ]] && { [[ "$FILE" == *"/.env"* ]] || [[ "$FILE" == *"/secrets/"* ]]; }; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"[guard] Full overwrite of secrets file. Use Edit instead of Write to avoid losing existing values."}}'
  exit 0
fi

exit 0
