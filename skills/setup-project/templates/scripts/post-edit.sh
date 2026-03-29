#!/usr/bin/env bash
# post-edit.sh — PostToolUse hook: run linters after file edits
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

# Terraform fmt
if [[ "$file_path" =~ \.tf$ ]]; then
  if command -v tofu &>/dev/null; then
    tofu fmt "$file_path" 2>/dev/null || true
  elif command -v terraform &>/dev/null; then
    terraform fmt "$file_path" 2>/dev/null || true
  fi
fi

# Shellcheck
if [[ "$file_path" =~ \.sh$ ]]; then
  if command -v shellcheck &>/dev/null; then
    shellcheck "$file_path" 2>/dev/null || true
  fi
fi

# YAML lint (ansible)
if [[ "$file_path" == *"/ansible/"* ]] && [[ "$file_path" =~ \.(yml|yaml)$ ]]; then
  if command -v yamllint &>/dev/null; then
    yamllint "$file_path" 2>/dev/null || true
  fi
fi
