#!/usr/bin/env bash
# Verify docs/rkstack/ files are encrypted in git staging area.
#
# Logic:
#   - If age-recipients.txt does NOT exist → encryption not opted in, skip (exit 0)
#   - If age-recipients.txt exists → every .md in docs/rkstack/ must be age-encrypted
#
# Used as: pre-commit hook (installed by setup-age-encryption.sh)
#          CI check (optional extra safety)
#
# Exit codes: 0 = ok, 1 = plaintext found (blocked)

set -euo pipefail

RECIPIENTS_FILE="age-recipients.txt"
DOCS_DIR="docs/rkstack"
AGE_HEADER="-----BEGIN AGE ENCRYPTED FILE-----"

# ── Skip if encryption not opted in ────────────────────────────────
if [ ! -f "$RECIPIENTS_FILE" ]; then
  exit 0
fi

# ── Check staged .md files in docs/rkstack/ ────────────────────────
PLAINTEXT_FILES=()

# Get files staged for commit (or all tracked if run outside git hook)
if git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -q .; then
  # In pre-commit context: check only staged files
  FILES=$(git diff --cached --name-only --diff-filter=ACM | grep "^${DOCS_DIR}/.*\.md$" || true)
else
  # In CI/manual context: check all tracked files
  FILES=$(git ls-files "$DOCS_DIR" | grep '\.md$' || true)
fi

for file in $FILES; do
  # Read the staged content (what will actually be committed)
  CONTENT=$(git show ":${file}" 2>/dev/null || cat "$file" 2>/dev/null || true)
  if [ -z "$CONTENT" ]; then
    continue
  fi

  # Check if content starts with age header
  FIRST_LINE=$(echo "$CONTENT" | head -1)
  if [[ "$FIRST_LINE" != "$AGE_HEADER" ]]; then
    PLAINTEXT_FILES+=("$file")
  fi
done

# ── Report ─────────────────────────────────────────────────────────
if [ ${#PLAINTEXT_FILES[@]} -gt 0 ]; then
  echo "ERROR: Plaintext docs detected — encryption is required."
  echo ""
  echo "These files are NOT encrypted but age-recipients.txt exists:"
  for f in "${PLAINTEXT_FILES[@]}"; do
    echo "  $f"
  done
  echo ""
  echo "Fix: run 'just setup-age' to configure git encryption filters,"
  echo "then re-stage the files: git add ${DOCS_DIR}/"
  exit 1
fi
