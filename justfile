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

[group("build")]
[doc("Compile the rkstack binary for the current platform")]
build-bin:
  bun build --compile --define "VERSION=\"$(cat VERSION)\"" bin/src/main.ts --outfile bin/rkstack

[group("build")]
[doc("Compile the rkstack-browse binary for the current platform")]
build-browse:
  bun build --compile browse/src/cli.ts --outfile browse/dist/rkstack-browse
