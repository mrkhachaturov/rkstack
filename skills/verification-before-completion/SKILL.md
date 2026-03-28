---
name: verification-before-completion
preamble-tier: 2
version: 1.0.0
description: |
  Use before claiming work is complete, fixed, or passing. Use before
  committing or creating PRs. Use when about to say "done", "tests pass",
  or "it works".
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (verification-before-completion) ===

# Project detection via scc — single source of truth for languages AND frameworks
_SCC_OUT=$(scc --format wide --no-cocomo --exclude-dir 3rdparty-src . 2>/dev/null | head -15 || echo "scc not available")
echo "STACK:"
echo "$_SCC_OUT"

# Derive language frameworks from scc output (recursive, catches subdirs/submodules)
_HAS_TS=$( echo "$_SCC_OUT" | grep -qi "TypeScript"  && echo "yes" || echo "no")
_HAS_JS=$( echo "$_SCC_OUT" | grep -qi "JavaScript"  && echo "yes" || echo "no")
_HAS_PY=$( echo "$_SCC_OUT" | grep -qi "Python"      && echo "yes" || echo "no")
_HAS_GO=$( echo "$_SCC_OUT" | grep -qi "^Go "         && echo "yes" || echo "no")
_HAS_RS=$( echo "$_SCC_OUT" | grep -qi "Rust"         && echo "yes" || echo "no")
_HAS_JAVA=$(echo "$_SCC_OUT" | grep -qi "Java "       && echo "yes" || echo "no")
_HAS_CS=$( echo "$_SCC_OUT" | grep -qi "C#"           && echo "yes" || echo "no")
_HAS_RB=$( echo "$_SCC_OUT" | grep -qi "Ruby"         && echo "yes" || echo "no")
echo "LANGS: ts=$_HAS_TS js=$_HAS_JS py=$_HAS_PY go=$_HAS_GO rs=$_HAS_RS java=$_HAS_JAVA cs=$_HAS_CS rb=$_HAS_RB"

# Tooling hints (non-language markers — scc doesn't detect these)
_HAS_DOCKER=$(  [ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TF=$(      echo "$_SCC_OUT" | grep -qi "Terraform\|HCL" && echo "yes" || echo "no")
_HAS_ANSIBLE=$( echo "$_SCC_OUT" | grep -qi "Ansible\|YAML" && { [ -d ansible ] || [ -f ansible.cfg ] || find . -maxdepth 2 -name "*.yml" -path "*/playbooks/*" -print -quit 2>/dev/null | grep -q .; } && echo "yes" || echo "no")
_HAS_COMPOSE=$( [ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ] || [ -f compose.yaml ] && echo "yes" || echo "no")
_HAS_JUST=$(    [ -f justfile ] || [ -f Justfile ] && echo "yes" || echo "no")
_HAS_MISE=$(    [ -f .mise.toml ] || [ -f mise.toml ] && echo "yes" || echo "no")
echo "TOOLS: docker=$_HAS_DOCKER tf=$_HAS_TF ansible=$_HAS_ANSIBLE compose=$_HAS_COMPOSE just=$_HAS_JUST mise=$_HAS_MISE"

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
- **TypeScript/JavaScript** — web/fullstack project. Check for React/Vue/Svelte patterns.
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

```bash
# === rkstack bootstrap ===
RKSTACK_BIN="${CLAUDE_PLUGIN_DATA}/bin/rkstack"
WANT_VERSION=$(cat "${CLAUDE_PLUGIN_ROOT}/VERSION")
if [ ! -x "$RKSTACK_BIN" ] || [ "$("$RKSTACK_BIN" version 2>/dev/null)" != "$WANT_VERSION" ]; then
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  ASSET="rkstack-${OS}-${ARCH}"
  URL="https://github.com/mrkhachaturov/rkstack/releases/download/v${WANT_VERSION}/${ASSET}"
  mkdir -p "${CLAUDE_PLUGIN_DATA}/bin"
  FAIL_MARKER="${CLAUDE_PLUGIN_DATA}/bin/.download-failed"
  find "${CLAUDE_PLUGIN_DATA}/bin" -name ".download-failed" -mmin +60 -delete 2>/dev/null || true
  if [ -f "$FAIL_MARKER" ]; then
    echo "RKSTACK_BIN_UNAVAILABLE (download failed this session, will retry next session)"
  else
    TMPBIN="${RKSTACK_BIN}.tmp.$$"
    if curl --connect-timeout 5 --max-time 30 -fsSL "$URL" -o "$TMPBIN" 2>/dev/null \
       && chmod +x "$TMPBIN" \
       && [ "$("$TMPBIN" version 2>/dev/null)" = "$WANT_VERSION" ]; then
      mv -f "$TMPBIN" "$RKSTACK_BIN"
      rm -f "$FAIL_MARKER"
    else
      rm -f "$TMPBIN"
      touch "$FAIL_MARKER"
      echo "RKSTACK_BIN_UNAVAILABLE (download failed or platform ${OS}-${ARCH} not supported)"
    fi
  fi
fi
```

If `RKSTACK_BIN_UNAVAILABLE` is printed above, skills fall back to inline bash — no action needed.

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

# Verification Before Completion

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

---

## IRON LAW: No Completion Claims Without Fresh Verification Evidence

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command **in this session**, you cannot claim it passes. Previous runs, memory of past results, and assumptions do not count. Fresh means NOW.

---

## The Verification Flow

Every claim must pass through this gate. No exceptions.

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH the evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

**Where to find the right commands:** Read CLAUDE.md for project-specific test, build, and lint commands. If CLAUDE.md does not specify a command, ask the user. Never guess or hardcode framework commands.

---

## Status Protocol

Use the **Completion Status** protocol from the preamble above. Here is how each status maps to verification evidence:

- **DONE** requires: every claim backed by a command you ran AND output you read in THIS session. No claim without a receipt. If you ran tests, show the pass count. If you ran a build, show exit code 0. If you checked requirements, show each one verified.

- **DONE_WITH_CONCERNS** requires: all verifications passed, but you observed warnings, edge cases, deprecation notices, or things that need attention. List each concern with the evidence that surfaced it. Example: "Tests pass (47/47) but 3 deprecation warnings in test output."

- **BLOCKED** requires: you tried 3+ distinct approaches and none worked. Show what you tried and what happened each time. Do not say BLOCKED after one attempt.

- **NEEDS_CONTEXT** requires: you identified a specific piece of information the user must provide before you can verify. State exactly what you need and why you cannot determine it yourself.

**Status format:**

```
STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
EVIDENCE:
  - [claim]: [command ran] -> [output summary]
  - [claim]: [command ran] -> [output summary]
CONCERNS: (if DONE_WITH_CONCERNS)
  - [what you noticed and its impact]
```

---

## Common Verification Failures

These are NOT equivalent. Each requires its own verification.

| Claim | Requires | NOT Sufficient |
|-------|----------|----------------|
| "Tests pass" | Test command output: 0 failures | "Linter clean" |
| "Linter clean" | Linter output: 0 errors | "Tests pass" |
| "Build succeeds" | Build command: exit 0 | "Tests pass" or "linter clean" |
| "Bug fixed" | Test original symptom: passes | "Code changed, assumed fixed" |
| "One test passes" | That specific test output | "All tests pass" |
| "All tests pass" | Full suite output: 0 failures | "One test passes" |
| "Code compiles" | Compiler output: 0 errors | "Code looks correct" |
| "Code works" | Run the code, observe behavior | "Code compiles" |
| "It works now" | Fresh run in THIS session | "It worked before" |
| "Requirements met" | Line-by-line checklist verified | "Tests pass" |
| "Agent completed" | VCS diff shows correct changes | "Agent reports success" |

---

## Red Flags -- STOP Immediately

If you catch yourself thinking or about to say any of these, STOP and run verification first.

| What you're about to say | What to do instead |
|--------------------------|-------------------|
| "I just ran this" | Run it again. NOW. |
| "It should work" | Prove it. Run the command. |
| "I'm confident" | Confidence is not evidence. |
| "Looks correct" | Correctness requires proof. |
| "Tests passed earlier" | Earlier is not now. Run again. |
| "Just this once" | No exceptions. Ever. |
| "The linter passed, so..." | Linter is not compiler is not tests. |
| "The agent said it worked" | Verify the agent's claims yourself. |
| "Partial check is enough" | Partial proves nothing about the whole. |
| "I'm tired / let's wrap up" | Exhaustion is not an excuse. |
| "Different words so rule doesn't apply" | Spirit over letter. Always. |

**Also stop if you are about to:**
- Express satisfaction ("Great!", "Perfect!", "Done!") before verification
- Commit, push, or create a PR without verification
- Move to the next task without verifying the current one
- Delegate to an agent without verifying the agent's output

---

## Key Patterns

### Tests

Run the **full test suite**, not just the test you changed.

```
RUN:    [full test command from CLAUDE.md]
READ:   Count total, passed, failed, skipped
VERIFY: 0 failures, no skipped tests hiding problems
THEN:   "All tests pass (X/X)"
```

If the project uses TDD, verify the red-green cycle: test must FAIL without the fix and PASS with it. One direction is not enough.

### Build

Run the **actual build command**, not a related but different tool.

```
RUN:    [build command from CLAUDE.md]
READ:   Exit code, any warnings
VERIFY: Exit 0, no error output
THEN:   "Build succeeds (exit 0)"
```

### Lint

Linting is separate from building, which is separate from testing. Verify each independently.

```
RUN:    [lint command from CLAUDE.md]
READ:   Error count, warning count
VERIFY: 0 errors (warnings: report as DONE_WITH_CONCERNS if present)
THEN:   "Linter clean (0 errors, N warnings)"
```

### Requirements

Re-read the plan or spec. Create a checklist. Verify each item with specific evidence.

```
READ:   The plan/spec/requirements document
CREATE: A checklist of every requirement
VERIFY: Each requirement with a specific command or file read
THEN:   Report completion with per-requirement evidence
```

Any unchecked item means DONE_WITH_CONCERNS at best.

### Agent Delegation

Never trust an agent's self-report. Verify independently.

```
AFTER:  Agent reports success
RUN:    git diff to see what actually changed
READ:   Every changed file
VERIFY: Changes match what was requested, no unintended modifications
THEN:   Report based on YOUR verification, not the agent's claim
```

### Diff Verification

Before committing or creating a PR, review everything that changed.

```
RUN:    git diff [base-branch]...HEAD (or git diff --staged for uncommitted)
READ:   Every change in the diff
VERIFY: All changes are intentional. Look for:
  - Accidental debug code (console.log, print, debugger)
  - Temporary files or test artifacts
  - Commented-out code that should be removed
  - Unrelated changes that snuck in
  - Hardcoded values that should be configurable
THEN:   "Diff reviewed: N files changed, all changes intentional"
```

If anything looks wrong, fix it BEFORE claiming completion.

---

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
