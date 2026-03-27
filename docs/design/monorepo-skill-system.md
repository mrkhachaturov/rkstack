# RKstack Monorepo Skill System: Design Document

## Problem Statement

The pack-based approach (rkstack-base, rkstack-web, rkstack-infra) solves the wrong
problem. It optimizes for **selecting** skills per project, but the real problems are:

1. **No runtime context** — skills don't know what project they're in. A brainstorming
   skill behaves the same in a Docker infra repo and a Next.js app.

2. **No safety guardrails** — AI can write to the wrong database, force-push, delete
   files. superpowers has no hooks. The user has to catch mistakes manually.

3. **Skills are static copies** — importing from upstream and renaming is mechanical
   work. When upstream improves a skill, we re-copy. The skills don't evolve on their
   own because they're not designed as templates with shared infrastructure.

4. **Multiple installs per project** — with packs, the user decides which pack to
   install. Wrong choice = missing skills. One plugin that adapts is simpler.

## What We Want

One plugin. Install once. Works everywhere. Adapts to context.

- **One `rkstack` plugin** — all skills available in every project
- **Preamble** — every skill starts by collecting project context (scc, git, CLAUDE.md)
- **Templates** — SKILL.md generated from .tmpl, shared sections stay in sync
- **Hooks** — PreToolUse guards against destructive operations
- **Platform detection** — scc determines tech stack, skills adapt behavior
- **Repo mode** — solo vs team, changes QA depth and review style

## Architecture

### Repository layout

```
rkstack/
├── .claude-plugin/
│   └── plugin.json                  ← one plugin: "rkstack"
│
├── hooks/
│   ├── hooks.json                   ← SessionStart + PreToolUse
│   ├── session-start                ← injects using-rkstack + runs preamble
│   └── guard/                       ← PreToolUse safety checks
│       └── check-destructive.sh
│
├── skills/                          ← all skills live here
│   ├── using-rkstack/
│   │   ├── SKILL.md.tmpl
│   │   ├── SKILL.md                 ← generated
│   │   └── references/
│   │       ├── codex-tools.md
│   │       └── gemini-tools.md
│   ├── brainstorming/
│   │   ├── SKILL.md.tmpl
│   │   ├── SKILL.md                 ← generated
│   │   ├── spec-document-reviewer-prompt.md
│   │   └── visual-companion.md
│   ├── writing-plans/
│   ├── executing-plans/
│   ├── test-driven-development/
│   ├── systematic-debugging/
│   ├── verification-before-completion/
│   ├── finishing-a-development-branch/
│   ├── dispatching-parallel-agents/
│   ├── subagent-driven-development/
│   ├── using-git-worktrees/
│   ├── requesting-code-review/
│   ├── receiving-code-review/
│   ├── writing-skills/
│   └── guard/                       ← safety skill (from gstack pattern)
│       └── SKILL.md
│
├── agents/
│   └── code-reviewer.md
│
├── bin/                             ← CLI utilities
│   ├── rkstack-detect               ← scc + git → project profile JSON
│   ├── rkstack-repo-mode            ← solo vs collaborative detection
│   └── rkstack-config               ← user preferences (~/.rkstack/config.yaml)
│
├── scripts/
│   └── gen-skill-docs.ts            ← .tmpl → SKILL.md generator
│
├── SKILL.md                         ← root meta-skill (generated)
├── SKILL.md.tmpl
├── GEMINI.md
├── .codex/
│   └── INSTALL.md
│
├── .upstreams/                      ← git submodules, reference only
│   ├── superpowers/                 ← for diffing, studying changes
│   └── gstack/                      ← for diffing, studying patterns
│
├── docs/
│   ├── design/
│   └── analysis/
│
├── justfile
├── .mise.toml
└── tools/                           ← build tooling (Rust or Bun, TBD)
```

### What changed from pack-based approach

| Pack-based (before) | Monorepo (now) |
|---------------------|----------------|
| `packs/rkstack-base/pack.yaml` | Skills live directly in `skills/` |
| `packs/rkstack-base/overlay/` | No overlay — you own every file |
| `plugins/rkstack-base/` (generated) | Root IS the plugin |
| rkbuild copies + transforms | gen-skill-docs generates from templates |
| Multiple packs per project type | One plugin, preamble adapts |
| No hooks | PreToolUse guard hooks |
| No project detection | scc + repo-mode in preamble |

## Template System

### Why templates

Skills reference shared concepts: preamble, platform detection, AskUserQuestion
format, escalation protocol. Without templates, changes to shared sections require
editing every SKILL.md manually. Templates keep them in sync.

### How it works

```
skills/brainstorming/SKILL.md.tmpl
  contains: human-written logic + {{PREAMBLE}} + {{ASK_FORMAT}} + ...
      ↓
scripts/gen-skill-docs.ts
  reads .tmpl, resolves placeholders, writes SKILL.md
      ↓
skills/brainstorming/SKILL.md
  committed to git, read by Claude at skill load time
```

### Placeholder catalog

| Placeholder | Source | What it injects |
|-------------|--------|----------------|
| `{{PREAMBLE}}` | gen-skill-docs.ts | Bash block: scc detection, repo-mode, branch, config |
| `{{ASK_FORMAT}}` | gen-skill-docs.ts | AskUserQuestion format: re-ground → simplify → recommend → options |
| `{{ESCALATION}}` | gen-skill-docs.ts | Escalation protocol: 3 attempts → BLOCKED status |
| `{{COMPLETENESS}}` | gen-skill-docs.ts | Completeness framing: score 1-10, effort comparison |
| `{{GUARD_RULES}}` | gen-skill-docs.ts | Destructive operation checklist |

### Generated SKILL.md is committed

Same reasoning as gstack:
1. Claude reads SKILL.md at load time — no build step available
2. CI can validate freshness: `gen-skill-docs --check && git diff --exit-code`
3. Git blame shows when changes happened

### Companion files are NOT templated

Files like `spec-document-reviewer-prompt.md`, `visual-companion.md`,
`testing-anti-patterns.md` are hand-authored and not generated.
Only SKILL.md goes through the template pipeline.

## Preamble

Every skill starts with a bash block that collects context. The preamble runs
BEFORE any skill logic.

```bash
# === RKstack Preamble ===

# Project detection via scc
_SCC=$(scc --format json --no-cocomo . 2>/dev/null | head -c 4096)
_TOP_LANG=$(echo "$_SCC" | grep -o '"Name":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "TOP_LANG: ${_TOP_LANG:-unknown}"

# Framework hints
_HAS_PACKAGE_JSON=$([ -f package.json ] && echo "yes" || echo "no")
_HAS_CARGO_TOML=$([ -f Cargo.toml ] && echo "yes" || echo "no")
_HAS_GO_MOD=$([ -f go.mod ] && echo "yes" || echo "no")
_HAS_PYPROJECT=$([ -f pyproject.toml ] && echo "yes" || echo "no")
_HAS_DOCKERFILE=$([ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TERRAFORM=$(ls *.tf 2>/dev/null | head -1 > /dev/null 2>&1 && echo "yes" || echo "no")
echo "STACK: pkg=$_HAS_PACKAGE_JSON cargo=$_HAS_CARGO_TOML go=$_HAS_GO_MOD py=$_HAS_PYPROJECT docker=$_HAS_DOCKERFILE tf=$_HAS_TERRAFORM"

# Repo mode (solo vs collaborative)
_AUTHOR_COUNT=$(git shortlog -sn --no-merges --since="90 days ago" 2>/dev/null | wc -l | tr -d ' ')
_REPO_MODE=$([ "$_AUTHOR_COUNT" -le 1 ] && echo "solo" || echo "collaborative")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "REPO_MODE: $_REPO_MODE"
echo "BRANCH: $_BRANCH"

# Project config
_HAS_CLAUDE_MD=$([ -f CLAUDE.md ] && echo "yes" || echo "no")
echo "CLAUDE_MD: $_HAS_CLAUDE_MD"
```

Skills use this context to adapt:
- TypeScript + package.json → suggest vitest/jest for TDD, React patterns for review
- Python + pyproject.toml → suggest pytest, PEP8 for review
- Dockerfile + Terraform → suggest infrastructure-specific safety checks
- Solo repo → proactive fixes. Collaborative → flag and document.

## Hooks

### SessionStart

Injects `using-rkstack/SKILL.md` into context (same as superpowers pattern).
This ensures Claude always checks for applicable skills.

### PreToolUse — Guard

Before every Bash/Write/Edit call, check for destructive operations:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/guard/check-destructive.sh\"",
            "async": false
          }
        ]
      }
    ]
  }
}
```

`check-destructive.sh` inspects the command/file and warns on:
- `rm -rf` on important paths
- `DROP TABLE`, `DELETE FROM` without WHERE
- `git push --force` to main/master
- `git reset --hard`
- Writing to database files outside the current project
- Overwriting config files (.env, credentials)

The hook returns a warning message. Claude sees it and asks for confirmation.
It does NOT block — it informs.

## Upstreams as Reference

`.upstreams/` are git submodules kept for:

1. **Studying changes** — `cd .upstreams/superpowers && git log v5.0.6..v5.1.0`
2. **Comparing approaches** — diff our brainstorming vs upstream brainstorming
3. **Borrowing patterns** — when gstack adds a new pattern, we study and adapt

We do NOT copy from upstreams. Skills are authored in `skills/`, inspired by
upstreams but written in our own style with our own infrastructure (templates,
preamble, hooks).

## Skill Authoring Guidelines

Based on patterns from gstack analysis:

### 1. Natural language for logic, bash for execution

Each bash block runs in a separate shell. State is passed through prose, not
shell variables:

```
Step 1: Run `git branch --show-current`
Step 2: If the branch from Step 1 is main, do X. Otherwise, do Y.
```

### 2. Numbered decision steps, not nested if/else

```
1. If the project has package.json, check for test script.
2. If test script exists, run it.
3. If no test script, ask the user for their test command.
4. Persist the answer to CLAUDE.md.
```

### 3. One decision per AskUserQuestion

Each question follows the format:
1. **Re-ground** — project, branch, current plan (1-2 sentences)
2. **Simplify** — what the problem is, no jargon
3. **Recommend** — with reasoning and Completeness score (1-10)
4. **Options** — A, B, C with effort comparison (human vs CC time)

### 4. Completeness framing

Always prefer the complete implementation. Show:
- Completeness: X/10
- Effort: human ~X days / CC ~Y min

### 5. Escalation protocol

After 3 failed attempts:
```
STATUS: BLOCKED
REASON: [1-2 sentences]
ATTEMPTED: [what was tried]
RECOMMENDATION: [next step for user]
```

### 6. Platform-agnostic

Never hardcode framework commands. Read from CLAUDE.md or ask the user.
Persist answers so we never ask twice.

## Delivery

### Claude Code

Root of repo IS the plugin. Marketplace entry:

```json
{
  "name": "rkstack",
  "source": {
    "source": "url",
    "url": "https://github.com/mrkhachaturov/rkstack.git"
  }
}
```

No `git-subdir` needed — the whole repo is the plugin.

### Codex

```bash
git clone https://github.com/mrkhachaturov/rkstack.git ~/.codex/rkstack
ln -s ~/.codex/rkstack/skills ~/.agents/skills/rkstack
```

### Gemini

`GEMINI.md` at repo root with `@` imports.

## Migration Plan

### Phase 1: Structure

- Create new directory layout (skills/, bin/, hooks/, agents/)
- Move/convert superpowers skills to .tmpl format
- Write gen-skill-docs (minimal: just {{PREAMBLE}})
- Add preamble with scc detection
- Test: one skill works end-to-end

### Phase 2: Safety

- Add PreToolUse hooks (guard/careful)
- Add bin/rkstack-detect (scc wrapper)
- Add bin/rkstack-repo-mode
- Test: hooks prevent destructive operations

### Phase 3: All skills

- Convert remaining superpowers skills to templates
- Add shared placeholders (ASK_FORMAT, ESCALATION, COMPLETENESS)
- Validate all skills generate correctly

### Phase 4: Install and test

- Test Claude Code plugin install
- Test Codex install
- Test on real project (pub-web)
- Iterate based on real usage

## Decided

- One plugin, not packs
- Templates with gen-skill-docs, not copy+transform
- Preamble with scc for project detection
- PreToolUse hooks for safety
- Upstreams as reference only, not copy source
- SKILL.md committed (generated at build time, not runtime)

## Remaining Decisions

1. **gen-skill-docs language** — TypeScript (like gstack, Bun) or Rust (existing
   rkbuild)? Recommendation: TypeScript + Bun, closer to gstack pattern.

2. **Preamble tier system** — do we need tiers (lightweight vs heavy) or one
   universal preamble? Start with one, split later if needed.

3. **scc as dependency** — require it or graceful fallback? Recommendation:
   graceful fallback (preamble checks `which scc`, skips detection if missing).

4. **Old packs/ and plugins/ cleanup** — remove on this branch or keep for
   reference? Recommendation: remove, they're in git history.
