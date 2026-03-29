mod skills '.just/skills.just'
mod upstream '.just/upstream.just'
mod setup '.just/setup.just'

# ─── Top-level aliases (most-typed commands, no namespace needed) ───

[doc("Pull latest docs + generate all SKILL.md from templates")]
build:
  @just skills::gen

[doc("Check that generated SKILL.md files are up to date")]
check:
  @just skills::check

[doc("Health dashboard for all skills")]
skill-check:
  @just skills::health

[doc("Generate project-local skills from dev/skills/ to .claude/skills/")]
dev-build:
  @just skills::dev-gen

[doc("Watch mode: auto-regen + validate on change")]
dev:
  @just skills::dev

[doc("Detect project stack via scc")]
detect:
  @just skills::detect

[doc("Install pinned tools via mise")]
install:
  @just setup::tools
