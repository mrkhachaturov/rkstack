set shell := ["bash", "-euo", "pipefail", "-c"]
set working-directory := '..'

[doc("Show what's new in upstream submodules")]
check *ARGS:
  bun scripts/upstream-check.ts {{ ARGS }}

[doc("Bump all upstream submodules to latest and commit")]
bump-all:
  #!/usr/bin/env bash
  set -euo pipefail
  for REPO in .upstreams/*/; do
    NAME=$(basename "$REPO")
    just upstream::bump "$NAME"
  done

[doc("Advance a submodule pin to latest (e.g. just upstream::bump gstack)")]
bump NAME:
  #!/usr/bin/env bash
  set -euo pipefail
  REPO=".upstreams/{{ NAME }}"
  [ -d "$REPO" ] || { echo "Unknown upstream: {{ NAME }}"; exit 1; }
  cd "$REPO"
  git fetch origin
  BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||' || echo main)
  OLD=$(git rev-parse --short HEAD)
  git checkout "origin/$BRANCH"
  NEW=$(git rev-parse --short HEAD)
  cd - > /dev/null
  if [ "$OLD" = "$NEW" ]; then
    echo "{{ NAME }}: already at latest ($OLD)"
  else
    git add "$REPO"
    git commit -m "chore: bump {{ NAME }} submodule to latest ($NEW)"
    echo "{{ NAME }}: pinned $OLD → $NEW"
  fi
