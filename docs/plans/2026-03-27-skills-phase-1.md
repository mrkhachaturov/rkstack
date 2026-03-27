# Skills Phase 1: Foundation + Flagship Skills

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring 7 superpowers skills to gstack depth level plus build hooks infrastructure and root skill. Not a format conversion — a content rewrite matching gstack's multi-phase workflows, decision points, hooks, and cross-skill orchestration.

**Architecture:** Each skill is a `.tmpl` file with YAML frontmatter + `{{PREAMBLE}}`. Content is adapted from superpowers (universal process skills) but enriched to match gstack's depth: numbered phases with clear gates, AskUserQuestion format, Completeness scoring, Escalation protocol, platform-agnostic config. Guard hooks (careful/freeze) provide PreToolUse safety. Session-start hook injects the root skill.

**Tech Stack:** Bun/TypeScript (build), bash (hooks, preamble), markdown (templates)

**Source references** (implementers MUST read these before writing):
- gstack skills: `.upstreams/gstack/{investigate,review,ship,careful,freeze,guard}/SKILL.md.tmpl`
- gstack hooks: `.upstreams/gstack/{careful,freeze}/bin/check-{careful,freeze}.sh`
- gstack root: `.upstreams/gstack/SKILL.md.tmpl`
- superpowers skills: available via `Skill` tool invocation or at the superpowers plugin cache

**Key principle:** If gstack has the skill (investigate, review, guard), take from gstack and adapt. If superpowers has richer process content (TDD, writing-plans, verification), take from superpowers and bring up to gstack quality.

---

### Task 1: Hooks infrastructure — session-start + guard/careful/freeze

Build the hooks system that provides session initialization and PreToolUse safety guards. Adapt from gstack's hooks, removing gstack-specific references (browse, telemetry, analytics JSONL).

**Files:**
- Create: `hooks/hooks.json`
- Create: `hooks/session-start`
- Create: `skills/careful/SKILL.md.tmpl`
- Create: `skills/careful/bin/check-careful.sh`
- Create: `skills/freeze/SKILL.md.tmpl`
- Create: `skills/freeze/bin/check-freeze.sh`
- Create: `skills/guard/SKILL.md.tmpl`

- [ ] **Step 1: Create `hooks/hooks.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/session-start\"",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Create `hooks/session-start`**

Adapt from superpowers' `hooks/session-start`. This script:
1. Reads `skills/using-rkstack/SKILL.md` (the root skill)
2. Escapes the content for JSON embedding
3. Outputs JSON with `hookSpecificOutput.additionalContext` (Claude Code) or `additional_context` (Cursor/other)

Study superpowers' `hooks/session-start` for the exact JSON escaping and platform detection. Adapt:
- Change `using-superpowers` → `using-rkstack`
- Remove the legacy skills directory warning
- Keep the platform detection (CURSOR_PLUGIN_ROOT vs CLAUDE_PLUGIN_ROOT)

Make executable: `chmod +x hooks/session-start`

- [ ] **Step 3: Create `skills/careful/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: careful
preamble-tier: 1
version: 0.1.0
description: |
  Warn before destructive commands: rm -rf, DROP TABLE, force-push,
  reset --hard, kubectl delete, docker prune. Use when working in
  sensitive areas or unfamiliar codebases.
allowed-tools:
  - Bash
  - Read
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-careful.sh"
          statusMessage: "Checking for destructive commands..."
---
```

Body: Take from gstack's `careful/SKILL.md.tmpl`. Keep the protected patterns list, safe exceptions, and user-facing explanation. Remove gstack-specific references. Add `{{PREAMBLE}}` after frontmatter.

- [ ] **Step 4: Create `skills/careful/bin/check-careful.sh`**

Take from gstack's `careful/bin/check-careful.sh`. Adapt:
- Change `~/.gstack` → `${CLAUDE_PLUGIN_DATA:-$HOME/.rkstack}`
- Remove analytics JSONL logging (or adapt to rkstack path)
- Keep: JSON extraction (grep/sed + Python fallback), safe exceptions, pattern matching, permissionDecision: "ask"

Make executable: `chmod +x skills/careful/bin/check-careful.sh`

- [ ] **Step 5: Create `skills/freeze/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: freeze
preamble-tier: 1
version: 0.1.0
description: |
  Restrict Edit/Write operations to a specified directory for the session.
  Use to prevent accidental edits outside a defined scope during debugging
  or focused work. Run /unfreeze or end session to remove restriction.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "Checking edit scope boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "Checking edit scope boundary..."
---
```

Body: Take from gstack's `freeze/SKILL.md.tmpl`. Keep the setup flow (AskUserQuestion → resolve path → save to freeze-dir.txt → confirm). Add `{{PREAMBLE}}`.

- [ ] **Step 6: Create `skills/freeze/bin/check-freeze.sh`**

Take from gstack's `freeze/bin/check-freeze.sh`. Adapt:
- Change `~/.gstack` → `${CLAUDE_PLUGIN_DATA:-$HOME/.rkstack}`
- Remove analytics logging
- Keep: JSON extraction, path resolution, boundary checking, permissionDecision: "deny"

Make executable: `chmod +x skills/freeze/bin/check-freeze.sh`

- [ ] **Step 7: Create `skills/guard/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: guard
preamble-tier: 1
version: 0.1.0
description: |
  Full safety mode: destructive command warnings + edit scope restriction.
  Combines /careful (bash warnings) and /freeze (edit boundary) in one command.
  Use when working in production-adjacent or unfamiliar codebases.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../careful/bin/check-careful.sh"
          statusMessage: "Checking for destructive commands..."
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking edit scope boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking edit scope boundary..."
---
```

Body: Take from gstack's `guard/SKILL.md.tmpl`. Single AskUserQuestion for directory, explain both protections. Add `{{PREAMBLE}}`.

- [ ] **Step 8: Build and verify**

Run: `just build`
Expected: All new skills generate SKILL.md files

Run: `just skill-check`
Expected: All green — frontmatter valid, templates covered, freshness OK

- [ ] **Step 9: Test hooks manually**

Run: `echo '{"tool_input":{"command":"rm -rf /"}}' | bash skills/careful/bin/check-careful.sh`
Expected: JSON with `permissionDecision: "ask"` and warning message

Run: `echo '{"tool_input":{"command":"rm -rf node_modules"}}' | bash skills/careful/bin/check-careful.sh`
Expected: `{}` (safe exception)

- [ ] **Step 10: Commit**

```bash
git add hooks/ skills/careful/ skills/freeze/ skills/guard/
git commit -m "add hooks infrastructure: session-start + guard/careful/freeze

SessionStart hook injects using-rkstack root skill at session start.
PreToolUse hooks provide safety: careful warns on destructive commands,
freeze denies edits outside boundary, guard combines both.
Adapted from gstack, removing gstack-specific references."
```

---

### Task 2: Create `using-rkstack` root skill

The root skill injected at every session start. Maps user intent to skills. Replaces superpowers' `using-superpowers`.

**Files:**
- Create: `skills/using-rkstack/SKILL.md.tmpl`

- [ ] **Step 1: Write `skills/using-rkstack/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: using-rkstack
preamble-tier: 1
version: 1.0.0
description: |
  Root skill injected at session start. Establishes how to find and use
  skills, maps user intent to the right skill, defines instruction priority.
  Loaded automatically — not invoked manually.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
```

Content structure — merge superpowers' `using-superpowers` framework with gstack's proactive suggestion pattern:

1. `{{PREAMBLE}}` (T1)
2. **Instruction Priority** section (from superpowers: user > skills > defaults)
3. **How to Access Skills** section (Skill tool invocation)
4. **The Rule** — invoke relevant skills BEFORE any response (from superpowers, this is the "iron law")
5. **Red Flags** table — rationalizations that mean STOP (from superpowers)
6. **Skill Priority** — process skills first, then implementation skills
7. **Proactive Skill Suggestions** — map user intent to rkstack skills (adapted from gstack root skill):
   - Brainstorming/ideas → `/brainstorming`
   - Planning → `/writing-plans`
   - Bug/error/broken → `/systematic-debugging`
   - Testing → `/test-driven-development`
   - Code review → `/requesting-code-review`
   - Shipping/merging → `/finishing-a-development-branch`
   - Safety/caution → `/guard` or `/careful`
   - Scoped edits → `/freeze`
   - Verify/check → `/verification-before-completion`
8. **Skill Types** — rigid vs flexible (from superpowers)

- [ ] **Step 2: Build and verify**

Run: `just build && just skill-check`

- [ ] **Step 3: Commit**

```bash
git add skills/using-rkstack/
git commit -m "add using-rkstack: root skill injected at session start

Maps user intent to skills, establishes instruction priority and
skill invocation rules. Combines superpowers framework with gstack
proactive suggestion pattern."
```

---

### Task 3: Rewrite `systematic-debugging` — align with gstack /investigate

The deepest rewrite. gstack's `/investigate` is 5 phases with freeze hooks, 3-strike escalation, pattern matching, and structured debug reports. Superpowers' version is 4 phases and lighter. Merge both to gstack depth.

**Files:**
- Create: `skills/systematic-debugging/SKILL.md.tmpl`
- Copy: `skills/systematic-debugging/root-cause-tracing.md` (from superpowers)
- Copy: `skills/systematic-debugging/defense-in-depth.md` (from superpowers)

- [ ] **Step 1: Write `skills/systematic-debugging/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: systematic-debugging
preamble-tier: 2
version: 1.0.0
description: |
  Systematic root-cause debugging with evidence-based investigation.
  Use when encountering any bug, test failure, or unexpected behavior,
  before proposing fixes. Four phases: investigate, analyze, hypothesize,
  implement. 3+ failed fixes means stop and escalate.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
  - WebSearch
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking debug scope boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking debug scope boundary..."
---
```

Content structure — merge gstack's /investigate depth with superpowers' companion techniques:

1. `{{PREAMBLE}}` (T2 — includes AskUserFormat + Completeness)
2. **IRON LAW: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST** (from both)
3. **Phase 1: Root Cause Investigation** (from gstack /investigate Phase 1):
   - Collect symptoms (exact error, when it started, what changed)
   - Read the actual code (don't guess)
   - Check recent changes (`git log --oneline -20`, `git diff HEAD~5`)
   - Reproduce the bug (write the exact command that triggers it)
   - Multi-component: trace across boundaries
   - Output: hypothesis statement
4. **Scope Lock** (from gstack): Lock edits to affected directory via freeze-dir.txt
5. **Phase 2: Pattern Analysis** (from gstack /investigate Phase 2):
   - Match against known patterns: race conditions, nil propagation, state corruption, integration failure, configuration drift, stale cache
   - Find working examples, compare differences
6. **Phase 3: Hypothesis Testing** (from gstack /investigate Phase 3):
   - Form single testable hypothesis
   - Add debug output (NOT fix — just observe)
   - 3-strike rule: after 3 failed hypotheses → STOP, escalate
   - Red flags: "this shouldn't matter", "let me just try", "it works sometimes"
   - Sanitize before WebSearch (no secrets, no internal paths)
7. **Phase 4: Implementation** (from both):
   - Fix ROOT CAUSE (not symptom) — see `root-cause-tracing.md`
   - Minimal diff (touch fewest files possible)
   - Write regression test FIRST (TDD: test proves the bug exists, then fix)
   - Apply defense-in-depth layers — see `defense-in-depth.md`
   - Run full test suite
8. **Phase 5: Verification & Report** (from gstack):
   - Fresh reproduction (re-run original failing scenario)
   - Structured debug report: STATUS (DONE/DONE_WITH_CONCERNS/BLOCKED), root cause found, fix applied, regression test added, files changed, remaining concerns
9. **Large Diff Gate** (from gstack): >5 files changed → AskUserQuestion before proceeding
10. **Supporting Techniques** section — references to companion files:
    - `root-cause-tracing.md` — backward tracing through call stack
    - `defense-in-depth.md` — four-layer validation after fix

- [ ] **Step 2: Copy companion files from superpowers**

Copy these files as-is (hand-authored, not templated):
- `systematic-debugging/root-cause-tracing.md`
- `systematic-debugging/defense-in-depth.md`

Do NOT copy: `CREATION-LOG.md`, `test-*.md`, `condition-based-waiting.md` (these are test/development artifacts, not user-facing companions).

- [ ] **Step 3: Build and verify**

Run: `just build && just skill-check`

- [ ] **Step 4: Commit**

```bash
git add skills/systematic-debugging/
git commit -m "add systematic-debugging: 5-phase investigation with freeze hooks

Aligned with gstack /investigate: root cause → pattern analysis →
hypothesis testing (3-strike) → implementation → verification.
Freeze hooks prevent edit scope creep. Companion files from superpowers:
root-cause-tracing.md, defense-in-depth.md."
```

---

### Task 4: Rewrite `writing-plans` — enrich with gstack patterns

Superpowers' writing-plans is a solid plan template. Enrich with gstack's patterns: AskUserFormat for all user questions, Completeness scoring, plan file review, scope drift detection. Reference spec-document-reviewer-prompt.md from brainstorming.

**Files:**
- Create: `skills/writing-plans/SKILL.md.tmpl`

- [ ] **Step 1: Write `skills/writing-plans/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: writing-plans
preamble-tier: 2
version: 1.0.0
description: |
  Write comprehensive implementation plans from specs or requirements.
  Use when you have a spec or requirements for a multi-step task, before
  touching code. Plans are bite-sized, TDD-first, with exact file paths
  and complete code in every step.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Agent
  - Write
  - Edit
  - AskUserQuestion
---
```

Content structure — take superpowers' writing-plans core and enrich:

1. `{{PREAMBLE}}` (T2 — includes AskUserFormat + Completeness)
2. **Overview** — write plans assuming engineer has zero context. DRY, YAGNI, TDD, frequent commits.
3. **Save plans to** — `docs/plans/YYYY-MM-DD-<feature-name>.md` (user preferences override)
4. **Scope Check** (from superpowers): multiple subsystems → break into sub-plans
5. **File Structure** (from superpowers): map files before tasks, clear boundaries, one responsibility per file
6. **Bite-Sized Task Granularity** (from superpowers): each step = one action (2-5 min)
7. **Plan Document Header** (from superpowers, adapted for rkstack):
   ```markdown
   # [Feature Name] Implementation Plan
   > **For agentic workers:** Use subagent-driven-development or executing-plans skill.
   **Goal:** [one sentence]
   **Architecture:** [2-3 sentences]
   **Tech Stack:** [key technologies]
   ```
8. **Task Structure** (from superpowers): Files, Steps with checkbox syntax, code blocks, run commands
9. **No Placeholders** (from superpowers): every step has actual content. List of plan failures.
10. **Self-Review** (from superpowers, enriched):
    - Spec coverage scan
    - Placeholder scan
    - Type consistency check
    - **NEW: Completeness audit** — for each task, what's the Completeness score? Flag tasks below 7/10.
11. **Execution Handoff** — offer subagent-driven or inline execution

- [ ] **Step 2: Build and verify**

Run: `just build && just skill-check`

- [ ] **Step 3: Commit**

```bash
git add skills/writing-plans/
git commit -m "add writing-plans: implementation plan authoring skill

Adapted from superpowers with gstack enrichments: AskUserFormat,
Completeness scoring, plan self-review with coverage audit.
Bite-sized TDD tasks, no placeholders, exact file paths."
```

---

### Task 5: Rewrite `test-driven-development` — add test bootstrap, coverage, hooks

Superpowers' TDD skill is strong (371 lines). Enrich with gstack's test patterns: test framework detection (read from CLAUDE.md), coverage audit, anti-patterns section. The anti-patterns companion file is excellent — keep it.

**Files:**
- Create: `skills/test-driven-development/SKILL.md.tmpl`
- Copy: `skills/test-driven-development/testing-anti-patterns.md`

- [ ] **Step 1: Write `skills/test-driven-development/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: test-driven-development
preamble-tier: 3
version: 1.0.0
description: |
  Red-Green-Refactor TDD workflow. Use when implementing any feature or
  bugfix, before writing implementation code. Iron law: NO production code
  without a failing test first.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---
```

Content structure — superpowers TDD core + gstack test patterns:

1. `{{PREAMBLE}}` (T3 — includes RepoMode + SearchBeforeBuilding)
2. **Test Framework Bootstrap** (NEW — from gstack's TEST_BOOTSTRAP pattern):
   - Read CLAUDE.md for test command
   - If missing: detect framework from project files (jest/vitest for package.json, pytest for pyproject.toml, cargo test for Cargo.toml, go test for go.mod)
   - If can't detect: AskUserQuestion and persist answer to CLAUDE.md
   - Never hardcode framework commands
3. **IRON LAW: No Production Code Without a Failing Test First** (from superpowers)
4. **The Cycle: RED → GREEN → REFACTOR** (from superpowers):
   - RED: Write failing test. Run it. Watch it fail. If it passes, the test is wrong.
   - GREEN: Write MINIMAL code to make the test pass. No more.
   - REFACTOR: Clean up while tests pass. Run tests after every change.
5. **What Makes a Good Test** (from superpowers): minimal, clear, shows intent
6. **Why Order Matters** (from superpowers): fail first proves the test tests something real
7. **Common Rationalizations** table (from superpowers): "I know what the code should be" → write the test first anyway
8. **Red Flags: Stop and Start Over** (from superpowers): tests always pass, tests test mocks, tests are copy-pasted
9. **Testing Anti-Patterns** — reference companion file `testing-anti-patterns.md`
10. **Coverage Awareness** (NEW — from gstack's TEST_COVERAGE_AUDIT pattern):
    - After implementation: check which code paths are covered
    - For solo repos: aim for coverage on new code, don't gate on existing
    - For collaborative repos: check project coverage standards in CLAUDE.md
11. **Verification Checklist** (from superpowers, enriched): every test fails first, every test tests real behavior, coverage on new code

- [ ] **Step 2: Copy companion file**

Copy `testing-anti-patterns.md` from superpowers as-is.

- [ ] **Step 3: Build and verify**

Run: `just build && just skill-check`

- [ ] **Step 4: Commit**

```bash
git add skills/test-driven-development/
git commit -m "add test-driven-development: TDD with test bootstrap + coverage

Red-Green-Refactor with iron law. Test framework bootstrap reads from
CLAUDE.md or detects from project files. Coverage awareness for new code.
Anti-patterns companion file from superpowers."
```

---

### Task 6: Rewrite `verification-before-completion` — align with gstack completion protocol

Superpowers' verification skill is good but needs alignment with gstack's DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT status protocol and evidence-before-assertions principle.

**Files:**
- Create: `skills/verification-before-completion/SKILL.md.tmpl`

- [ ] **Step 1: Write `skills/verification-before-completion/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: verification-before-completion
preamble-tier: 2
version: 1.0.0
description: |
  Verification gate before claiming work is complete, fixed, or passing.
  Use before committing or creating PRs. Iron law: NO completion claims
  without fresh verification evidence. Run command, read output, verify
  claim, then state result.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - AskUserQuestion
---
```

Content structure — superpowers core + gstack completion protocol:

1. `{{PREAMBLE}}` (T2)
2. **IRON LAW: No Completion Claims Without Fresh Verification Evidence** (from superpowers)
3. **The Verification Flow** (from superpowers):
   - Identify what proves the claim
   - RUN the verification command
   - READ the output (don't assume)
   - VERIFY the claim against the output
   - THEN state the result with evidence
4. **Status Protocol** (from gstack — aligned with preamble CompletionStatus):
   - DONE — all verified, evidence cited
   - DONE_WITH_CONCERNS — completed but flagging issues
   - BLOCKED — cannot complete, stating what's tried
   - NEEDS_CONTEXT — missing information
5. **Common Verification Failures** (from superpowers):
   - Tests pass ≠ linter clean
   - Build succeeds ≠ tests pass
   - One test passes ≠ all tests pass
   - Code compiles ≠ code works
6. **Red Flags** table (from superpowers): "I just ran this" → run it again
7. **Key Patterns** (from superpowers, enriched):
   - Tests: run the full suite, not just one test
   - Build: run the actual build command from CLAUDE.md
   - Requirements: check each requirement against evidence
   - Agent delegation: verify the agent's work yourself
   - **NEW: Diff verification** — `git diff` against base branch, verify all changes are intentional

- [ ] **Step 2: Build and verify**

Run: `just build && just skill-check`

- [ ] **Step 3: Commit**

```bash
git add skills/verification-before-completion/
git commit -m "add verification-before-completion: evidence before assertions

Iron law: no completion claims without fresh verification. Aligned with
gstack DONE/BLOCKED/NEEDS_CONTEXT status protocol. Diff verification
for unintentional changes."
```

---

### Task 7: Rewrite `requesting-code-review` + code-reviewer agent

gstack's `/review` is deep: two-pass (critical/informational), fix-first paradigm, scope drift detection, plan completion audit, test coverage diagram. Superpowers has the framework but lighter. Merge to gstack depth. Also create the code-reviewer agent definition.

**Files:**
- Create: `skills/requesting-code-review/SKILL.md.tmpl`
- Create: `skills/requesting-code-review/code-reviewer.md` (companion)
- Create: `agents/code-reviewer.md`

- [ ] **Step 1: Write `skills/requesting-code-review/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: requesting-code-review
preamble-tier: 3
version: 1.0.0
description: |
  Request and manage code reviews. Use when completing tasks, implementing
  major features, or before merging. Dispatches code-reviewer agent with
  two-pass review: CRITICAL first, then INFORMATIONAL. Fix-first paradigm.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---
```

Content structure — superpowers framework + gstack /review depth:

1. `{{PREAMBLE}}` (T3 — includes RepoMode + SearchBeforeBuilding)
2. `{{BASE_BRANCH_DETECT}}`
3. **When to Request Review** (from superpowers): after each task in subagent-driven, after major features, before merge
4. **Pre-Review Checklist** (NEW — from gstack /review):
   - Check branch (abort if on base branch)
   - Scope drift detection: did the implementation match what was planned?
   - Get diff: `git diff origin/<base>...HEAD`
5. **Two-Pass Review** (from gstack /review):
   - Pass 1 — CRITICAL: SQL injection, race conditions, LLM trust boundaries, auth bypass, data loss
   - Pass 2 — INFORMATIONAL: side effects, magic numbers, dead code, naming, documentation
6. **Fix-First Paradigm** (from gstack /review):
   - For each finding, classify: AUTO-FIX (safe to fix without asking) or ASK (needs discussion)
   - AUTO-FIX heuristic: single-file, no behavior change, naming/formatting/comments
   - ASK heuristic: multi-file, behavior change, design decision, breaking change
7. **Dispatching the Reviewer** (from superpowers):
   - Get BASE_SHA and HEAD_SHA
   - Dispatch code-reviewer agent with plan/requirements context
   - Act on feedback: Critical = must fix, Important = should fix, Minor = nice to have
8. **Review Report** — structured output with findings count, status, recommendations

- [ ] **Step 2: Write `skills/requesting-code-review/code-reviewer.md`**

Take from superpowers' `code-reviewer.md` companion. This is the prompt template for the code-reviewer agent. Keep the review dimensions:
- Code quality (separation of concerns, error handling, type safety, DRY, edge cases)
- Architecture (design, scalability, performance, security)
- Testing (real behavior vs mocks, edge cases, integration)
- Requirements (plan met, no scope creep, breaking changes documented)
- Production readiness

Enrich with gstack patterns:
- Two-pass structure (CRITICAL first, then INFORMATIONAL)
- Fix-First classification (AUTO-FIX vs ASK)
- Evidence-based: cite file:line for every finding
- Never say "likely" or "probably" — verify or flag as unknown

- [ ] **Step 3: Write `agents/code-reviewer.md`**

Agent definition (this is a Claude Code agent, not a skill):
```yaml
---
name: code-reviewer
description: |
  Use this agent when a major project step has been completed and needs
  to be reviewed against the original plan and coding standards.
model: inherit
---
```

Body: Take from superpowers' `agents/code-reviewer.md`. Keep the 6-point review framework. Enrich with the two-pass and fix-first patterns from gstack.

- [ ] **Step 4: Build and verify**

Run: `just build && just skill-check`

- [ ] **Step 5: Commit**

```bash
git add skills/requesting-code-review/ agents/code-reviewer.md
git commit -m "add requesting-code-review: two-pass review with fix-first

Aligned with gstack /review: scope drift detection, two-pass review
(CRITICAL then INFORMATIONAL), fix-first paradigm (AUTO-FIX vs ASK).
Code-reviewer agent definition for dispatching reviews."
```

---

### Task 8: Rewrite `finishing-a-development-branch` — align with gstack /ship patterns

gstack's `/ship` is massive (fully automated). We don't need that level yet. But we should bring superpowers' lighter version up to gstack quality with: base branch detection, test verification, version consideration, proper PR creation, and the non-interactive philosophy where possible.

**Files:**
- Create: `skills/finishing-a-development-branch/SKILL.md.tmpl`

- [ ] **Step 1: Write `skills/finishing-a-development-branch/SKILL.md.tmpl`**

Frontmatter:
```yaml
---
name: finishing-a-development-branch
preamble-tier: 3
version: 1.0.0
description: |
  Complete development work by presenting structured options for merge,
  PR, or cleanup. Use when implementation is complete and all tests pass.
  Guides the final steps: verify, choose integration method, execute.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---
```

Content structure — superpowers framework + gstack /ship patterns:

1. `{{PREAMBLE}}` (T3)
2. `{{BASE_BRANCH_DETECT}}`
3. **Step 1: Pre-flight Verification** (enriched from superpowers + gstack /ship Step 1):
   - Run tests (read test command from CLAUDE.md)
   - Check for uncommitted changes
   - Check branch is not base branch
   - `{{TEST_FAILURE_TRIAGE}}` — if tests fail, classify ownership
4. **Step 2: Detect Base Branch** — use BASE_BRANCH_DETECT output
5. **Step 3: Present Options** (from superpowers, enriched with Completeness scoring):
   Use AskUserQuestion:
   - A) Merge locally (`git merge` into base) — Completeness: 7/10
   - B) Push + create PR (recommended for collaborative repos) — Completeness: 9/10
   - C) Keep branch as-is (not ready to integrate) — Completeness: 5/10
   - D) Discard branch (abandoned work) — Completeness: N/A

   RECOMMENDATION: Choose B for collaborative repos, A for solo repos (based on REPO_MODE).
6. **Step 4: Execute Choice** (from superpowers, enriched):
   - For merge: merge into base, verify tests pass post-merge
   - For PR: push with `-u`, create PR using `gh pr create` with summary body
   - For keep: just confirm current state
   - For discard: confirm before deleting (destructive)
7. **Step 5: Cleanup** (from superpowers): remove worktree if applicable
8. **Quick Reference** table (from superpowers)

- [ ] **Step 2: Build and verify**

Run: `just build && just skill-check`

- [ ] **Step 3: Commit**

```bash
git add skills/finishing-a-development-branch/
git commit -m "add finishing-a-development-branch: guided branch integration

Pre-flight verification with test failure triage. AskUserQuestion with
Completeness scoring for merge/PR/keep/discard options. Adapts to
REPO_MODE (solo vs collaborative). Base branch auto-detection."
```

---

### Task 9: Regenerate all skills + full verification

Rebuild everything, run health check, verify all templates are fresh.

**Files:**
- Modified (regenerated): all `skills/*/SKILL.md`

- [ ] **Step 1: Rebuild all**

Run: `just build`
Expected: Generated lines for every skill

- [ ] **Step 2: Full health check**

Run: `just skill-check`
Expected: All green, exit 0

- [ ] **Step 3: Verify hook scripts are executable**

Run: `ls -la skills/careful/bin/check-careful.sh skills/freeze/bin/check-freeze.sh hooks/session-start`
Expected: All have `x` permission

- [ ] **Step 4: Verify tier gating across skills**

Run:
```bash
for f in skills/*/SKILL.md; do
  name=$(basename $(dirname $f))
  has_ask=$(grep -c "## AskUserQuestion Format" "$f" || true)
  has_repo=$(grep -c "## Repo Ownership" "$f" || true)
  tier=$(grep "preamble-tier:" "$f" | head -1 | grep -o '[0-9]')
  echo "$name (T$tier): AskUser=$has_ask Repo=$has_repo"
done
```

Expected:
- T1 skills (using-rkstack, careful, freeze, guard): AskUser=0, Repo=0
- T2 skills (systematic-debugging, writing-plans, verification): AskUser=1, Repo=0
- T3 skills (TDD, requesting-code-review, finishing-branch): AskUser=1, Repo=1

- [ ] **Step 5: Commit regenerated files**

```bash
git add skills/*/SKILL.md
git commit -m "regenerate all SKILL.md files with tiered preambles"
```
