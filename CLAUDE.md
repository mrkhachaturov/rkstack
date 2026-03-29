# RKstack

## What This Repo Is

RKstack is a single AI skill plugin (Claude Code, Codex, Gemini) that provides a
complete development workflow: brainstorming, planning, TDD, debugging, code review,
safety guardrails, and verification.

The repo root IS the plugin — there are no sub-packages, no build output directories,
no intermediate layers. Claude Code reads `skills/` directly.

## Commands

Top-level aliases (most-typed commands):

```bash
just build         # pull latest docs + generate all SKILL.md from templates
just check         # verify generated files are up to date (--dry-run)
just skill-check   # health dashboard for all skills
just dev-build     # generate project-local skills (dev/ → .claude/skills/)
just dev           # watch mode: auto-regen + validate on change
just detect        # run scc on current directory
just install       # install tools via mise
```

Modular commands (`.just/` files, accessed via `just module::recipe`):

```bash
# skills module
just skills::gen          # same as just build
just skills::check        # same as just check
just skills::health       # same as just skill-check
just skills::bin          # compile the rkstack binary
just skills::browse       # compile the rkstack-browse binary

# upstream module
just upstream::bump-all   # bump all submodules to latest and commit
just upstream::bump NAME  # bump one submodule (e.g. just upstream::bump gstack)
just upstream::check      # show what's new in upstreams

# setup module
just setup::tools         # same as just install
just setup::age           # configure age encryption for docs/rkstack/
just setup::check-age     # verify docs are encrypted
```

Bun equivalents:

```bash
bun scripts/gen-skill-docs.ts              # generate all
bun scripts/gen-skill-docs.ts --dry-run    # check freshness
bun scripts/gen-skill-docs.ts --host codex # generate for Codex
bun scripts/gen-dev-skills.ts              # generate dev skills
```

## Verification

```bash
bun test                    # run before every commit
just build && just check    # run before every commit — verify generated files are fresh
just skill-check            # run before shipping — validates frontmatter, coverage, freshness
```

`bun test` runs hook script tests (careful/freeze patterns, edge cases), gen-skill-docs
quality checks (discovery, frontmatter, placeholder resolution, tier gating), and worktree
unit tests. `just check` verifies generated files match templates. `just skill-check`
validates frontmatter and coverage. All three must pass before creating a PR.

## Repository Structure

```text
rkstack/
├── .claude-plugin/plugin.json    # plugin manifest — "rkstack"
├── hooks/                        # SessionStart + hook scripts
│   ├── hooks.json                # SessionStart declaration
│   └── session-start             # injects using-rkstack at session start
├── skills/                       # shipped skills (templates + generated)
│   ├── brainstorming/
│   │   ├── SKILL.md.tmpl         # template (human-authored)
│   │   ├── SKILL.md              # generated (committed)
│   │   └── *.md                  # companion files (hand-authored)
│   ├── careful/
│   │   ├── SKILL.md.tmpl
│   │   ├── SKILL.md
│   │   └── bin/check-careful.sh  # PreToolUse hook script
│   ├── writing-skills/
│   │   ├── SKILL.md.tmpl
│   │   ├── SKILL.md
│   │   └── refs/                 # official Claude Code docs (copied from upstream by build)
│   ├── browse/                   # headless browser skill + refs
│   ├── qa/                       # web QA — test + fix bugs
│   ├── qa-only/                  # report-only web QA
│   ├── design-review/            # visual QA — spacing, hierarchy, alignment
│   ├── plan-design-review/       # design review before implementation
│   ├── design-consultation/      # create DESIGN.md
│   ├── setup-browser-cookies/    # import auth cookies
│   ├── benchmark/                # performance regression detection
│   ├── canary/                   # post-deploy monitoring
│   ├── setup-project/            # project-level safety guards + rules
│   ├── supabase-qa/              # Supabase testing
│   └── ...                       # more skills
├── dev/                          # contributor-only (not shipped to users)
│   └── skills/
│       └── writing-rkstack-skills/
│           ├── SKILL.md.tmpl     # template for project-local skill
│           └── *.md              # companion files
├── .claude/skills/               # generated project-local skills (gitignored)
│   └── writing-rkstack-skills/
│       ├── SKILL.md              # generated from dev/skills/
│       └── refs/                 # official Claude Code docs (14 files)
├── bin/                          # rkstack CLI binary
│   ├── src/
│   │   ├── main.ts               # entry point: parse args, route to command
│   │   └── commands/
│   │       ├── version.ts         # rkstack version
│   │       ├── slug.ts            # rkstack slug [--branch|--full]
│   │       ├── config.ts          # rkstack config get/set/list
│   │       └── repo-mode.ts       # rkstack repo-mode (solo/collaborative)
│   └── rkstack                   # compiled binary (gitignored)
├── browse/                       # browser daemon (Playwright headless Chromium)
│   ├── src/                      # CLI + server + commands (13 files)
│   ├── test/                     # integration tests (321 tests)
│   └── dist/                     # compiled binary (gitignored)
├── agents/                       # agent definitions
│   └── code-reviewer.md          # two-pass review agent
├── scripts/                      # build tooling (Bun/TypeScript)
│   ├── gen-skill-docs.ts         # .tmpl → SKILL.md generator + refs copy
│   ├── gen-dev-skills.ts         # dev/skills/ → .claude/skills/ generator
│   ├── discover-skills.ts        # filesystem scanner for skills
│   ├── skill-check.ts            # health dashboard
│   ├── dev-skill.ts              # watch mode
│   └── resolvers/                # {{PLACEHOLDER}} → content
│       ├── types.ts              # TemplateContext, HostPaths, Resolver
│       ├── index.ts              # resolver registry
│       ├── preamble.ts           # preamble generator (tier-based)
│       └── utility.ts            # BASE_BRANCH_DETECT
├── lib/                          # reusable infrastructure
│   └── worktree.ts               # git worktree isolation
├── .upstreams/                   # git submodules (read-only reference)
│   ├── superpowers/              # obra/superpowers — skill content reference
│   ├── gstack/                   # garrytan/gstack — architecture reference
│   └── claude-code-docs/         # Claude Code official docs (auto-updated)
├── .github/workflows/
│   ├── check.yml                 # CI: freshness + skill health + tests (push/PR)
│   ├── update-refs.yml           # CI: daily upstream docs pull + version bump
│   └── release.yml               # CI: GitHub release from tag
├── docs/
│   └── workflow.md               # how skills connect end-to-end
├── VERSION                       # single source of truth for version
├── CHANGELOG.md                  # user-facing release notes (Keep a Changelog format)
├── ETHOS.md                      # builder philosophy
├── ARCHITECTURE.md               # why rkstack is built this way
├── CONTRIBUTING.md               # how to contribute
├── AGENTS.md                     # skill catalog for all AI agents
├── TODOS.md                      # structured roadmap
├── .just/                        # modular justfile commands
│   ├── skills.just               # gen, check, health, dev, bin, browse
│   ├── upstream.just             # check, bump, bump-all
│   └── setup.just                # tools, age, check-age
├── package.json                  # bun scripts
├── justfile                      # top-level aliases + module imports
└── .mise.toml                    # tool versions (bun, just, scc)
```

## Template System

```
skills/{name}/SKILL.md.tmpl       ← human writes template + {{PLACEHOLDERS}}
scripts/gen-skill-docs.ts         ← reads .tmpl, resolves placeholders, writes .md
skills/{name}/SKILL.md            ← generated, committed, tagged AUTO-GENERATED
```

### Frontmatter

```yaml
---
name: brainstorming
preamble-tier: 2
version: 1.0.0
description: |
  Multi-line description of when to use this skill.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
```

### Merge conflicts on SKILL.md files

NEVER resolve conflicts on generated SKILL.md files by accepting either side.
Instead: (1) resolve conflicts on the `.tmpl` templates and resolver source files
(the sources of truth), (2) run `just build` to regenerate all SKILL.md files,
(3) stage the regenerated files. Accepting one side's generated output silently
drops the other side's template changes.

### Companion files are NOT templated

Files like `spec-document-reviewer-prompt.md`, `visual-companion.md`,
`testing-anti-patterns.md` are hand-authored and live alongside the template.

### Refs pipeline

`skills/writing-skills/refs/` contains official Claude Code documentation copied
from `.upstreams/claude-code-docs/docs/` by `gen-skill-docs.ts` during build.
These are committed and shipped to users. CI (`update-refs.yml`) checks daily
for upstream changes, copies updated refs, and bumps the patch version.

`dev/skills/*/` templates get refs from the same upstream but output to
`.claude/skills/*/refs/` (gitignored, contributor-only) via `gen-dev-skills.ts`.

## Preamble

The preamble is a bash block injected at the top of every generated SKILL.md.
It runs first when Claude loads a skill, collecting project context.

| Tier | Skills | What it includes |
|------|--------|-----------------|
| T1 | using-rkstack, careful, freeze, guard, unfreeze, browse, setup-browser-cookies, benchmark | Core: scc detection, branch, repo-mode, framework hints, CLAUDE.md check |
| T2 | brainstorming, systematic-debugging, writing-plans, verification, executing-plans, subagent-driven, dispatching-parallel, worktrees, receiving-review, writing-skills, document-release, retro, cso, humanizer, dual-review, canary | T1 + AskUserFormat + Completeness table |
| T3 | TDD, plan-design-review, design-consultation, supabase-qa | T2 + RepoMode section + SearchBeforeBuilding |
| T4 | requesting-code-review, finishing-a-development-branch, qa, qa-only, design-review | T3 + full context (gate-quality skills) |

AskUserFormat, Completeness, Escalation, RepoMode are **sections within the
preamble** — not separate `{{PLACEHOLDER}}`s. This matches gstack's design.

## Platform-Agnostic Design

Skills must NEVER hardcode framework-specific commands, file patterns, or directory
structures. Instead:

1. **Read CLAUDE.md** for project-specific config (test commands, build commands, etc.)
2. **If missing, AskUserQuestion** — let the user tell you
3. **Persist the answer to CLAUDE.md** so we never have to ask again

This applies to test commands, build commands, deploy commands, and any other
project-specific behavior. The project owns its config; rkstack reads it.

## Skill Authoring Rules

SKILL.md.tmpl files are **prompt templates read by Claude**, not bash scripts.
Each bash code block runs in a separate shell — variables do not persist between blocks.

Rules:
- **Use natural language for logic and state.** Don't use shell variables to pass
  state between code blocks. Instead, tell Claude what to remember and reference
  it in prose (e.g., "the base branch detected in Step 0").
- **Don't hardcode branch names.** Detect `main`/`master`/etc dynamically.
  Use `{{BASE_BRANCH_DETECT}}` for PR-targeting skills. Use "the base branch"
  in prose, `<base>` in code block placeholders.
- **Keep bash blocks self-contained.** Each code block should work independently.
  If a block needs context from a previous step, restate it in the prose above.
- **Express conditionals as English.** Instead of nested `if/elif/else` in bash,
  write numbered decision steps: "1. If X, do Y. 2. Otherwise, do Z."

## Commit Style

**Always bisect commits.** Every commit should be a single logical change. When
you've made multiple changes (e.g., a rename + a rewrite + new tests), split them
into separate commits. Each commit should be independently understandable and
revertable.

Examples of good bisection:
- Template changes separate from generated file regeneration
- Resolver changes separate from skill content changes
- Mechanical refactors separate from new features
- Hook scripts separate from skill templates

## CHANGELOG + VERSION Style

**VERSION and CHANGELOG are branch-scoped.** Every feature branch that ships gets
its own version bump and CHANGELOG entry. The entry describes what THIS branch
adds — not what was already on main.

**Format:** Keep a Changelog (`## [a.b.c] - YYYY-MM-DD`). CI bumps patch (`c`)
automatically when refs update. We bump minor (`b`) or major (`a`) manually.

**Three files must stay in sync when bumping:** `VERSION`, `.claude-plugin/plugin.json`
(the `"version"` field), and the new CHANGELOG entry header. If `plugin.json` is not
bumped, marketplace users won't see the update due to caching.

**When to write the CHANGELOG entry:**
- At `/finishing-a-development-branch` time, not during development or mid-branch.
- The entry covers ALL commits on this branch vs the base branch.
- Never fold new work into an existing entry from a prior version on main.

CHANGELOG.md is **for users**, not contributors:
- Lead with what the user can now **do** that they couldn't before.
- Use plain language, not implementation details. "You can now..." not "Refactored the..."
- Never mention TODOS.md, internal tracking, or contributor-facing details.
- Every entry should make someone think "oh nice, I want to try that."

## AI Effort Compression

When estimating or discussing effort, always show both human-team and AI-assisted time:

| Task type | Human team | AI-assisted | Compression |
|-----------|-----------|-------------|-------------|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

Completeness is cheap. Don't recommend shortcuts when the complete implementation
is a "lake" (achievable) not an "ocean" (multi-quarter migration). See ETHOS.md.

## Search Before Building

Before designing any solution that involves concurrency, unfamiliar patterns,
infrastructure, or anything where the runtime/framework might have a built-in:

1. Search for "{runtime} {thing} built-in"
2. Search for "{thing} best practice {current year}"
3. Check official runtime/framework docs

Three layers: tried-and-true (Layer 1), new-and-popular (Layer 2),
first-principles (Layer 3). Prize Layer 3 above all. See ETHOS.md.

## Long-Running Tasks

When running builds, test suites, or any long-running background task, **poll until
completion**. Never say "I'll be notified when it completes" and stop checking.
Report progress at each check (what passed, what's running, any failures so far).
The user wants to see the task complete, not a promise to check later.

## The Approach: Follow gstack, Adapt superpowers Content

**gstack** (`garrytan/gstack`) is our reference architecture. Every script, every
pattern, every design decision should follow how gstack does it — or have a clear
reason for diverging.

**superpowers** (`obra/superpowers`) is our primary content source for skills. The
process skills are universal and well-written. We adapt them into the gstack
template/preamble pattern.

**Concrete rules:**

- Before writing any script, check how gstack does it in `scripts/`.
- Before adding a resolver, check `scripts/resolvers/` in gstack.
- Before creating a utility, check gstack `lib/`.
- If superpowers has better skill content, take the content but wrap it in
  gstack's infrastructure.

| From gstack (architecture) | From superpowers (content) |
|---|---|
| Template system (.tmpl → SKILL.md) | Brainstorming workflow |
| Preamble with tier system (T1-T4) | Writing plans methodology |
| gen-skill-docs.ts in Bun/TypeScript | TDD (Red-Green-Refactor) |
| skill-check.ts (health dashboard) | Systematic debugging |
| dev-skill.ts (watch mode) | Verification before completion |
| discover-skills.ts (dynamic scanning) | Git worktree usage |
| Frontmatter format (preamble-tier, version, allowed-tools) | Subagent-driven development |
| PreToolUse hooks (guard/careful/freeze) | Code review prompts |
| Platform-agnostic design (read CLAUDE.md, never hardcode) | Writing skills methodology |
| AskUserQuestion format (re-ground → simplify → recommend) | — |
| Completeness principle | — |
| Escalation protocol (3 attempts → BLOCKED) | — |
| worktree.ts for isolation | — |

## Upstreams

`.upstreams/` are git submodules — pinned, read-only references.

```
.upstreams/superpowers/       ← obra/superpowers, skill content reference
.upstreams/gstack/            ← garrytan/gstack, architecture reference
.upstreams/claude-code-docs/  ← official Claude Code docs (auto-updated daily by CI)
```

**How to use upstreams — the adaptation process:**

Upstreams are references, not blind copy sources. Every piece of upstream code
must go through this decision process before being used:

1. **Read the upstream code.** Understand what it does and why it's built that way.
2. **Read our code.** Understand our flows, our architecture, our existing patterns.
   How do our skills connect? What does our build pipeline expect? What do our
   tests cover?
3. **Compare and decide.** For each piece of upstream code, choose the right level:
   - **Copy as-is** — the code is universal, works in our stack, and doesn't conflict
     with our flows. Rename/rebrand (gstack → rkstack) and use it.
   - **Copy and adapt** — the logic is right but needs changes to fit our patterns,
     our preamble tiers, our naming conventions, or our existing skill flows.
   - **Use as reference only** — the approach is too gstack-specific or our
     architecture needs something fundamentally different. Study the design,
     then write our own version.

The key: the decision comes AFTER deep analysis of both sides, not before.
Don't rewrite tested code from scratch when it fits. Don't blindly copy code
that doesn't match our flows. Let the analysis tell you which level is right.

## CI Workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `check.yml` | Push/PR to main | Freshness check, skill health, `bun test` |
| `update-refs.yml` | Daily + manual | Pull claude-code-docs, copy refs, bump patch version, CHANGELOG, tag, GitHub release |
| `release.yml` | Tag `va.b.0` | GitHub release from CHANGELOG (manual releases only) |

CI bumps only the patch version (`a.b.c` → `a.b.c+1`). We own `a.b`.

## How to Work in This Repo

### Before writing a new skill

Run `just dev-build` first. This pulls the latest Claude Code documentation
and generates the `writing-rkstack-skills` project-local skill with up-to-date
refs. Then invoke the skill for guidance on template format, frontmatter,
preamble tiers, and the build workflow.

### Adding or editing a skill

1. Run `just dev-build` to ensure refs are fresh
2. Edit `skills/{name}/SKILL.md.tmpl` (never edit SKILL.md directly)
3. Run `just build` to regenerate
4. Verify with `just check` and `just skill-check`
5. Commit both .tmpl and generated .md

### Adding a new placeholder

1. Check how gstack does it in `.upstreams/gstack/scripts/resolvers/`
2. Create resolver function in `scripts/resolvers/`
3. Register in `scripts/resolvers/index.ts`
4. Use `{{PLACEHOLDER_NAME}}` in any .tmpl

### Adding a new skill

1. Run `just dev-build` (ensures writing-rkstack-skills refs are current)
2. Check if gstack has this skill — if yes, study their version first
3. Check if superpowers has this skill — if yes, use as content reference
4. Create `skills/{name}/SKILL.md.tmpl` with proper frontmatter
5. Add `{{PREAMBLE}}` as first placeholder after frontmatter
6. Run `just build`, verify, commit

### Adding infrastructure (scripts, bin, lib)

1. **Always** check gstack first: `.upstreams/gstack/scripts/`,
   `.upstreams/gstack/bin/`, `.upstreams/gstack/lib/`
2. Follow the upstream adaptation process (see Upstreams section above):
   read their code, read our code, then decide copy-as-is / copy-and-adapt /
   reference-only based on how it fits our flows.

### Never do this

- Do not edit generated SKILL.md files directly
- Do not invent patterns when gstack already has one
- Do not hardcode project-specific commands in skills
- Do not hand-edit .upstreams/
- Do not create separate placeholders for things that belong inside the preamble
- Do not resolve merge conflicts on generated SKILL.md by accepting either side

## Current State

**Done:**
- Repository structure (monorepo, root = plugin)
- gen-skill-docs.ts with frontmatter parsing, fail on unresolved placeholders
- discover-skills.ts (dynamic skill scanning)
- skill-check.ts (health dashboard)
- dev-skill.ts (watch mode)
- gen-dev-skills.ts (dev/ → .claude/skills/ with refs from upstream)
- Preamble tier system (T1-T4) with AskUserFormat, Completeness, RepoMode, Escalation
- Resolvers: PREAMBLE, TEST_FAILURE_TRIAGE, BASE_BRANCH_DETECT
- Shipped skills at gstack depth:
  - T1: using-rkstack, careful, freeze, guard, unfreeze, browse,
    setup-browser-cookies, benchmark
  - T2: brainstorming, systematic-debugging, writing-plans, verification,
    executing-plans, subagent-driven, parallel-agents, worktrees,
    receiving-review, writing-skills, document-release, retro, cso, humanizer,
    dual-review, canary, setup-project
  - T3: TDD, plan-design-review, design-consultation, supabase-qa
  - T4: requesting-code-review, finishing-a-development-branch, qa, qa-only,
    design-review
- 1 dev skill: writing-rkstack-skills (contributor-only, in dev/skills/)
- Hooks: session-start (injects using-rkstack), PreToolUse (careful/freeze/guard)
- Agent: code-reviewer
- Library: lib/worktree.ts (git worktree isolation)
- Binary: bin/src/ — rkstack CLI (version, slug, config, repo-mode, detect) with preamble bootstrap (Claude host)
- Refs pipeline: upstream claude-code-docs → skills/*/refs/ (shipped) + .claude/skills/*/refs/ (dev)
- CI: check (push/PR, includes version sync), update-refs (daily + version bump), release (all tags + binary builds)
- Root docs: VERSION, LICENSE, CHANGELOG.md, ETHOS.md, ARCHITECTURE.md,
  CONTRIBUTING.md, AGENTS.md, TODOS.md, docs/WORKFLOW.md
- Browser daemon (browse/) — Playwright headless Chromium, HTTP commands, ref system, 321 tests
- 10 web skills: browse, qa, qa-only, design-review, plan-design-review,
  design-consultation, setup-browser-cookies, benchmark, canary, supabase-qa
- Project detection via `rkstack detect` — SCC parsing, project type classification,
  tool/service detection, repo-mode. Cached to `.rkstack/settings.json` per session.
  Session-start calls binary with inline SCC fallback. Preamble reads cache.
- Supabase detection
- Web-aware workflow integration in 6 process skills
- Setup-project: curated guard scripts, hook JSON manifests, best-practice rule templates.
  Reads detection cache to match templates by stack. No AI-generated content.

**Next:**

1. Flow system: per-project-type flow documents that skills read on demand (lazy loading)
2. Codex/Gemini host support in gen-skill-docs (frontmatter transformation)

## Reference Material

Study these before making changes:

- `ETHOS.md` — builder philosophy (completeness, search, evidence, escalate)
- `ARCHITECTURE.md` — why rkstack is built this way
- `CONTRIBUTING.md` — how to add skills and work with templates
- `docs/WORKFLOW.md` — how skills connect end-to-end
- `.upstreams/gstack/CLAUDE.md` — how gstack instructs Claude to work
- `.upstreams/gstack/ETHOS.md` — Boil the Lake, Search Before Building
- `.upstreams/claude-code-docs/docs/skills.md` — official Claude Code skill spec
