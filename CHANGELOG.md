# Changelog

## [0.6.0] - 2026-03-28

RKstack now understands web projects. When you open a Next.js, Vite, or any TypeScript+CSS project, the workflow adapts automatically: brainstorming suggests design system creation, plans include visual verification steps, executing-plans checks screenshots and console errors after each UI task, verification runs responsive checks, and finishing-branch gates on QA before shipping. For non-web projects, nothing changes.

This is built on two new pieces of infrastructure: a persistent headless Chromium browser daemon (`rkstack-browse`, adapted from gstack) and project type detection in the session-start hook.

- **Browser daemon** -- `rkstack-browse` is a compiled Bun binary that runs a persistent headless Chromium via Playwright. HTTP commands, accessibility-tree-based ref system (`@e1`, `@e2` for DOM elements instead of fragile CSS selectors), annotated screenshots with red boxes and labels, responsive screenshots at three breakpoints, cookie import from real browsers (Chrome, Arc, Brave, Edge). Auto-starts on first command, 30-minute idle timeout, localhost-only with Bearer auth. Adapted from gstack's browse subsystem.
- **Project type detection** -- the session-start hook runs `scc` and classifies projects as `web`, `node`, `python`, `go`, `infra`, `devops`, or `general`. Injected as `PROJECT_TYPE=web` into the session context. The preamble TypeScript/JavaScript hint now references PROJECT_TYPE instead of assuming all TS projects are web.
- **Supabase detection** -- if `.mcp.json` contains a Supabase server or a `supabase/` directory exists, `HAS_SUPABASE=yes` is injected. Web skills verify data via Supabase MCP after browser actions.
- **10 new skills** (adapted from gstack):
  - `/browse` (T1) -- command reference for the browser daemon
  - `/qa` (T4) -- systematic web QA: test pages, find bugs, fix them with before/after screenshots
  - `/qa-only` (T4) -- same QA methodology but report-only, never touches code
  - `/design-review` (T4) -- visual QA: spacing, hierarchy, alignment, responsive breakage + fixes
  - `/plan-design-review` (T3) -- rates design dimensions 0-10 before implementation, with 12 cognitive patterns and AI slop detection
  - `/design-consultation` (T3) -- creates DESIGN.md from scratch: typography, color, layout, spacing, motion
  - `/setup-browser-cookies` (T1) -- import cookies from a real browser into the headless session
  - `/benchmark` (T1) -- performance baselines and regression detection
  - `/canary` (T2) -- post-deploy monitoring for console errors and performance regressions
  - `/supabase-qa` (T3) -- auth flow testing, RLS policy audit, data consistency via MCP
- **Web-aware workflow** -- 6 existing process skills now include conditional sections when `PROJECT_TYPE=web`: brainstorming suggests `/design-consultation` and invokes `/plan-design-review`; writing-plans adds visual verification steps; executing-plans checks screenshots and console errors; verification runs `/qa-only`; code review includes screenshots; finishing-branch gates on `/qa`.
- **CI: rkstack-browse builds** -- `release.yml` builds the browse binary for all 4 platforms alongside `rkstack`. `check.yml` installs Playwright Chromium for browser tests.
- **551 tests** (was 121) -- 321 browser daemon tests, 8 project type detection tests, 101 web skill validation tests.

## [0.5.1] - 2026-03-28

The binary bootstrap now actually works. It was in the wrong execution context (SKILL.md preamble, run by Claude's Bash tool) where `CLAUDE_PLUGIN_DATA` and `CLAUDE_PLUGIN_ROOT` are not available. Moved it to the `session-start` hook, which runs as a Claude Code subprocess with both env vars set. The binary downloads on first session and the resolved path is injected into the context.

## [0.5.0] - 2026-03-28

You can now run `rkstack version`, `rkstack slug`, `rkstack config`, and `rkstack repo-mode` from a single compiled binary. The binary downloads automatically on first skill load (Claude Code only) and checks for updates on each session. No skill behavior changes yet -- the binary ships alongside inline bash; skills migrate to it in Phase 2.

- **rkstack binary** -- compiled Bun CLI with four subcommands: `version` (print version), `slug` (filesystem-safe project/branch names), `config get/set/list` (persistent JSON key-value store), `repo-mode` (solo/collaborative detection with 7-day cache). Source in `bin/src/`, compiled via `just build-bin`.
- **Preamble bootstrap** -- T1 preamble now includes a download-and-verify block for Claude Code hosts. Downloads the binary on first run, version-checks on subsequent loads. Non-blocking: if download fails, skills continue with inline bash. Codex/Gemini hosts are unaffected.
- **CI: consolidated release workflow** -- `release.yml` now handles all `v*` tags (manual and CI patch bumps) and builds platform binaries (macOS ARM/Intel, Linux x86/ARM). `update-refs.yml` no longer creates releases.
- **CI: version sync check** -- `check.yml` verifies VERSION, plugin.json, and package.json agree on every push.
- **Config hardening** -- key validation rejects malformed keys, `configGet` returns empty for non-leaf nodes, `configSet` warns before overwriting scalars with nested objects.

### For contributors

- **finishing-a-development-branch** -- removed `disable-model-invocation` flag so the skill can be chained from code review without manual invocation.
- **skill-check** -- no longer warns about dev-generated skills in `.claude/skills/`.

## [0.4.0] - 2026-03-28

New dual-review skill -- specs and plans now get a second opinion from Codex before you approve them.

Brainstorming and writing-plans automatically run a Codex review loop after self-review: Codex reads the document in read-only mode, Claude evaluates each finding against the source code, fixes valid ones, and loops until Codex returns clean or 3 rounds are reached. You can also run it manually on any spec or plan with `/dual-review path/to/file.md`.

- **dual-review** -- sequential Claude-Codex review loop for specs and plans. Two prompt templates (spec-review, plan-review) give Codex focused review criteria. Findings classified as valid (fixed), rejected (intentional), or unclear (surfaced to you). Temp-file prompt delivery for large documents, 5-minute timeout, read-only sandbox.
- **brainstorming** and **writing-plans** now invoke dual-review automatically after self-review, before the user approval gate.
- **using-rkstack** intent table updated to route `/dual-review` requests.

## [0.3.2] - 2026-03-28

Skills now reference each other where the workflow requires it. Humanizer constraints activate during spec writing, plan prose, CHANGELOG entries, PR descriptions, retro narratives, and documentation edits. Verification is enforced before completion claims in both execution skills. Code review now suggests the shipping step instead of ending at a dead end.

Also fixes worktree tests failing on non-English system locales.

## [0.3.1] - 2026-03-27

Preamble now derives language frameworks from scc output instead of hardcoded file checks. scc scans recursively — catches Go in subdirectories, Python without pyproject.toml, and any language scc detects. File checks remain only for non-language tooling (Docker, Ansible, Compose, justfile, mise).

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
