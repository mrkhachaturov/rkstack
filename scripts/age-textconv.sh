#!/usr/bin/env bash
# Smart textconv for age-encrypted files.
# If the content is encrypted, decrypt it. If already plaintext, pass through.
# Used by: git diff, git log -p (via diff.age.textconv config)
if head -1 "$1" | grep -q "^-----BEGIN AGE ENCRYPTED FILE-----"; then
  age -d -i "${AGE_KEY_DIR:-$HOME/.age}/key.txt" "$1"
else
  cat "$1"
fi
