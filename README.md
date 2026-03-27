# RKstack

AI development workflow for Claude Code, Codex, and Gemini.

One plugin. 21 skills. Install once, adapts to your project.

## Install

**Claude Code:**
```bash
/install-plugin rkstack@ccode-personal-plugins
```

## What It Does

RKstack gives AI agents a structured development workflow. Every skill
enforces discipline that prevents common agent failures: skipping tests,
guessing at root causes, claiming things work without checking, making
destructive changes without warning.

### The Flow

```
Idea → brainstorming → writing-plans → [executing-plans | subagent-driven]
  → test-driven-development → verification → requesting-code-review
  → finishing-a-development-branch → document-release
```

### Skills

| Skill | What it does |
|-------|-------------|
| **brainstorming** | Explore ideas before code. Design spec before implementation. |
| **writing-plans** | Bite-sized TDD tasks. Exact file paths. No placeholders. |
| **executing-plans** | Inline execution with checkpoints every 3 tasks. |
| **subagent-driven-development** | Fresh agent per task. Two-stage review. |
| **test-driven-development** | RED → GREEN → REFACTOR. No code without failing test. |
| **systematic-debugging** | 5-phase investigation. 3 strikes then escalate. |
| **verification-before-completion** | Prove it works before claiming done. |
| **requesting-code-review** | Two-pass review. Fix-first paradigm. |
| **finishing-a-development-branch** | Test triage → merge/PR → cleanup. |
| **cso** | OWASP Top 10 + STRIDE security audit. |
| **document-release** | Post-ship documentation audit and sync. |
| **retro** | Weekly retrospective with commit analysis. |
| **careful** | Warn before rm -rf, DROP TABLE, force-push. |
| **freeze** | Lock edits to one directory. Hard block. |
| **guard** | Both careful + freeze at once. |
| **unfreeze** | Remove freeze restriction. |
| **using-git-worktrees** | Isolated workspaces for feature work. |
| **dispatching-parallel-agents** | Run independent tasks in parallel. |
| **receiving-code-review** | Respond to feedback with technical rigor. |
| **writing-skills** | Create or edit skills with the template system. |

### How It Works

1. **Session starts** — hook injects the root skill (`using-rkstack`)
2. **User works** — skills activate based on intent keywords
3. **Skills chain** — brainstorming leads to planning leads to execution
4. **Safety always on** — PreToolUse hooks intercept destructive commands
5. **Platform-agnostic** — reads your project's CLAUDE.md for commands

Skills detect your tech stack via [scc](https://github.com/boyter/scc)
and adapt automatically: TypeScript, Python, Rust, Go, Docker, Terraform.

## Philosophy

See [ETHOS.md](ETHOS.md) for the full builder philosophy:

1. **Completeness is cheap** — AI makes the last 10% near-free. Do it.
2. **Search before building** — know what exists before you design.
3. **Evidence before assertions** — prove it works, don't claim it.
4. **Platform-agnostic** — read from CLAUDE.md, never hardcode.
5. **Escalate, don't guess** — 3 strikes then stop.

## For Contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add skills, run the
build system, and work with templates.

See [ARCHITECTURE.md](ARCHITECTURE.md) for why rkstack is built the way
it is.

## License

MIT. See [LICENSE](LICENSE).

Upstream skills adapted from [gstack](https://github.com/garrytan/gstack)
and [superpowers](https://github.com/obra/superpowers) — see
THIRD_PARTY_NOTICES.md for their licenses.
