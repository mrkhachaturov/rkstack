# Changelog

## [0.3.0] - 2026-03-27

New humanizer skill — write like a human, not like an AI pretending to be one.

### What's new

- **humanizer** — 35 anti-AI-pattern constraints active during composition, not as
  a post-edit pass. Tiered priority (T1 instant tells through T4 holistic). Voice
  calibration, rhythm variation, opinion injection, three-pass verification.
  Lightweight mode for commit messages. Referenced by brainstorming, document-release,
  finishing-branch, and retro — same pattern as how TDD is used across execution skills.
- **Brainstorming visual companion scripts** — browser-based mockup server now
  included (start-server.sh, stop-server.sh, frame template, helper).
- **Commit message quality** — humanizer applies in lightweight mode to commit
  messages: no significance inflation, no filler hedging, no em-dash overuse.

## [0.2.0] - 2026-03-27

Skills now aligned with official Claude Code spec and auto-updated reference docs.

### What's new

- **Official Claude Code docs** ship with the plugin — `writing-skills` includes
  `refs/` with the latest skill, hooks, agents, memory, and permissions docs from
  Anthropic. Updated automatically by CI when upstream changes.
- **Brainstorming visual companion** now works — browser-based mockup server
  scripts (start, stop, frame template) included.
- **Skills follow the official spec** — `disable-model-invocation` on side-effect
  skills, `argument-hint` for retro/cso/freeze, `user-invocable: false` on root
  skill, `$ARGUMENTS` support, explicit `CLAUDE_PLUGIN_ROOT` paths.
- **Framework detection expanded** — preamble now detects Ansible, Docker Compose,
  justfile, and mise alongside existing language/framework hints.

### CI & automation

- **Daily ref updates** — CI pulls latest Claude Code docs, copies to `refs/`,
  bumps patch version, tags release — all automatic.
- **Check workflow** — freshness, skill health, and 75 tests run on every push/PR.
- **Release workflow** — GitHub releases with changelog body from tags.

### Quality

- Skills audited for cross-skill consistency: intent mapping covers all 21 skills,
  workflow chain documented, tier assignments verified.
- Descriptions trimmed to triggering conditions only (no workflow summaries that
  cause Claude to skip skill content).
- Namespaced output paths: `docs/rkstack/specs/`, `docs/rkstack/plans/`,
  `.rkstack/brainstorm/` — no collisions with project docs.

### For contributors

- `dev/skills/` template system for project-local skills — `just dev-build`
  generates `.claude/skills/` with fresh refs from upstream.
- `writing-rkstack-skills` contributor skill with 14 official Claude Code docs
  as references, contextualized ref pointers in every section.
- Run `just dev-build` before writing new skills to ensure refs are current.

## [0.1.0] - 2026-03-27

Initial release. Complete AI development workflow as a single plugin.

### Skills (21)

**Core workflow** — brainstorm an idea, write a plan, execute it with TDD,
verify the result, get a code review, ship it:
- brainstorming, writing-plans, executing-plans, subagent-driven-development
- test-driven-development, verification-before-completion
- requesting-code-review, finishing-a-development-branch

**Quality** — systematic debugging with scope-locked investigation, security
audits, post-ship documentation sync, weekly retrospectives:
- systematic-debugging (5-phase, freeze hooks, 3-strike escalation)
- cso (OWASP Top 10 + STRIDE threat modeling)
- document-release, retro, receiving-code-review

**Safety** — PreToolUse hooks that warn on destructive commands and block
edits outside a defined boundary:
- careful (rm -rf, DROP TABLE, force-push warnings)
- freeze (directory-scoped edit restriction)
- guard (both combined), unfreeze

**Utility** — isolated workspaces, parallel execution, skill authoring:
- using-git-worktrees, dispatching-parallel-agents, writing-skills

### Infrastructure

- Template engine: `.tmpl` → frontmatter parsing → `{{PLACEHOLDER}}` resolution → `.md`
- Tiered preamble system (T1-T4): project detection, AskUserQuestion format,
  Completeness Principle, Repo Ownership, Escalation protocol
- 3 resolvers: PREAMBLE, BASE_BRANCH_DETECT, TEST_FAILURE_TRIAGE
- DX: skill-check (health dashboard), dev-skill (watch mode)
- Hooks: SessionStart (injects root skill), PreToolUse (careful/freeze/guard)
- Agent: code-reviewer (two-pass review, fix-first classification)
- Library: worktree.ts (git worktree isolation with patch harvesting)
