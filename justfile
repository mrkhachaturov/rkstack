set shell := ["bash", "-euo", "pipefail", "-c"]

[group("setup")]
[doc("Install pinned tools via mise")]
setup:
  mise install

[group("build")]
[doc("Generate all SKILL.md from templates")]
build:
  bun scripts/gen-skill-docs.ts

[group("build")]
[doc("Check that generated SKILL.md files are up to date")]
check:
  bun scripts/gen-skill-docs.ts --dry-run

[group("build")]
[doc("Health dashboard for all skills")]
skill-check:
  bun scripts/skill-check.ts

[group("dev")]
[doc("Watch mode: auto-regen + validate on change")]
dev:
  bun scripts/dev-skill.ts

[group("detect")]
[doc("Detect project stack via scc")]
detect:
  scc --format wide --no-cocomo .
