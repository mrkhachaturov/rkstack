---
name: executing-plans
preamble-tier: 2
version: 1.0.0
description: |
  Execute implementation plans task-by-task with review checkpoints.
  Use when you have a written implementation plan to execute in a
  separate session. Batch execution with checkpoints for review.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
announce-action: implement this plan
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (executing-plans) ===

# Read detection cache (written by session-start via rkstack detect)
if [ -f .rkstack/settings.json ]; then
  cat .rkstack/settings.json
else
  echo "WARNING: .rkstack/settings.json not found — detection cache missing"
fi

# Session-volatile checks (can change mid-session)
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
_HAS_CLAUDE_MD=$([ -f CLAUDE.md ] && echo "yes" || echo "no")
echo "BRANCH: $_BRANCH"
echo "CLAUDE_MD: $_HAS_CLAUDE_MD"
```

Use the detection cache and preamble output to adapt your behavior:
- **TypeScript/JavaScript** — see `detection.flowType` (web or default). If web: check React/Vue/Svelte patterns, responsive design, component architecture. If default: CLI tools, MCP servers, backend scripts.
- **Python** — backend/ML/scripts. Check PEP8 conventions, pytest for testing.
- **Go** — backend/infra. Check error handling patterns, go test.
- **Rust** — systems. Check ownership patterns, cargo test.
- **Java/C#** — enterprise. Check build tool (Maven/Gradle/.NET), framework conventions.
- **Ruby** — web/scripting. Check Gemfile, Rails conventions if present.
- **Terraform/HCL** — infrastructure as code. Plan before apply, extra caution with state.
- **Ansible** — configuration management. Check inventory, role conventions, vault usage.
- **Docker/Compose** — containerized. Check service dependencies, .env patterns.
- **justfile** — task runner present. Use `just` commands instead of raw shell.
- **mise** — tool version manager. Versions are pinned — don't suggest global installs.
- **CLAUDE.md exists** — read it for project-specific commands and conventions.
- Read `detection.stack` for what's in the project and `detection.stats` for scale (files, code, complexity).
- Read `detection.repoMode` for solo vs collaborative.
- Read `detection.services` for Supabase and other service integrations.

## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value from preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts (see Completeness Principle). Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

## Completeness Principle

AI makes completeness near-free. Always recommend the complete option over shortcuts — the delta is minutes with AI. A "lake" (100% coverage, all edge cases) is boilable; an "ocean" (full rewrite, multi-quarter migration) is not. Boil lakes, flag oceans.

**Effort reference** — always show both scales:

| Task type | Human team | CC + AI | Compression |
|-----------|-----------|---------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix | 4 hours | 15 min | ~20x |

Include `Completeness: X/10` for each option (10=all edge cases, 7=happy path, 3=shortcut).

## Completion Status

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed successfully. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

### Escalation

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result."

Bad work is worse than no work. You will not be penalized for escalating.
- If you have attempted a task 3 times without success, STOP and escalate.
- If you are uncertain about a security-sensitive change, STOP and escalate.
- If the scope of work exceeds what you can verify, STOP and escalate.

Escalation format:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

# Executing Plans

## Overview

Execute implementation plans task-by-task in the current session. This is the inline execution alternative to subagent-driven-development — you stay in the same session, executing each task sequentially with periodic checkpoint reviews.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**When to use this skill:**
- You have a written plan (from writing-plans or similar) with numbered tasks and steps
- You want batch execution with human checkpoints, not subagent dispatch
- The plan is small-to-medium scope (1-15 tasks)

**When to prefer subagent-driven-development instead:**
- Large plans (15+ tasks) where fresh context per task matters
- Tasks that are highly independent and benefit from isolation

## Step 1: Load the Plan

1. Read the plan file the user provides
2. Extract all tasks — look for `### Task N:` headers with `- [ ]` checkbox steps
3. Count total tasks and steps
4. Review the plan critically before starting:
   - Are any steps ambiguous or missing details?
   - Are there dependency ordering issues?
   - Do verification commands look correct for this project's stack?
5. If concerns exist, raise them with AskUserQuestion before proceeding
6. Create TodoWrite entries — one per task, all set to `pending`

```
Announce: "Plan loaded: N tasks, M total steps. [Any concerns or ready to start.]"
```

## Step 2: Execute Tasks

For each task in order:

### 2a. Start the task

- Mark task `in_progress` in TodoWrite
- Read the task's steps carefully — understand what this task produces

### 2b. Follow each step exactly

- Execute each step as written in the plan
- If the plan specifies TDD (write test first, verify failure, implement, verify pass) — follow that sequence strictly using the **test-driven-development** skill.
- Run every verification command the plan specifies. Read the output. Confirm it matches the expected result.
- If a step says "Run X, expected Y" and you get Z — that is a failure. Do not proceed. See **Handling Failures** below.

### 2c. Commit after each task

After all steps in a task pass verification:

```bash
# Stage only the files this task touched
git add <specific files from this task>
git commit -m "<commit message from plan, or descriptive message>"
```

### 2d. Mark task completed

- Mark task `completed` in TodoWrite
- Brief note: what was done, any observations

## Step 3: Checkpoint Reviews

**After every 3 completed tasks** (or at natural boundaries like "all infrastructure tasks done"), pause execution and run a checkpoint:

1. **Summarize progress:**
   - Tasks completed so far (N of total)
   - What was built in the last batch
   - Any concerns or deviations from the plan

2. **Run the full test suite:**
   ```bash
   # Use the test command from CLAUDE.md or the plan header
   ```
   Report: all passing, or list failures.

3. **Check for drift:**
   - Are you still following the plan, or have you had to deviate?
   - Are upcoming tasks still valid given what was built?

4. **Ask the user:**
   Use AskUserQuestion with the standard format:

   > **Re-ground:** Project X, branch Y. Executing plan Z — completed N of M tasks.
   >
   > **Status:** [summary of what was built and test results]
   >
   > RECOMMENDATION: Choose A to continue — on track, tests passing.
   > A) Continue execution — next batch is Tasks N+1 through N+3
   > B) Adjust plan — something needs changing before continuing
   > C) Stop here — commit what we have and pause

## Step 4: Handling Failures

When a step fails (test doesn't pass, build breaks, command errors):

**Attempt 1:** Re-read the plan step. Check for typos, wrong file paths, import issues. Fix the obvious problem and retry.

**Attempt 2:** Look at the error more carefully. Check surrounding code for context. Try a different approach that still satisfies the plan's intent.

**Attempt 3:** Broader investigation — check if an earlier task left something in a broken state, check if the plan's assumption was wrong.

**After 3 failed attempts:**
- Mark the task as `blocked` in TodoWrite
- Record what was tried and what failed
- Check if the next task depends on this one:
  - **If independent:** Skip to the next task, come back to the blocked one later
  - **If dependent:** Stop execution and escalate

**Escalation format:**
```
STATUS: BLOCKED
TASK: Task N — [name]
ATTEMPTED:
  1. [what you tried first]
  2. [what you tried second]
  3. [what you tried third]
ERROR: [the actual error message]
RECOMMENDATION: [what the user should investigate or decide]
```

**Never silently skip a failed step.** Every failure must be reported.

## Step 5: Completion

After all tasks are executed (or all non-blocked tasks are done):

1. **Run full verification:**
   ```bash
   # Full test suite
   # Build (if applicable)
   # Lint (if applicable)
   ```
   Use commands from CLAUDE.md or the plan header. Do not guess commands.

2. **Verify with evidence:** Apply the **verification-before-completion** discipline — every claim must be backed by a command you ran and output you read in this session. No completion claims without fresh evidence.

3. **Report final status:**

   - **DONE** — All tasks completed, all verifications pass.
   - **DONE_WITH_CONCERNS** — All tasks completed, but: [list concerns — flaky tests, workarounds used, deviations from plan].
   - **BLOCKED** — N tasks blocked. [Summary of blockers].

4. **Suggest next step:**

   > "Plan execution complete. Status: [DONE/DONE_WITH_CONCERNS/BLOCKED].
   >
   > Suggested next steps:
   > - Use **requesting-code-review** for a thorough review of the changes
   > - Use **finishing-a-development-branch** to prepare for merge"

## Web project execution additions

If `flowType` is `web` (from detection cache):

1. **After implementing a UI task**, before marking it done, run visual verification:
   - Ensure dev server is running (see `skills/browse/dev-server-discovery.md`)
   - `$RKSTACK_BROWSE goto <url-of-affected-page>`
   - `$RKSTACK_BROWSE snapshot -i -a` — verify interactive elements render correctly
   - `$RKSTACK_BROWSE console` — check for JavaScript errors. Console errors block task completion, same as failing tests.
   - `$RKSTACK_BROWSE network --failed` — check for failed network requests

2. **If the plan step includes a design reference**, compare the implementation screenshot against it. Note any discrepancies.

3. **If the dev server is not running**, prompt: "Start the dev server to verify visually. The command should be in CLAUDE.md. Without it, I can only verify via tests."

4. **If `HAS_SUPABASE=yes`** and the task involves data mutations, verify via Supabase MCP that the data was written correctly. This catches cases where the UI shows success but the backend silently failed.

If `flowType` is not `web`, skip this section entirely.

## Rules

- **Follow the plan.** The plan was reviewed and approved. Execute it as written. If something seems wrong, escalate — don't silently redesign.
- **Never start on main/master** without explicit user consent. Check the branch in the preamble output.
- **Commit after each task**, not after each step. Each task should produce one atomic commit.
- **Read CLAUDE.md** of the target project for test/build/lint commands. Never guess.
- **Don't skip verifications.** If a plan step says "run tests and confirm pass" — run them and read the output.
- **One AskUserQuestion per checkpoint.** Don't batch multiple decisions.
