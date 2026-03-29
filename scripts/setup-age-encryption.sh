#!/usr/bin/env bash
# Setup age encryption for docs/rkstack/ — opt-in per project.
#
# After running this:
# - Files in docs/rkstack/ are plaintext locally
# - Files are encrypted when committed to git
# - Collaborators need the age key to decrypt (share out of band)
# - Clone without the key = encrypted blobs (fine for public repos)
#
# Usage: just setup-age   (or: bash scripts/setup-age-encryption.sh)
#
# Requirements: age (https://github.com/FiloSottile/age)

set -euo pipefail

KEY_DIR="${AGE_KEY_DIR:-$HOME/.age}"
KEY_FILE="$KEY_DIR/key.txt"
RECIPIENTS_FILE="age-recipients.txt"
DOCS_DIR="docs/rkstack"

# ── Check age is installed ──────────────────────────────────────────
if ! command -v age &>/dev/null; then
  echo "age not found. Install it:"
  echo "  brew install age          # macOS"
  echo "  apt install age           # Debian/Ubuntu"
  echo "  pacman -S age             # Arch"
  echo "  nix-env -i age            # Nix"
  exit 1
fi

# ── Generate key if missing ─────────────────────────────────────────
if [ ! -f "$KEY_FILE" ]; then
  mkdir -p "$KEY_DIR"
  age-keygen -o "$KEY_FILE" 2>&1
  chmod 600 "$KEY_FILE"
  echo "Created age key at $KEY_FILE"
else
  echo "Using existing age key at $KEY_FILE"
fi

# Extract public key
PUBLIC_KEY=$(grep '^# public key:' "$KEY_FILE" | sed 's/^# public key: //')
if [ -z "$PUBLIC_KEY" ]; then
  echo "ERROR: Could not extract public key from $KEY_FILE"
  exit 1
fi

# ── Create recipients file ──────────────────────────────────────────
if [ -f "$RECIPIENTS_FILE" ]; then
  if grep -q "$PUBLIC_KEY" "$RECIPIENTS_FILE"; then
    echo "Your public key is already in $RECIPIENTS_FILE"
  else
    echo "$PUBLIC_KEY" >> "$RECIPIENTS_FILE"
    echo "Added your public key to $RECIPIENTS_FILE"
  fi
else
  echo "# age recipients — one public key per line" > "$RECIPIENTS_FILE"
  echo "# Share this file in git. Share the private key out of band." >> "$RECIPIENTS_FILE"
  echo "$PUBLIC_KEY" >> "$RECIPIENTS_FILE"
  echo "Created $RECIPIENTS_FILE with your public key"
fi

# ── Configure .gitattributes ────────────────────────────────────────
ATTR_LINE="$DOCS_DIR/**/*.md filter=age diff=age"
GITATTRIBUTES=".gitattributes"

if [ -f "$GITATTRIBUTES" ] && grep -qF "$ATTR_LINE" "$GITATTRIBUTES"; then
  echo ".gitattributes already configured"
else
  echo "$ATTR_LINE" >> "$GITATTRIBUTES"
  echo "Added age filter to $GITATTRIBUTES for $DOCS_DIR/"
fi

# ── Configure git filters ──────────────────────────────────────────
git config filter.age.required true
git config filter.age.clean "age -R $RECIPIENTS_FILE -e -a"
git config filter.age.smudge "age -d -i $KEY_FILE"
git config diff.age.textconv "bash scripts/age-textconv.sh"

echo ""
echo "Done. Age encryption is configured for $DOCS_DIR/"
echo ""
echo "How it works:"
echo "  - Write plaintext to $DOCS_DIR/ as normal"
echo "  - git add/commit encrypts automatically (clean filter)"
echo "  - git checkout decrypts automatically (smudge filter)"
echo "  - GitHub shows encrypted blobs — nobody can read without the key"
echo ""
echo "To add a collaborator:"
echo "  1. They run: age-keygen -o ~/.age/key.txt"
echo "  2. They send you their public key (age1...)"
echo "  3. You add it to $RECIPIENTS_FILE and commit"
echo "  4. Re-encrypt existing files: git rm --cached $DOCS_DIR/ && git add $DOCS_DIR/"
echo ""
echo "Key location: $KEY_FILE"
echo "Recipients:   $RECIPIENTS_FILE"
