# RKstack

## What This Repo Is

RKstack is a single AI skill plugin (Claude Code, Codex, Gemini) that provides a
complete development workflow: brainstorming, planning, TDD, debugging, code review,
safety guardrails, and verification.

The repo root IS the plugin — there are no sub-packages, no build output directories,
no intermediate layers. Claude Code reads `skills/` directly.

## The Approach: Follow gstack, Adapt superpowers Content

**gstack** (`garrytan/gstack`) is our reference architecture. Every script, every
pattern, every design decision in RKstack should follow how gstack does it — or have
a clear reason for diverging. gstack is battle-tested, well-engineered, and solves
the same class of problems we solve.

**superpowers** (`obra/superpowers`) is our primary content source for skills. The
process skills (brainstorming, planning, TDD, debugging, verification) are universal
and well-written. We adapt them into the gstack template/preamble pattern.

**Concrete rules:**

- Before writing any script, check how gstack does it in `scripts/`. Use their
  pattern, not your own.
- Before adding a resolver, check `scripts/resolvers/` in gstack. Follow their
  naming, structure, and context model.
- Before designing a preamble feature, check `scripts/resolvers/preamble.ts` in
  gstack. They have a tier system (T1-T4), AskUserFormat, Completeness, RepoMode,
  SearchBeforeBuilding — all INSIDE the preamble, not as separate placeholders.
- Before creating a utility, check gstack `lib/`. They have `worktree.ts` for
  isolated execution — reusable as-is.
- If gstack has a working solution, bring it (or adapt it minimally). Do not
  reinvent from scratch.
- If superpowers has better skill content for a domain, take the content but wrap
  it in gstack's infrastructure (templates, preamble, frontmatter format).

**What we take from each upstream:**

| From gstack (architecture) | From superpowers (content) |
|---|---|
| Template system (.tmpl → SKILL.md) | Brainstorming workflow |
| Preamble with tier system (T1-T4) | Writing plans methodology |
| gen-skill-docs.ts in Bun/TypeScript | TDD (Red-Green-Refactor) |
| skill-check.ts (health dashboard) | Systematic debugging |
| dev-skill.ts (watch mode) | Verification before completion |
| discover-skills.ts (dynamic scanning) | Git worktree usage |
| Frontmatter format (preamble-tier, version, allowed-tools) | Subagent-driven development |
| `<!-- AUTO-GENERATED -->` comment | Code review prompts |
| PreToolUse hooks (guard/careful/freeze) | Writing skills methodology |
| Platform-agnostic design (read CLAUDE.md, never hardcode) | — |
| AskUserQuestion format (re-ground → simplify → recommend) | — |
| Completeness principle (Boil the Lake) | — |
| Escalation protocol (3 attempts → BLOCKED) | — |
| JSONL analytics | — |
| worktree.ts for isolation | — |

**If gstack has a skill we also need** (e.g. investigate, review, guard), take
it from gstack — it already follows the right pattern. No need to reinvent from
superpowers when gstack has it in the correct format.

## Upstreams

`.upstreams/` are git submodules — pinned, read-only references.

```
.upstreams/superpowers/   ← obra/superpowers, skill content reference
.upstreams/gstack/        ← garrytan/gstack, architecture reference
```

Use them for:
- Studying what changed between upstream versions (`git diff v5.0.6..v5.1.0`)
- Comparing our implementation vs their implementation
- Checking how gstack solves a problem before writing our version

**Do not copy files from upstreams.** Study them, understand the pattern, then
write your own version following that pattern.

## Repository Structure

```text
rkstack/
├── .claude-plugin/plugin.json    # plugin manifest — "rkstack"
├── hooks/                        # SessionStart + PreToolUse
│   ├── hooks.json
│   ├── session-start
│   └── guard/                    # destructive operation warnings
├── skills/                       # all skills (templates + generated)
│   ├── brainstorming/
│   │   ├── SKILL.md.tmpl         # template (human-authored)
│   │   ├── SKILL.md              # generated (committed)
│   │   └── *.md                  # companion files (hand-authored)
│   ├── writing-plans/
│   ├── test-driven-development/
│   └── ...
├── agents/                       # agent definitions (code-reviewer etc.)
├── bin/                          # CLI utilities
│   ├── rkstack-detect            # scc wrapper → project profile
│   ├── rkstack-repo-mode         # solo vs collaborative
│   └── rkstack-config            # user preferences
├── scripts/                      # build tooling (Bun/TypeScript)
│   ├── gen-skill-docs.ts         # .tmpl → SKILL.md generator
│   ├── discover-skills.ts        # filesystem scanner for skills
│   ├── skill-check.ts            # health dashboard
│   ├── dev-skill.ts              # watch mode (auto-regen on change)
│   └── resolvers/                # {{PLACEHOLDER}} → content
│       ├── types.ts
│       ├── index.ts              # resolver registry
│       └── preamble.ts           # preamble generator (tier-based)
├── lib/                          # reusable infrastructure
│   └── worktree.ts               # git worktree isolation
├── .upstreams/                   # git submodules (read-only reference)
│   ├── superpowers/
│   └── gstack/
├── docs/
│   ├── analysis/                 # upstream study notes
│   └── design/                   # architecture decisions
├── package.json                  # bun scripts
├── justfile                      # human-friendly commands
└── .mise.toml                    # tool versions (bun, just, scc)
```

## Template System

Following gstack's pattern exactly:

```
skills/{name}/SKILL.md.tmpl       ← human writes template + {{PLACEHOLDERS}}
scripts/gen-skill-docs.ts         ← reads .tmpl, resolves placeholders, writes .md
skills/{name}/SKILL.md            ← generated, committed, tagged AUTO-GENERATED
```

### Frontmatter (gstack format)

```yaml
---
name: brainstorming
preamble-tier: 1
version: 1.0.0
description: |
  Multi-line description of when to use this skill.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
```

### Generated output includes

```markdown
---
[frontmatter passed through]
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)
[generated bash block with project detection]

[rest of skill content]
```

### Companion files are NOT templated

Files like `spec-document-reviewer-prompt.md`, `visual-companion.md`,
`testing-anti-patterns.md` are hand-authored and live alongside the template.

## Preamble

The preamble is a bash block injected at the top of every generated SKILL.md.
It runs first when Claude loads a skill, collecting project context.

**Follow gstack's tier system** (see `scripts/resolvers/preamble.ts` in gstack):

| Tier | Skills | What it includes |
|------|--------|-----------------|
| T1 | brainstorming, using-rkstack | Core: scc detection, branch, repo-mode, CLAUDE.md check |
| T2 | writing-plans, debugging | T1 + AskUserFormat + Completeness table |
| T3 | TDD, code-review | T2 + RepoMode section + SearchBeforeBuilding |
| T4 | ship, deploy, QA | T3 + full context (when we add those skills) |

AskUserFormat, Completeness, Escalation, RepoMode are **sections within the
preamble** — not separate `{{PLACEHOLDER}}`s. This matches gstack's design.

## Skill Authoring Rules

From gstack's CLAUDE.md, adapted for RKstack:

- **Natural language for logic, bash for execution.** Each bash block runs in a
  separate shell. Pass state through prose, not shell variables.
- **Numbered decision steps, not nested if/else.** LLM parses prose better than
  nested bash.
- **One decision per AskUserQuestion.** Never batch multiple decisions.
- **Never hardcode framework commands.** Read from CLAUDE.md of the target project,
  or ask the user and persist the answer.
- **SKILL.md.tmpl files are prompt templates, not bash scripts.** Use natural
  language for logic and `<placeholder>` tokens for runtime values.

## Commands

```bash
just build       # generate all SKILL.md from templates
just check       # verify generated files are up to date (--dry-run)
just detect      # run scc on current directory
just setup       # install tools via mise
```

Bun equivalents (for scripts that call gen-skill-docs directly):

```bash
bun scripts/gen-skill-docs.ts              # generate all
bun scripts/gen-skill-docs.ts --dry-run    # check freshness
bun scripts/gen-skill-docs.ts --host codex # generate for Codex
```

## How to Work in This Repo

### Adding or editing a skill

1. Edit `skills/{name}/SKILL.md.tmpl` (never edit SKILL.md directly)
2. Run `just build` to regenerate
3. Verify with `just check`
4. Commit both .tmpl and generated .md

### Adding a new placeholder

1. Check how gstack does it in `.upstreams/gstack/scripts/resolvers/`
2. Create resolver function in `scripts/resolvers/`
3. Register in `scripts/resolvers/index.ts`
4. Use `{{PLACEHOLDER_NAME}}` in any .tmpl

### Adding a new skill

1. Check if gstack has this skill — if yes, study their version first
2. Check if superpowers has this skill — if yes, use as content reference
3. Create `skills/{name}/SKILL.md.tmpl` with proper frontmatter
4. Add `{{PREAMBLE}}` as first placeholder after frontmatter
5. Run `just build`, verify, commit

### Adding infrastructure (scripts, bin, lib)

1. **Always** check gstack first: `.upstreams/gstack/scripts/`,
   `.upstreams/gstack/bin/`, `.upstreams/gstack/lib/`
2. Follow their pattern. Adapt minimally.
3. If gstack has a working version (like `worktree.ts`), bring it as-is.

### Never do this

- Do not edit generated SKILL.md files directly
- Do not invent patterns when gstack already has one
- Do not hardcode project-specific commands in skills
- Do not hand-edit .upstreams/
- Do not create separate placeholders for things that belong inside the preamble

## Current State

**Done:**
- Repository structure (monorepo, root = plugin)
- gen-skill-docs.ts with frontmatter parsing, fail on unresolved placeholders
- discover-skills.ts (dynamic skill scanning)
- skill-check.ts (health dashboard)
- dev-skill.ts (watch mode)
- Preamble tier system (T1-T4) with AskUserFormat, Completeness, RepoMode, Escalation
- Resolvers: PREAMBLE, TEST_FAILURE_TRIAGE, BASE_BRANCH_DETECT
- 17 skills at gstack depth (brainstorming, writing-plans, TDD, debugging, verification,
  code-review, finishing-branch, executing-plans, subagent-driven, parallel-agents,
  worktrees, receiving-review, writing-skills, careful, freeze, guard, unfreeze)
- Hooks: session-start (injects using-rkstack), PreToolUse (careful/freeze/guard)
- Agent: code-reviewer
- Design docs, gstack analysis, workflow doc

**Next:**
1. bin/ utilities (rkstack-detect, rkstack-repo-mode, rkstack-config)
2. lib/worktree.ts (git worktree isolation for testing)
3. Codex/Gemini host support in gen-skill-docs (frontmatter transformation)

## Reference Material

Study these before making changes:

- `docs/analysis/gstack-architecture.md` — gstack philosophy and flow
- `docs/analysis/gstack-scripts-and-lib.md` — every gstack script/resolver analyzed
- `docs/design/monorepo-skill-system.md` — our design decisions
- `.upstreams/gstack/CLAUDE.md` — how gstack instructs Claude to work
- `.upstreams/gstack/ETHOS.md` — Boil the Lake, Search Before Building
