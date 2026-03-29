set shell := ["bash", "-euo", "pipefail", "-c"]
set working-directory := '..'

[doc("Pull latest docs + generate all SKILL.md from templates")]
gen:
  git submodule update --remote .upstreams/claude-code-docs 2>/dev/null || true
  bun scripts/gen-skill-docs.ts

[doc("Check that generated SKILL.md files are up to date")]
check:
  bun scripts/gen-skill-docs.ts --dry-run

[doc("Health dashboard for all skills")]
health:
  bun scripts/skill-check.ts

[doc("Generate project-local skills from dev/skills/ to .claude/skills/")]
dev-gen:
  bun scripts/gen-dev-skills.ts

[doc("Watch mode: auto-regen + validate on change")]
dev:
  bun scripts/dev-skill.ts

[doc("Detect project stack via scc")]
detect:
  scc --format wide --no-cocomo .

[doc("Compile the rkstack binary for the current platform")]
bin:
  bun build --compile --define "VERSION=\"$(cat VERSION)\"" bin/src/main.ts --outfile bin/rkstack

[doc("Compile the rkstack-browse binary for the current platform")]
browse:
  bun build --compile browse/src/cli.ts --outfile browse/dist/rkstack-browse
