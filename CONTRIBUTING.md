# Contributing to RKstack

## Quick Start

```bash
git clone https://github.com/mrkhachaturov/rkstack.git
cd rkstack
just setup         # install bun, just, scc via mise
just build         # generate SKILL.md files from templates
just skill-check   # verify everything is healthy
```

## How Skills Work

Skills are Markdown files that Claude Code reads when invoked. They live in
`skills/{name}/` directories. Each skill has:

```
skills/brainstorming/
  SKILL.md.tmpl          ← source of truth (human-authored)
  SKILL.md               ← generated (committed, read by Claude)
  visual-companion.md    ← companion file (hand-authored, not templated)
```

The `.tmpl` file contains `{{PLACEHOLDERS}}` that get resolved by the build
system. The most common is `{{PREAMBLE}}` — a tiered context block injected
at the top of every skill.

## Editing a Skill

1. Edit `skills/{name}/SKILL.md.tmpl` (never edit SKILL.md directly)
2. Run `just build` to regenerate
3. Verify: `just check` (freshness) and `just skill-check` (health)
4. Commit both `.tmpl` and `.md`

Use `just dev` for watch mode — auto-regenerates on save.

## Adding a New Skill

1. Check if gstack has it: `.upstreams/gstack/{name}/SKILL.md.tmpl`
2. Check if superpowers has it: `.upstreams/superpowers/skills/{name}/SKILL.md`
3. Create `skills/{name}/SKILL.md.tmpl` with frontmatter:

```yaml
---
name: my-skill
preamble-tier: 2
version: 1.0.0
description: |
  When to use this skill. Triggered by user intent or workflow stage.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
```

4. Add `{{PREAMBLE}}` as the first content after frontmatter
5. Write the skill content following the authoring rules (see CLAUDE.md)
6. Run `just build`, verify, commit

### Choosing a Preamble Tier

| Tier | When to use | Gets |
|------|-------------|------|
| T1 | Utility skills (unfreeze, careful) | Core detection + escalation |
| T2 | Workflow skills (debugging, planning) | + AskUserQuestion format + Completeness |
| T3 | Code-touching skills (TDD) | + Repo Ownership + Search Before Building |
| T4 | Gate skills (review, ship) | Full context (same as T3, reserved for gates) |

## Adding a Resolver

Resolvers generate content for `{{PLACEHOLDER}}` tokens in templates.

1. Check gstack: `.upstreams/gstack/scripts/resolvers/`
2. Create function in `scripts/resolvers/{domain}.ts`
3. Register in `scripts/resolvers/index.ts`
4. Use `{{PLACEHOLDER_NAME}}` in any `.tmpl`

## Adding a Companion File

Companion files are hand-authored Markdown that lives alongside a skill
template. They are NOT processed by gen-skill-docs.

Examples: `testing-anti-patterns.md`, `code-reviewer.md`, `defense-in-depth.md`

To add one:
1. Create `skills/{name}/my-companion.md`
2. Reference it from the skill template: "Read `my-companion.md` for details."
3. Commit it directly (no build step)

## Skill Authoring Rules

- **Natural language for logic, bash for execution.** Each bash block runs in
  a separate shell. Pass state through prose, not variables.
- **Numbered decision steps, not nested if/else.** LLMs parse prose better.
- **One decision per AskUserQuestion.** Never batch multiple decisions.
- **Never hardcode framework commands.** Read from CLAUDE.md or ask the user.
- **Include Completeness: X/10** for every option (T2+ skills).
- **End with status reporting:** DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT.

## Project Structure

```
rkstack/
├── .claude-plugin/plugin.json    # plugin manifest
├── hooks/                        # SessionStart + scripts
├── skills/                       # all skills (23 total)
│   └── {name}/
│       ├── SKILL.md.tmpl         # template (edit this)
│       ├── SKILL.md              # generated (commit this)
│       └── *.md                  # companions (hand-authored)
├── agents/                       # agent definitions
├── scripts/                      # build tooling (Bun/TypeScript)
│   ├── gen-skill-docs.ts         # template → SKILL.md generator
│   ├── discover-skills.ts        # filesystem scanner
│   ├── skill-check.ts            # health dashboard
│   ├── dev-skill.ts              # watch mode
│   └── resolvers/                # {{PLACEHOLDER}} → content
├── lib/                          # reusable infrastructure
│   └── worktree.ts               # git worktree isolation
├── .upstreams/                   # git submodules (read-only)
│   ├── superpowers/              # content reference
│   └── gstack/                   # architecture reference
├── docs/                         # design docs, analysis, plans
├── package.json                  # bun scripts
├── justfile                      # human-friendly commands
└── .mise.toml                    # tool versions
```

## Commands

```bash
just build         # generate all SKILL.md from templates
just check         # verify generated files are fresh
just skill-check   # health dashboard (frontmatter, coverage, freshness)
just dev           # watch mode: auto-regen on change
just detect        # run scc on current directory
just setup         # install tools via mise
```

## Before Submitting

1. `just build` — regenerate all templates
2. `just check` — verify freshness (CI will fail if stale)
3. `just skill-check` — verify all skills are healthy
4. Commit both `.tmpl` and generated `.md` files
5. Never commit only one — they must stay in sync
