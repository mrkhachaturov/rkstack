# RKstack Workflow

How the skills connect, from session start to shipped code.

## Session Lifecycle

```
Session starts
  │
  ▼
hooks/session-start injects using-rkstack/SKILL.md
  │
  ▼
Claude reads using-rkstack:
  - instruction priority (user > skills > defaults)
  - proactive skill suggestions (intent → skill mapping)
  - the Rule: invoke skills BEFORE any response
  │
  ▼
User works — skills activate based on intent
```

## The Core Flow

```
Idea / request
  │
  ▼
┌─────────────────┐
│  brainstorming   │  T1 — explore ideas, propose approaches, write design spec
│                  │  Output: docs/specs/YYYY-MM-DD-<topic>-design.md
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  writing-plans   │  T2 — create implementation plan from spec
│                  │  Output: docs/plans/YYYY-MM-DD-<feature>-plan.md
│                  │  Bite-sized TDD tasks, exact file paths, no placeholders
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Implementation  │  Execute the plan using one of:
│                  │  - subagent-driven-development (fresh agent per task)
│                  │  - executing-plans (inline, same session)
│                  │  Each task uses test-driven-development (T3)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  verification    │  T2 — evidence before assertions
│  -before-        │  Run command, read output, verify claim, then state result
│  completion      │  Status: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  requesting-     │  T4 — two-pass review (CRITICAL then INFORMATIONAL)
│  code-review     │  Dispatches code-reviewer agent
│                  │  Fix-first: AUTO-FIX safe issues, ASK for design decisions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  finishing-a-    │  T4 — merge, PR, or cleanup
│  development-    │  Pre-flight: test triage, base branch detection
│  branch          │  Options: merge locally / push+PR / keep / discard
└─────────────────┘
```

## When Bugs Happen

```
Bug / test failure / unexpected behavior
  │
  ▼
┌─────────────────┐
│  systematic-     │  T2 — 5-phase investigation
│  debugging       │  Phase 1: Root cause investigation
│                  │  Phase 2: Pattern analysis (6 known patterns)
│                  │  Phase 3: Hypothesis testing (3-strike rule)
│                  │  Phase 4: Implementation (TDD, minimal diff)
│                  │  Phase 5: Verification report
│                  │
│                  │  Freeze hooks prevent edit scope creep
│                  │  3+ failed fixes → STOP and escalate
└─────────────────┘
```

## Safety Guardrails

```
┌──────────────────────────────────────────────────┐
│  guard = careful + freeze                         │
│                                                   │
│  careful (PreToolUse → Bash)                      │
│    Warns before: rm -rf, DROP TABLE, force-push,  │
│    reset --hard, kubectl delete, docker prune     │
│    Safe exceptions: node_modules, dist, .cache    │
│    Decision: "ask" (user can override)            │
│                                                   │
│  freeze (PreToolUse → Edit/Write)                 │
│    Restricts edits to a specified directory        │
│    Decision: "deny" (hard block)                  │
│    State: ${CLAUDE_PLUGIN_DATA}/freeze-dir.txt    │
│    Used by: systematic-debugging (auto-scopes)    │
└──────────────────────────────────────────────────┘
```

## Preamble Tier System

Every skill gets a preamble injected at the top. The tier controls how much context:

| Tier | Sections Included | Skills |
|------|------------------|--------|
| T1 | Core bash (scc, branch, repo-mode) + Completion Status + Escalation | using-rkstack, brainstorming, careful, freeze, guard, unfreeze |
| T2 | T1 + AskUserQuestion Format + Completeness Principle | systematic-debugging, writing-plans, verification, executing-plans, subagent-driven, parallel-agents, worktrees, receiving-review, writing-skills, document-release, retro |
| T3 | T2 + Repo Ownership + Search Before Building | TDD, cso |
| T4 | T3 (gate-quality skills) | requesting-code-review, finishing-a-development-branch |

**AskUserQuestion Format** (T2+): re-ground → simplify → recommend → options with Completeness scoring

**Completeness Principle** (T2+): always recommend complete option, show effort table (human vs AI)

**Repo Ownership** (T3+): solo = fix proactively, collaborative = flag and ask

**Search Before Building** (T3+): Layer 1 (tried-and-true) → Layer 2 (new-and-popular) → Layer 3 (first principles)

## Template System

Skills are built from templates:

```
skills/{name}/SKILL.md.tmpl     ← human writes (frontmatter + {{PLACEHOLDERS}})
        │
        ▼  gen-skill-docs.ts
        │  resolves: {{PREAMBLE}}, {{BASE_BRANCH_DETECT}}, {{TEST_FAILURE_TRIAGE}}
        │
        ▼
skills/{name}/SKILL.md          ← generated, committed, read by Claude at load time
```

Build commands:
- `just build` — generate all SKILL.md from templates
- `just check` — verify generated files are fresh
- `just skill-check` — health dashboard (frontmatter validation, template coverage, freshness)
- `just dev` — watch mode (auto-regen on change)

## Resolver Registry

| Placeholder | What it generates | Used by |
|------------|-------------------|---------|
| `{{PREAMBLE}}` | Tiered preamble (bash + prose sections) | Every skill |
| `{{BASE_BRANCH_DETECT}}` | Platform-aware base branch detection (GitHub, GitLab, git) | requesting-code-review, finishing-branch |
| `{{TEST_FAILURE_TRIAGE}}` | Test failure ownership classification | finishing-branch |

## Companion Files

Hand-authored files that live alongside templates. NOT processed by gen-skill-docs.

| Skill | Companion | Purpose |
|-------|-----------|---------|
| brainstorming | visual-companion.md | Browser-based mockup guide |
| brainstorming | spec-document-reviewer-prompt.md | Spec review prompt |
| systematic-debugging | root-cause-tracing.md | Backward call-chain tracing technique |
| systematic-debugging | defense-in-depth.md | Four-layer validation after fix |
| test-driven-development | testing-anti-patterns.md | 5 anti-patterns with gate functions |
| requesting-code-review | code-reviewer.md | Prompt template for reviewer agent |
| writing-plans | plan-document-reviewer-prompt.md | Plan review prompt |

## Agent Definitions

| Agent | File | Purpose |
|-------|------|---------|
| code-reviewer | agents/code-reviewer.md | Two-pass review (CRITICAL/INFORMATIONAL), fix-first classification |

## Cross-Skill References

- **brainstorming** → invokes **writing-plans** on completion
- **writing-plans** → offers **subagent-driven-development** or **executing-plans** for execution
- **systematic-debugging** → uses **freeze** hooks for scope locking
- **guard** → chains **careful** (Bash) + **freeze** (Edit/Write)
- **finishing-a-development-branch** → uses **TEST_FAILURE_TRIAGE** from preamble
- **requesting-code-review** → dispatches **code-reviewer** agent

## Execution Skills

```
Plan ready
  │
  ├──▶ executing-plans (T2)         — inline, same session, checkpoint every 3 tasks
  │
  └──▶ subagent-driven-development  — fresh agent per task, two-stage review
       (T2)                           (spec compliance → code quality)
       Uses: implementer-prompt.md, spec-reviewer-prompt.md,
             code-quality-reviewer-prompt.md

Both use: test-driven-development for each task
Both end with: verification → code-review → finishing-branch
```

## Parallel & Isolation

```
dispatching-parallel-agents (T2)    using-git-worktrees (T2)
  │                                   │
  Tasks MUST be independent           Isolated workspace for feature work
  No shared files                     Smart directory selection
  Dispatch all in single message      Safety verification before start
  Review for conflicts after          Cleanup on completion
```

## Post-Ship & Analysis

```
PR merged
  │
  ├──▶ document-release (T2)    — audit .md files against diff, auto-update
  │                                factual content, gate risky changes,
  │                                polish CHANGELOG, cross-doc consistency
  │
  └──▶ retro (T2)               — weekly engineering retrospective
                                   commit analysis, session detection,
                                   focus scoring, team breakdown, trends
```

## Security

```
cso (T3) — Chief Security Officer audit
  │
  Phases 0-12: architecture model → attack surface → secrets →
  supply chain → CI/CD → infrastructure → webhooks → LLM security →
  OWASP Top 10 → STRIDE → data classification → FP filter → report
  │
  Modes: /cso (full), --diff (branch), --owasp, --infra, --code
```

## Meta Skills

| Skill | Tier | Purpose |
|-------|------|---------|
| writing-skills | T2 | Create/edit skills — template system, frontmatter, tiers, testing |
| receiving-code-review | T2 | Respond to review feedback with technical rigor, not blind agreement |

## Library

| Module | File | Purpose |
|--------|------|---------|
| WorktreeManager | lib/worktree.ts | Git worktree isolation: create, harvest patches, cleanup, dedup |

## All 21 Skills

| Skill | Tier | Source | Category |
|-------|------|--------|----------|
| using-rkstack | T1 | superpowers + gstack | Root / session entry |
| brainstorming | T1 | superpowers | Design |
| careful | T1 | gstack | Safety |
| freeze | T1 | gstack | Safety |
| guard | T1 | gstack | Safety |
| unfreeze | T1 | gstack | Safety |
| systematic-debugging | T2 | gstack /investigate + superpowers | Quality |
| writing-plans | T2 | superpowers (enriched) | Planning |
| verification-before-completion | T2 | superpowers (enriched) | Quality |
| executing-plans | T2 | superpowers (enriched) | Execution |
| subagent-driven-development | T2 | superpowers (adapted) | Execution |
| dispatching-parallel-agents | T2 | superpowers (enriched) | Execution |
| using-git-worktrees | T2 | superpowers (adapted) | Utility |
| receiving-code-review | T2 | superpowers (adapted) | Quality |
| writing-skills | T2 | superpowers + rkstack | Meta |
| document-release | T2 | gstack (adapted) | Post-ship |
| retro | T2 | gstack (core adapted) | Analysis |
| test-driven-development | T3 | superpowers (enriched) | Quality |
| cso | T3 | gstack (adapted) | Security |
| requesting-code-review | T4 | gstack /review + superpowers | Quality |
| finishing-a-development-branch | T4 | gstack /ship + superpowers | Shipping |
