# Changelog

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
