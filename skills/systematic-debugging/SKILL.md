---
name: systematic-debugging
preamble-tier: 2
version: 1.0.0
description: |
  Use when encountering any bug, test failure, or unexpected behavior.
  Use before proposing fixes. Use when asked to debug, investigate,
  find root cause, or figure out why something is broken.
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
          command: "bash ${CLAUDE_PLUGIN_ROOT}/skills/freeze/bin/check-freeze.sh"
          statusMessage: "Checking debug scope boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_PLUGIN_ROOT}/skills/freeze/bin/check-freeze.sh"
          statusMessage: "Checking debug scope boundary..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (systematic-debugging) ===

# Project detection via scc (respects .gitignore, also skip 3rdparty-src)
_TOP_LANGS=$(scc --format wide --no-cocomo --exclude-dir 3rdparty-src . 2>/dev/null | head -8 || echo "scc not available")
echo "STACK:"
echo "$_TOP_LANGS"

# Framework hints
_HAS_PACKAGE_JSON=$([ -f package.json ] && echo "yes" || echo "no")
_HAS_CARGO_TOML=$([ -f Cargo.toml ] && echo "yes" || echo "no")
_HAS_GO_MOD=$([ -f go.mod ] && echo "yes" || echo "no")
_HAS_PYPROJECT=$([ -f pyproject.toml ] && echo "yes" || echo "no")
_HAS_DOCKERFILE=$([ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TERRAFORM=$(find . -maxdepth 2 -name "*.tf" -print -quit 2>/dev/null | grep -q . && echo "yes" || echo "no")
_HAS_ANSIBLE=$([ -d ansible ] || [ -f ansible.cfg ] && echo "yes" || echo "no")
_HAS_COMPOSE=$([ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ] || [ -f compose.yaml ] && echo "yes" || echo "no")
_HAS_JUSTFILE=$([ -f justfile ] || [ -f Justfile ] && echo "yes" || echo "no")
_HAS_MISE=$([ -f .mise.toml ] || [ -f mise.toml ] && echo "yes" || echo "no")
echo "FRAMEWORKS: pkg=$_HAS_PACKAGE_JSON cargo=$_HAS_CARGO_TOML go=$_HAS_GO_MOD py=$_HAS_PYPROJECT docker=$_HAS_DOCKERFILE tf=$_HAS_TERRAFORM ansible=$_HAS_ANSIBLE compose=$_HAS_COMPOSE just=$_HAS_JUSTFILE mise=$_HAS_MISE"

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

Use the preamble output to adapt your behavior:
- **TypeScript/JavaScript + package.json** — web/fullstack project. Check for React/Vue/Svelte patterns.
- **Python + pyproject.toml** — backend/ML. Check PEP8 conventions.
- **Rust + Cargo.toml** — systems. Check ownership patterns.
- **Go + go.mod** — backend/infra. Check error handling patterns.
- **Dockerfile + Terraform** — infrastructure. Extra caution with state, plan before apply.
- **Ansible** — configuration management. Check inventory structure, role conventions, vault usage.
- **Docker Compose** — multi-container app. Check service dependencies, .env patterns, volume mounts.
- **justfile** — task runner present. Use `just` commands instead of raw shell where available.
- **mise** — tool version manager. Versions are pinned — don't suggest global installs.
- **CLAUDE.md exists** — read it for project-specific commands and conventions.

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

# Systematic Debugging

## Iron Law

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Fixing symptoms creates whack-a-mole debugging. Every fix that doesn't address root cause makes the next bug harder to find. Random fixes waste time and create new bugs. Quick patches mask underlying issues.

If you haven't completed Phase 1, you cannot propose fixes. This is not optional. This is not flexible. Violating the letter of this process is violating the spirit of debugging.

---

## When to Use

Use for ANY technical issue:
- Test failures, bugs in production, unexpected behavior
- Performance problems, build failures, integration issues
- CI/CD pipeline failures, deployment issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes without success
- Previous fix didn't work or introduced new issues

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (systematic is faster than thrashing)
- Manager wants it fixed NOW (process prevents rework)

---

## Phase 1: Root Cause Investigation

Gather context before forming any hypothesis. No guessing. No fixing. Just evidence.

### Step 1: Collect Symptoms

Read the error messages, stack traces, and reproduction steps completely. Don't skip past warnings. They often contain the exact answer.

Note:
- Line numbers, file paths, error codes
- The full stack trace (not just the top frame)
- Any warnings that preceded the error

If the user hasn't provided enough context, ask ONE question at a time via AskUserQuestion:
```
I need more context about this bug before I can investigate.

RECOMMENDATION: Choose A — the reproduction steps will help me find the root cause faster.
A) Describe the exact steps to reproduce — what did you do, what happened, what did you expect?
B) Paste the full error output / stack trace
C) Point me to the relevant file or test
```

### Step 2: Read the Actual Code

Trace the code path from the symptom back to potential causes. Use Grep to find all references. Use Read to understand the logic. Do NOT skim — read every line in the critical path.

For multi-component systems (API -> service -> database, CI -> build -> signing), trace data across EVERY boundary:
```
For EACH component boundary:
  - What data enters the component?
  - What data exits the component?
  - Is environment/config propagating correctly?
  - What is the state at each layer?
```

### Step 3: Check Recent Changes

```bash
# What changed recently in the affected files?
git log --oneline -20 -- <affected-files>

# Full diff of recent changes
git diff HEAD~5 -- <affected-files>
```

Was this working before? What changed? A regression means the root cause is in the diff. Check:
- Recent commits touching affected files
- New dependencies or version bumps
- Configuration changes
- Environmental differences (works locally, fails in CI)

### Step 4: Reproduce the Bug

Can you trigger the bug deterministically? If not, gather MORE evidence before proceeding. Do not guess.

```bash
# Run the specific failing test
<test-command> <specific-test-file>

# Or reproduce the specific scenario
<reproduction-steps>
```

If the bug is intermittent, add instrumentation to capture state on the NEXT occurrence rather than guessing at the cause.

### Step 5: Trace Across Boundaries

**For multi-component systems only.** Add diagnostic instrumentation at each layer boundary:

```bash
# Example: tracing through a multi-layer system
# Layer 1: Entry point
echo "=== Input at entry: ==="
echo "PARAM_A: ${PARAM_A:-UNSET}"

# Layer 2: Processing
echo "=== State after processing: ==="
echo "RESULT: ${RESULT:-UNSET}"

# Layer 3: Output
echo "=== Final output: ==="
echo "OUTPUT: ${OUTPUT:-UNSET}"
```

This reveals WHICH layer fails (entry -> processing OK, processing -> output FAILS).

See `root-cause-tracing.md` in this directory for the complete backward tracing technique — trace from symptom up through the call chain to the original trigger.

### Output

**"Root cause hypothesis: ..."** — a specific, testable claim about what is wrong and why. Not "something is wrong with auth" but "the JWT token is not refreshed when the session cookie expires because `refreshToken()` only checks `localStorage`, not the HTTP-only cookie."

---

## Scope Lock

After forming your root cause hypothesis, lock edits to the affected module to prevent scope creep. Debug sessions that touch unrelated code create more bugs than they fix.

```bash
[ -x "${CLAUDE_PLUGIN_ROOT}/skills/freeze/bin/check-freeze.sh" ] && echo "FREEZE_AVAILABLE" || echo "FREEZE_UNAVAILABLE"
```

**If FREEZE_AVAILABLE:** Identify the narrowest directory containing the affected files. Write it to the freeze state file:

```bash
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.rkstack}"
mkdir -p "$STATE_DIR"
echo "<detected-directory>/" > "$STATE_DIR/freeze-dir.txt"
echo "Debug scope locked to: <detected-directory>/"
```

Substitute `<detected-directory>` with the actual directory path (e.g., `src/auth/`). Tell the user: "Edits restricted to `<dir>/` for this debug session. This prevents changes to unrelated code. Run `/unfreeze` to remove the restriction."

If the bug spans the entire repo or the scope is genuinely unclear, skip the lock and note why.

**If FREEZE_UNAVAILABLE:** Skip scope lock. Edits are unrestricted.

---

## Phase 2: Pattern Analysis

Check if this bug matches a known pattern before forming your hypothesis:

| Pattern | Signature | Where to look |
|---------|-----------|---------------|
| Race condition | Intermittent, timing-dependent | Concurrent access to shared state |
| Nil/null propagation | NoMethodError, TypeError, undefined | Missing guards on optional values |
| State corruption | Inconsistent data, partial updates | Transactions, callbacks, hooks |
| Integration failure | Timeout, unexpected response | External API calls, service boundaries |
| Configuration drift | Works locally, fails in staging/prod | Env vars, feature flags, DB state |
| Stale cache | Shows old data, fixes on cache clear | Redis, CDN, browser cache, Turbo |

### Find Working Examples

1. Locate similar **working** code in the same codebase — what works that's similar to what's broken?
2. If implementing a pattern, read the reference implementation COMPLETELY. Don't skim — read every line.
3. Compare against the broken code. List every difference, however small. Don't assume "that can't matter."
4. Understand dependencies: what other components does this need? What config? What assumptions?

### Check Prior Art

- Check `TODOS.md` (if it exists) for related known issues
- `git log` for prior fixes in the same area — **recurring bugs in the same files are an architectural smell**, not a coincidence

### External Pattern Search

If the bug doesn't match a known pattern above, use WebSearch for:
- "{framework} {generic error type}" — **sanitize first:** strip hostnames, IPs, file paths, SQL, customer data. Search the error category, not the raw message.
- "{library} {component} known issues"

If WebSearch is unavailable, skip this search and proceed with hypothesis testing. If a documented solution or known dependency bug surfaces, present it as a candidate hypothesis in Phase 3.

---

## Phase 3: Hypothesis Testing

Before writing ANY fix, verify your hypothesis. Scientific method — one variable at a time.

### Step 1: Form a Single Hypothesis

State it clearly and specifically:
- "I think X is the root cause because Y"
- Write it down explicitly in your response
- Be specific, not vague — "the connection pool exhausts because `maxConnections` defaults to 5 but the request handler opens a new connection per middleware layer" not "something wrong with connections"

### Step 2: Add Debug Output (NOT a Fix)

Add a temporary log statement, assertion, or debug output at the suspected root cause. Run the reproduction. Does the evidence match your hypothesis?

```bash
# Add temporary instrumentation — NOT a fix
# Example: log the value at the suspected point of failure
```

### Step 3: Evaluate the Result

1. **If the hypothesis is confirmed:** Proceed to Phase 4 (Implementation).
2. **If the hypothesis is wrong:** Before forming the next hypothesis, consider searching for the error.

   **Sanitize first** — strip hostnames, IPs, file paths, SQL fragments, customer identifiers, and any internal/proprietary data from the error message. Search only the generic error type and framework context: "{component} {sanitized error type} {framework version}".

   If the error message is too specific to sanitize safely, skip the search. If WebSearch is unavailable, skip and proceed.

   Then return to Phase 1. Gather more evidence. Do not guess.

### 3-Strike Rule

**If 3 hypotheses fail, STOP.** This is non-negotiable. Use AskUserQuestion:

```
3 hypotheses tested, none confirmed. This may be an architectural issue
rather than a simple bug.

Hypotheses tested:
1. [hypothesis] — [evidence that disproved it]
2. [hypothesis] — [evidence that disproved it]
3. [hypothesis] — [evidence that disproved it]

RECOMMENDATION: Choose B — 3 failed hypotheses suggests this needs someone
who knows the system architecture. Completeness: 9/10.
A) Continue investigating — I have a new hypothesis: [describe] — Completeness: 7/10
B) Escalate for human review — this needs someone who knows the system — Completeness: 9/10
C) Add logging and wait — instrument the area and catch it next time — Completeness: 5/10
```

### Red Flags — STOP and Return to Phase 1

If you catch yourself thinking any of these, you are guessing, not debugging:

- **"Quick fix for now"** — there is no "for now." Fix it right or escalate.
- **Proposing a fix before tracing data flow** — you're guessing.
- **Each fix reveals a new problem elsewhere** — wrong layer, not wrong code. This is an architecture problem.
- **"Just try changing X and see if it works"** — that's not debugging, that's gambling.
- **"I don't fully understand but this might work"** — stop. Understand first.
- **"One more fix attempt" (when already tried 2+)** — see 3-Strike Rule above.
- **Proposing solutions before tracing data flow** — return to Phase 1.

---

## Phase 4: Implementation

Once root cause is confirmed with evidence — not guessed, not assumed, CONFIRMED:

### Step 1: Fix the Root Cause, Not the Symptom

The smallest change that eliminates the actual problem. Not a workaround. Not a guard that catches the symptom downstream. The root cause.

See `root-cause-tracing.md` in this directory — trace backward through the call chain until you find the original trigger. Fix at the source. Never fix just where the error appears.

### Step 2: Minimal Diff

Fewest files touched, fewest lines changed. Resist the urge to refactor adjacent code. No "while I'm here" improvements. No bundled refactoring. This is a bug fix, not a cleanup session.

### Step 3: Write a Regression Test FIRST

Before applying the fix, write a test that:
- **Fails** without the fix (proves the test is meaningful)
- **Passes** with the fix (proves the fix works)

```bash
# Run the new test — it should FAIL before the fix
<test-command> <new-test-file>
```

This is TDD applied to debugging. The failing test IS your proof that you understand the bug.

### Step 4: Apply Defense-in-Depth

After fixing the root cause, consider adding validation at multiple layers. See `defense-in-depth.md` in this directory for the four-layer pattern:

1. **Entry point validation** — reject invalid input at API boundary
2. **Business logic validation** — ensure data makes sense for this operation
3. **Environment guards** — prevent dangerous operations in specific contexts
4. **Debug instrumentation** — capture context for forensics

Don't stop at one validation point. Make the bug structurally impossible, not just fixed.

### Step 5: Run the Full Test Suite

```bash
# Run ALL tests, not just the one you wrote
<full-test-command>
```

Paste the output. No regressions allowed. If other tests break, your fix is wrong or incomplete — return to Phase 1 with the new evidence.

### Large Diff Gate

**If the fix touches >5 files,** use AskUserQuestion before proceeding:

```
This fix touches N files. That's a large blast radius for a bug fix.

Files affected:
- file1.ts (root cause fix)
- file2.ts (defense-in-depth validation)
- ...

RECOMMENDATION: Choose A if the root cause genuinely spans these files.
Completeness: 9/10.
A) Proceed — the root cause genuinely spans these files — Completeness: 9/10
B) Split — fix the critical path now, defer defense-in-depth — Completeness: 7/10
C) Rethink — maybe there's a more targeted approach — Completeness: 5/10
```

---

## Phase 5: Verification & Report

### Fresh Verification

Reproduce the original bug scenario and confirm it's fixed. This is not optional. Do not skip this. Do not say "this should fix it." Verify and prove it.

```bash
# Reproduce the original failure scenario — it should now succeed
<reproduction-command>

# Run the full test suite
<full-test-command>
```

Paste the output.

### Structured Debug Report

Output a structured report:

```
DEBUG REPORT
════════════════════════════════════════
Symptom:         [what the user observed]
Root cause:      [what was actually wrong — specific, technical]
Fix:             [what was changed, with file:line references]
Evidence:        [test output, reproduction attempt showing fix works]
Regression test: [file:line of the new test]
Defense layers:  [any defense-in-depth validations added]
Related:         [TODOS.md items, prior bugs in same area, architectural notes]
Status:          DONE | DONE_WITH_CONCERNS | BLOCKED
════════════════════════════════════════
```

### Status Definitions

- **DONE** — Root cause found, fix applied, regression test written, all tests pass. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Fixed but cannot fully verify (e.g., intermittent bug, requires staging, timing-dependent). List each concern.
- **BLOCKED** — Root cause unclear after investigation, escalated via 3-Strike Rule. State what was tried and what the user should do next.

---

## Important Rules

- **3+ failed fix attempts -> STOP and question the architecture.** This is a wrong architecture, not a failed hypothesis. Do NOT attempt fix #4 without human discussion.
- **Never apply a fix you cannot verify.** If you can't reproduce and confirm, don't ship it.
- **Never say "this should fix it."** Verify and prove it. Run the tests. Paste the output.
- **If fix touches >5 files -> AskUserQuestion** about blast radius before proceeding.
- **Never fix multiple things at once.** One variable at a time. Can't isolate what worked otherwise.
- **Each fix that reveals a new problem in a different place** means wrong architecture, not wrong code. STOP.

---

## Supporting Techniques

These companion files are part of systematic debugging and available in this directory:

- **`root-cause-tracing.md`** — Trace bugs backward through the call chain to find the original trigger. Covers the 5-step backward tracing process, adding stack traces for instrumentation, and finding which test causes pollution.
- **`defense-in-depth.md`** — Add validation at multiple layers (entry, business logic, environment, debug) after finding root cause. Make the bug structurally impossible, not just fixed.

**Related skills:**
- **test-driven-development** — For writing the failing regression test (Phase 4, Step 3)
- **verification-before-completion** — Verify fix worked before claiming success
