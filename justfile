set shell := ["bash", "-euo", "pipefail", "-c"]

[group("setup")]
[doc("Install pinned tools via mise")]
setup:
  mise install

[group("build")]
[doc("Pull latest docs + generate all SKILL.md from templates")]
build:
  git submodule update --remote .upstreams/claude-code-docs 2>/dev/null || true
  bun scripts/gen-skill-docs.ts

[group("build")]
[doc("Check that generated SKILL.md files are up to date")]
check:
  bun scripts/gen-skill-docs.ts --dry-run

[group("build")]
[doc("Health dashboard for all skills")]
skill-check:
  bun scripts/skill-check.ts

[group("build")]
[doc("Generate project-local skills from dev/skills/ to .claude/skills/")]
dev-build:
  bun scripts/gen-dev-skills.ts

[group("dev")]
[doc("Watch mode: auto-regen + validate on change")]
dev:
  bun scripts/dev-skill.ts

[group("detect")]
[doc("Detect project stack via scc")]
detect:
  scc --format wide --no-cocomo .

[group("upstream")]
[doc("Show what's new in upstream submodules")]
upstream-check *ARGS:
  bun scripts/upstream-check.ts {{ ARGS }}

[group("upstream")]
[doc("Advance a submodule pin to latest (e.g. just upstream-bump gstack)")]
upstream-bump NAME:
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
    echo "{{ NAME }}: bumped $OLD → $NEW"
    echo "Run 'git add $REPO && git commit' to pin the new version"
  fi

[group("build")]
[doc("Compile the rkstack binary for the current platform")]
build-bin:
  bun build --compile --define "VERSION=\"$(cat VERSION)\"" bin/src/main.ts --outfile bin/rkstack

[group("build")]
[doc("Compile the rkstack-browse binary for the current platform")]
build-browse:
  bun build --compile browse/src/cli.ts --outfile browse/dist/rkstack-browse
