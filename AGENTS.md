# RKstack — AI Development Workflow

RKstack is a skill plugin that gives AI agents structured workflows for
software development. Each skill is a specialist: brainstormer, planner,
debugger, reviewer, security auditor, and more.

## Available Skills

Skills live in `skills/`. Invoke them by name (e.g., `/brainstorming`).

### Core Workflow

| Skill | What it does |
|-------|-------------|
| `/brainstorming` | Explore ideas before code. Turn vague requests into designs. |
| `/writing-plans` | Create implementation plans with TDD tasks and exact file paths. |
| `/executing-plans` | Execute plans inline, checkpoint every 3 tasks. |
| `/subagent-driven-development` | Fresh subagent per task with two-stage review. |
| `/test-driven-development` | Red-Green-Refactor. No production code without a failing test. |
| `/verification-before-completion` | Prove it works before claiming done. Evidence required. |
| `/requesting-code-review` | Two-pass review (CRITICAL then INFORMATIONAL). Fix-first. |
| `/finishing-a-development-branch` | Merge, PR, or cleanup. Test triage + base branch detection. |

### Quality & Security

| Skill | What it does |
|-------|-------------|
| `/systematic-debugging` | 5-phase root-cause investigation. 3 strikes then escalate. |
| `/cso` | OWASP Top 10 + STRIDE security audit. Full or branch-diff mode. |
| `/document-release` | Post-ship documentation audit. Auto-update factual content. |
| `/retro` | Weekly retrospective with commit analysis and trend tracking. |
| `/receiving-code-review` | Respond to review feedback with technical rigor. |
| `/humanizer` | Write like a human. 35 anti-AI constraints active during composition. |
| `/dual-review` | Claude writes, Codex reviews. Sequential rounds until clean. Source code is truth. |

### Safety Guardrails

| Skill | What it does |
|-------|-------------|
| `/setup-project` | Configure project-level safety guards and working rules. Analyzes your stack, generates hooks and rules. |
| `/careful` | Warn before destructive commands (rm -rf, DROP TABLE, force-push). |
| `/freeze` | Lock edits to one directory. Hard block, not just a warning. |
| `/guard` | Activate both careful + freeze at once. |
| `/unfreeze` | Remove directory edit restrictions. |

### Utility

| Skill | What it does |
|-------|-------------|
| `/using-git-worktrees` | Create isolated workspaces for feature work. |
| `/dispatching-parallel-agents` | Run 2+ independent tasks in parallel subagents. |
| `/writing-skills` | Create or edit skills. Template system, frontmatter, tiers. |

## Build Commands

```bash
just build         # generate SKILL.md files from templates
just check         # verify generated files are fresh
just skill-check   # health dashboard for all skills
just dev           # watch mode: auto-regen on change
just install       # install tools via mise
```

## Key Conventions

- SKILL.md files are **generated** from `.tmpl` templates. Edit the template, not the output.
- Each skill has a **preamble tier** (T1-T4) that controls context injection level.
- Safety skills (careful, freeze, guard) use **PreToolUse hooks** for real-time protection.
- Skills are **platform-agnostic** — they read project config from CLAUDE.md, never hardcode.
