# Architecture

This document explains **why** rkstack is built the way it is. For setup
and commands, see CLAUDE.md. For contributing, see CONTRIBUTING.md.

## The Core Idea

RKstack gives AI coding agents a complete development workflow through
structured skill files. Every skill is Markdown — read by the agent at
invocation time, not compiled or executed as a program.

The key insight: AI agents are powerful but undisciplined. Without structure,
they skip tests, guess at root causes, claim things work without checking,
and make destructive changes without warning. RKstack's skills impose the
same discipline a senior engineering team would: brainstorm before building,
test before implementing, investigate before fixing, verify before claiming
done, review before shipping.

```
User says: "Build X"
  │
  ▼
Session-start hook loads using-rkstack
  │  (intent → skill mapping)
  ▼
Claude invokes brainstorming skill
  │  (design spec produced, humanizer active)
  ▼
dual-review (spec)
  │  (Claude self-reviews → Codex reviews → rounds until clean)
  ▼
writing-plans skill
  │  (implementation plan with TDD tasks, humanizer active)
  ▼
dual-review (plan)
  │  (Claude self-reviews → Codex reviews → rounds until clean)
  ▼
executing-plans / subagent-driven-development
  │  (each task follows TDD: RED → GREEN → REFACTOR)
  ▼
verification-before-completion
  │  (run command → read output → verify claim)
  ▼
requesting-code-review
  │  (two-pass: CRITICAL then INFORMATIONAL)
  ▼
finishing-a-development-branch
  │  (test triage → merge/PR → document-release)
```

No step is optional. The agent follows the workflow, or it follows the
escalation protocol.

## Why a Plugin (Not a Script)

Claude Code plugins are discovered automatically. Install once, every
project gets the skills. No per-project setup, no copying files, no
symlinks.

The plugin system provides:
- **SessionStart hooks** — inject the root skill at every session start
- **PreToolUse hooks** — intercept destructive commands (careful) and
  out-of-scope edits (freeze) before they execute
- **Skill discovery** — Claude Code finds skills in `skills/` automatically
- **Agent definitions** — `agents/code-reviewer.md` is a reusable reviewer

Alternative approaches and why we didn't use them:
- **CLAUDE.md rules** — too static. Can't run bash, can't intercept tools.
- **Custom CLI** — too heavy. Requires installation, PATH config, versioning.
- **MCP server** — too complex for what's essentially structured Markdown.

## Why Templates

33 skills. Shared patterns (preamble, base branch detection, test failure
triage). If these are copy-pasted, they drift. A change to the preamble
means editing 28 files.

Templates solve this:

```
skills/{name}/SKILL.md.tmpl       ← human writes (content + {{PLACEHOLDERS}})
        │
        ▼  gen-skill-docs.ts      ← resolves placeholders from registry
        │
        ▼
skills/{name}/SKILL.md            ← generated, committed, read by Claude
```

Why committed (not generated at runtime)?
1. Claude reads SKILL.md when loading a skill — no build step possible
2. `just check` validates freshness in CI
3. `git blame` shows when a resolver changed

## The Preamble Tier System

Every skill starts with a preamble — a bash block that collects project
facts (tech stack via scc, repo mode, branch, CLAUDE.md presence). The
tier controls how much additional context the skill gets:

```
T1  ─────────────────────────────────────────────────
│ Core bash: scc detection, branch, repo-mode
│ Completion Status: DONE / BLOCKED / NEEDS_CONTEXT
│ Escalation: 3 strikes → stop
│
T2  ─────────────────────────────────────────────────
│ + AskUserQuestion Format
│   (re-ground → simplify → recommend → options)
│ + Completeness Principle
│   (effort table, X/10 scoring, bias toward complete)
│
T3  ─────────────────────────────────────────────────
│ + Repo Ownership (solo vs collaborative handling)
│ + Search Before Building (3-layer knowledge model)
│
T4  ─────────────────────────────────────────────────
│ (same as T3 — reserved for gate-quality skills)
│ TEST_FAILURE_TRIAGE is a separate resolver, not preamble
```

Why tiers? Token efficiency. A utility skill (/unfreeze: 30 lines) doesn't
need the Completeness Principle. A gate skill (/requesting-code-review:
400 lines) does. Tiers give each skill exactly the context it needs.

## Safety Architecture

Three layers, each independent:

**careful** — PreToolUse hook on Bash. Pattern-matches commands against a
destructive list (rm -rf, DROP TABLE, force-push, etc.). Returns
`permissionDecision: "ask"` — warns but lets user override. Has safe
exceptions for build artifacts (node_modules, dist, .cache).

**freeze** — PreToolUse hook on Edit/Write. Checks `file_path` against a
boundary stored in `$CLAUDE_PLUGIN_DATA/freeze-dir.txt`. Returns
`permissionDecision: "deny"` — hard block, no override. Used by
systematic-debugging to prevent edit scope creep during investigation.

**guard** — combines both. Single command to activate full safety mode.

The hooks are bash scripts that read JSON from stdin and return JSON. They
run before every tool call of their matched type. No daemon, no server —
just a script that checks a condition.

## Platform-Agnostic Design

Skills never hardcode `npm test`, `pytest`, `cargo test`, or any other
framework command. The pattern:

1. Read CLAUDE.md for the project's test/build/deploy commands
2. If not found, detect from project files (package.json → vitest/jest,
   pyproject.toml → pytest, Cargo.toml → cargo test)
3. If still unknown, AskUserQuestion and persist to CLAUDE.md

This means rkstack works on any stack without configuration. The project
owns its commands; rkstack reads them.

## Project Type Detection

The preamble detects what kind of project rkstack is running in and adapts
skill behavior accordingly. Detection uses scc output and config file
presence:

| PROJECT_TYPE | Detection signal |
| ------------ | --------------- |
| web | TypeScript/JavaScript + CSS/HTML or web framework config (next.config, vite.config, etc.) |
| node | package.json without web indicators |
| python | pyproject.toml, setup.py, requirements.txt |
| go | go.mod |
| infra | Terraform, Pulumi, CloudFormation files |
| devops | Dockerfile, docker-compose, k8s manifests |
| general | fallback when no specific type matches |

When `PROJECT_TYPE=web`, process skills inject visual verification steps:
screenshots after UI changes, responsive checks, design review gates.
Skills read the type from the preamble and branch on it in prose — no
separate resolver needed.

**Supabase detection** — when `supabase/config.toml` or a Supabase client
import is found, `HAS_SUPABASE=yes` is set. Skills that touch data or auth
then include Supabase-specific verification (RLS policies, auth flows).

## Browser Daemon

`browse/` is a Playwright-based headless Chromium daemon that web skills
use for navigation, interaction, screenshots, and console monitoring. It
runs as an HTTP server started on demand by the browse skill.

The daemon is a subsystem, not a skill. Skills call it through bash
commands (`rkstack-browse navigate`, `rkstack-browse screenshot`, etc.).
The browse skill itself is a T1 utility that starts the daemon and
provides the command reference.

## Resolver Architecture

Resolvers are TypeScript functions that generate content for template
placeholders:

```
scripts/resolvers/
  types.ts      ← TemplateContext, HostPaths, Resolver type
  index.ts      ← registry: placeholder name → function
  preamble.ts   ← tiered preamble composition
  utility.ts    ← BASE_BRANCH_DETECT
```

Each resolver receives `TemplateContext` (skill name, tier, host, paths)
and returns a string. `gen-skill-docs.ts` runs a single regex pass,
replacing `{{NAME}}` with the resolver's output. Unknown placeholders
cause a hard build failure.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Skills are Markdown, not code | AI agents read Markdown natively. No parsing layer. |
| Templates committed as .md | Claude can't run a build step at skill load time. |
| Preamble is bash, not inference | Facts > guesses. Preamble collects; skill decides. |
| One repo = one plugin | No sub-packages. The repo root IS the plugin. |
| Hooks per-skill, not global | Each skill declares its own safety constraints in frontmatter. |
| Tiers are cumulative | T3 includes all of T2 which includes all of T1. Simple mental model. |
| Fail on unresolved placeholders | Typos in templates should break the build, not produce broken skills. |
| Companion files are not templated | Prompt templates (code-reviewer.md, anti-patterns.md) don't need placeholders. |

## Upstreams

`.upstreams/` contains git submodules — pinned, read-only references.

**gstack** (`garrytan/gstack`) — architecture reference. Template system,
preamble tiers, resolver pattern, hook scripts, worktree.ts. We follow
their patterns for infrastructure.

**superpowers** (`obra/superpowers`) — content reference. Brainstorming,
TDD, debugging, verification, code review processes. Universal and
well-written. We adapt the content into gstack's infrastructure.

The rule: study the upstream, understand the pattern, write our version.
Never copy files directly.
