# Changelog

## [0.9.4] - 2026-04-18

Codex-as-consultant during brainstorming and plan writing. When Claude asks the user a substantive design question, the user can now pick "Ask Codex" and get Codex's read — endorsements of Claude's options, rejections, new options, and a single top recommendation — all merged into a follow-up AskUserQuestion so the user decides from the enriched set.

### Added
- **`/rescue`-style Codex consultation during ideation.** Both `brainstorming` and `writing-plans` now describe when and how to offer `Ask Codex` as an extra option on `AskUserQuestion` decisions. Trivial choices skip it; substantive ones (architecture, tradeoffs, approach, test harness, migration sequencing, risky decomposition) always include it.
- **`scripts/codex/consult.mjs`.** Transport helper that reads the consult prompt from stdin, runs one Codex turn through the shared app-server broker with structured-output enforcement, and prints parsed JSON on stdout. Same design as `review-doc.mjs` — one Bash call with a quoted HEREDOC, no temp files.
- **`scripts/codex/consult-schema.json`.** Defines Codex's response shape: `analysis`, `endorsed_existing[]`, `rejected_existing[]`, `new_options[]`, `recommendation`, `open_questions[]`. Schema is enforced at the RPC layer — Codex's output is deterministic JSON, no paragraph extraction.

### Flow
1. Claude proposes A/B/C options with rationale in an `AskUserQuestion` + includes `Ask Codex` as an extra option.
2. User picks `Ask Codex`.
3. Claude assembles an XML-block consult prompt (question + Claude's options + project context + grounding rules + output contract), pipes it through `consult.mjs`.
4. Codex returns structured JSON with endorsements, rejections, any new options, and a top recommendation.
5. Claude re-presents `AskUserQuestion` with the merged set — original options (annotated with Codex's endorsement/rejection rationale), Codex's new options (labeled `(Codex)`), the recommended label marked `(Recommended by Codex)`, and any open questions Codex raised as a brief footer.

## [0.9.3] - 2026-04-18

Patch release aligning dual-review's Codex invocation with OpenAI's own design: routes calls through the Codex app-server broker instead of raw `codex exec` + shell temp files, and adopts the two review-specialized prompt blocks from the Codex prompt block catalog that our prompts were missing.

### Fixed
- **Plugin manifest path in `scripts/codex/lib/app-server.mjs`.** The `PLUGIN_MANIFEST_URL` used two `../` levels which landed in `scripts/` instead of the repo root — `node scripts/codex/codex-companion.mjs setup --json` now returns `{"ready": true, ...}` instead of ENOENT.

### Changed
- **Dual-review's Codex transport.** The review loop no longer shells out to `codex exec` with three `mktemp` temp files for prompt / output / stderr. Instead it calls `scripts/codex/review-doc.mjs`, a small Node helper that reads the prompt from stdin, runs one Codex turn through the shared app-server broker with the output schema enforced at the RPC layer, and prints the parsed JSON findings on stdout. From Claude's side, Step 2 is a single Bash call with a quoted HEREDOC — no temp files written from Bash, no BSD/GNU `mktemp` portability concerns. Rounds share the same Codex session via broker reuse; `CODEX_COMPANION_SESSION_ID` from the existing session-lifecycle hook scopes job tracking.
- **Review prompts gained two blocks.** Added `<default_follow_through_policy>` and `<dig_deeper_nudge>` to `spec-review-prompt.md` and `plan-review-prompt.md`, placed between `<finding_bar>` and `<structured_output_contract>` as the Codex prompt block catalog recommends. These instruct Codex to keep searching after the first plausible issue with concrete second-order checks (empty-state behavior, retries, stale state, rollback paths for specs; cascading dependencies, state setup, task interleaving, uncovered spec requirements for plans). Without them Codex can stop at the first finding and call the review done.
- **Stripped editorial noise from skill docs.** Removed "Provenance" sections and inline license / upstream-attribution language from `codex-cli-runtime`, `codex-result-handling`, and `gpt-5-4-prompting` skills. Skill files are runtime instructions for the agent, not attribution documentation. Attribution stays in `THIRD_PARTY_NOTICES.md` and `scripts/codex/LICENSE`.

## [0.9.2] - 2026-04-18

Dual-review gets an adversarial second opinion with structured JSON findings, and a new `/rescue` skill hands substantial tasks over to Codex when you want a second set of eyes that can actually edit.

### Added
- **`/rescue` skill.** Delegate investigation, diagnosis, or implementation to Codex through a thin forwarding subagent. Supports `--background` for long runs, `--resume` / `--fresh` for thread control, `--model` (including `spark` → `gpt-5.3-codex-spark`), and `--effort` levels. Default is write-capable so Codex can apply fixes directly.
- **Vendored Codex companion runtime at `scripts/codex/`.** Pin `6a5c2ba` from [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) (Apache 2.0). Pure Node stdlib, zero npm runtime dependencies, cross-platform. Gives dual-review and rescue access to `setup --json` readiness checks, `task` with resume support, background job tracking, and the JSON-RPC broker.
- **`session-lifecycle-hook` wired on SessionStart + SessionEnd.** Scopes Codex job tracking per Claude session, kills orphaned jobs on exit, and shuts down the broker so no stale processes linger.
- **Three supporting internal skills:** `codex-result-handling` (presentation contract for any Codex output — preserve evidence boundaries, never auto-apply review fixes, never fabricate substitutes), `gpt-5-4-prompting` (XML-block prompt guidance for composing Codex prompts — attack surfaces, grounding rules, verification loops), and `codex-cli-runtime` (task-forwarding contract for the rescue subagent).

### Changed
- **Dual-review v1.0.0 → v2.0.0.** The review loop now enforces structured JSON findings via `codex exec --output-schema skills/dual-review/review-schema.json`. Each finding carries `file`, `line_start`, `line_end`, `confidence`, `severity`, and `recommendation` — no more paragraph-extraction guesswork. Verdict is an enum (`approve` / `needs-attention`), so approve + empty findings exits the loop cleanly.
- **Spec and plan review prompts rewritten with XML blocks** (`<role>`, `<task>`, `<operating_stance>`, `<grounding_rules>`, `<attack_surface>`, `<review_method>`, `<finding_bar>`, `<structured_output_contract>`, `<calibration_rules>`, `<final_check>`) adapted from upstream's adversarial-review prompt and specialized per document type. The "source code informs context, not intent" principle is now an explicit `<grounding_rules>` block Codex must honor.
- **Dual-review accepts a free-form focus text argument.** Everything after flags and the path gets passed as `USER_FOCUS` so you can weight the review toward a specific concern (auth, rollback, concurrency, etc.).
- **Readiness check uses the companion's `setup --json`.** Replaces the lightweight `command -v codex` probe with a single source of truth on Codex state (binary + auth + provider), and emits actionable `!codex login` guidance when auth is missing.

### Security
- Apache 2.0 NOTICE and LICENSE preserved next to the vendored code at `scripts/codex/`.

## [0.9.1] - 2026-03-30

Skills now know every browse command. The AI can crop screenshots to specific elements, use `--clip` for regions, and check computed CSS — capabilities that existed in the browse binary but were invisible because skill docs never mentioned them.

### Added
- **Auto-generated command reference.** Browse skill documents all 60 commands with correct syntax, pulled directly from source code. When a command is added, `just build` picks it up automatically.
- **14 new resolvers.** `COMMAND_REFERENCE`, `SNAPSHOT_FLAGS`, `BROWSE_SETUP`, `DESIGN_METHODOLOGY`, `DESIGN_HARD_RULES`, `QA_METHODOLOGY`, `TEST_BOOTSTRAP`, `TEST_COVERAGE_AUDIT_SHIP`, `TEST_COVERAGE_AUDIT_REVIEW`, `ADVERSARIAL_STEP`, `PLAN_COMPLETION_AUDIT_SHIP`, `PLAN_COMPLETION_AUDIT_REVIEW`, `PLAN_VERIFICATION_EXEC`, `REVIEW_DASHBOARD`. All adapted from gstack upstream, single source of truth.
- **Pre-merge gates for `/finishing-a-development-branch`.** Test coverage audit, plan completion audit, plan verification, adversarial review, and review readiness dashboard — 5 verification steps that were missing entirely.
- **Plan completion audit for `/requesting-code-review`.** Cross-references plan items against the diff to catch missing requirements and scope creep.
- **`ANNOUNCE_AT_START` resolver.** Skills announce themselves on load ("I'm using the X skill to Y"). 10 skills converted, and you can add it to any skill with one frontmatter field (`announce-action:`).
- **`SPIRIT_OVER_LETTER` resolver.** The discipline anchor ("Violating the letter of the rules is violating the spirit of the rules") is now shared across TDD, verification, debugging, and humanizer. One change propagates everywhere.
- **BROWSER.md.** Full technical reference for rkstack's headless browser — architecture, snapshot system, screenshot modes, real browser mode, Chrome extension, sidebar agent, environment variables.

### Fixed
- Browse command reference had wrong syntax (`eval <expression>` instead of `eval <file>`, `network [--failed]` instead of `[--clear]`) and was missing 15+ commands (`js`, `css`, `attrs`, `perf`, `watch`, `inbox`, `handoff`, `resume`, `connect`, `disconnect`, `focus`).
- 7 skills had copy-pasted browse setup blocks that could drift. Now all share one resolver.
- Design hard rules, AI slop blacklist, and QA methodology were duplicated across 2-4 templates. Now shared via resolvers.
- Test bootstrap procedure was hand-written in qa and design-review. Now shared via `TEST_BOOTSTRAP` resolver.
- Worktree tests no longer flake under parallel load. Setup now checks git exit codes instead of silently ignoring failures.

## [0.9.0] - 2026-03-29

Watch Claude browse in real time. `rkstack-browse connect` opens a visible Chromium window with a Chrome extension side panel showing live activity feed and chat.

### Added
- **Headed browser mode.** `connect` launches Playwright Chromium with a visible window, amber shimmer indicator, and the rkstack Chrome extension auto-loaded. `disconnect` returns to headless.
- **Chrome extension with side panel.** Activity feed shows every browse command in real time. Chat tab lets you send natural language instructions to a sidebar Claude agent. Ref overlays and connection status pill on every page.
- **Sidebar agent.** A child Claude process handles chat messages from the side panel. It can navigate, click, fill forms, and take screenshots in the shared browser.
- **Handoff and resume.** `handoff` transitions from headless to headed mid-session, preserving cookies and open tabs. `resume` returns control to the AI after manual interaction.
- **Watch mode.** `watch` observes user browsing with periodic snapshots. `watch stop` returns a summary.
- **Activity streaming.** Real-time SSE feed of all browse commands with privacy filtering (passwords, auth headers, cookies auto-redacted).
- **Cookie picker UI.** Interactive dark-themed HTML page for importing cookies from installed Chromium browsers (Chrome, Arc, Brave, Edge).
- **7 new browse commands:** `connect`, `disconnect`, `handoff`, `resume`, `focus`, `watch`, `inbox`.
- **`/connect-chrome` skill.** Guides you through launching headed Chrome, opening the side panel, and using the sidebar chat.

### Fixed
- Sidebar agent now processes messages that arrive before the agent starts (race condition fix vs gstack upstream).

## [0.8.1] - 2026-03-29

Detection timestamps now show your local time instead of UTC. The `detectedAt` field in `.rkstack/settings.json` uses your timezone offset (e.g. `+03:00`) so you can tell at a glance when detection last ran.

## [0.8.0] - 2026-03-29

Protect any project from destructive AI operations with one command, and stop wasting 200ms on SCC every time a skill loads.

- **`/setup-project` skill.** Run it once in any project. It reads your stack from the detection cache, offers matching guard hooks (destructive commands, terraform, secrets, docker, kubernetes, python, ansible) and best-practice rules (terraform, node, python, docker, ansible, secrets, context hygiene). Everything installs to `.claude/` with proper `settings.json` registration. Guards use "ask" mode so you can always override.
- **`rkstack detect` command.** SCC detection moved from the per-skill preamble into the CLI binary. Session-start calls it once, caches the full result (languages with file counts and complexity, tooling, services, repo mode) to `.rkstack/settings.json`. Skills read the cache instead of re-running SCC. Detection runs once per session, not once per skill.
- **Stack-based detection.** The old `projectType` label (web/node/python/go/infra/devops/general) is gone. Detection now produces a flat `stack` map (typescript, python, terraform, docker, ansible, etc.) and a `flowType` (web or default). `/setup-project` matches guards and rules against the stack. Skills branch on `flowType`.
- **Curated rule templates.** Rule templates ship with real best practices instead of `[GENERATED]` placeholders. Terraform safety rules, Python virtual environment conventions, Docker security practices, Ansible vault patterns, secrets rotation guidance. You get working rules out of the box, not AI-generated content.
- **Session-start suggests `/setup-project`.** When a project has no safety guards, or when a new rkstack version ships new templates, session-start tells you.
- **Smarter dual-review.** Codex reads spec and plan files directly from disk instead of receiving them pasted into the prompt. Shorter prompts, faster reviews.
- **Guard auto-invocation fixed.** `/guard` no longer has `disable-model-invocation`. Claude auto-activates safety mode when it detects risky context.
- **Modular justfile.** Commands split into `.just/skills.just`, `.just/upstream.just`, `.just/setup.just`. Top-level aliases (`just build`, `just check`) still work.
- **`just upstream::bump-all`** bumps all upstream submodules and commits the pin in one command.
- **Age encryption for docs.** Specs and plans in `docs/rkstack/` can be transparently encrypted with age. Git clean/smudge filters handle encryption on commit and decryption on checkout. Opt-in via `just setup::age`.

## [0.7.0] - 2026-03-29

Upstream sync from gstack v0.12.2 to v0.13.4 -- ported the improvements that matter for rkstack, skipped gstack-specific features (voice directive, skill prefix, design binary).

- **zsh compatibility.** Bare globs in skill templates no longer break on zsh. Affects `/cso`, `/retro`, `/qa`, `/qa-only`, and `/finishing-a-development-branch`. If you run zsh as your default shell, these skills now work without NOMATCH errors.
- **Smarter CHANGELOG generation.** `/finishing-a-development-branch` now enumerates every commit on the branch, groups them by theme, writes the entry, then cross-checks that every commit is covered. No more missing commits in the CHANGELOG.
- **Expanded code review checklist.** `/requesting-code-review` now catches LLM-generated URL SSRF, stored prompt injection in vector DBs, Python shell injection (`subprocess` with `shell=True`), async/sync mixing in Python endpoints, and ORM column name mismatches.
- **Credential safety in browse examples.** The `/browse` skill now uses `$TEST_EMAIL` and `$TEST_PASSWORD` environment variables instead of hardcoded test credentials.
- **Host-aware co-author trailers.** New `{{CO_AUTHOR_TRAILER}}` resolver generates the correct `Co-Authored-By` line for Claude, Codex, or Gemini. `/document-release` uses it instead of a hardcoded string.
- **Upstream tracking tooling.** `just upstream-check` shows what changed in gstack/superpowers/claude-code-docs since our pin. `just upstream-bump <name>` advances a submodule to latest. Makes future upstream syncs faster.

## [0.6.2] - 2026-03-29

The browse daemon now runs from the plugin source tree instead of downloading a standalone binary. The standalone binary couldn't find `server.ts` (which it spawns as a separate process), so the daemon failed to start on installed plugins. A thin wrapper script now invokes `bun` on the source directly.

## [0.6.1] - 2026-03-28

Fixed `-o` flag parsing in the browse daemon. `screenshot -o path/to/file.png` was treating paths starting with `.` as CSS selectors. `responsive -o prefix` was ignoring the prefix entirely. Both now work correctly.

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
