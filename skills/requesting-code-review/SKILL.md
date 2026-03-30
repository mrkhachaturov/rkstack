---
name: requesting-code-review
preamble-tier: 4
version: 1.0.0
description: |
  Gate-quality pre-landing review. Dispatches code-reviewer agent with
  checklist-driven two-pass review (CRITICAL then INFORMATIONAL), adversarial
  analysis, test coverage audit, documentation staleness check, and TODOS
  cross-reference. Fix-first paradigm.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
announce-action: review the current branch
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (requesting-code-review) ===

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

## Repo Ownership

`REPO_MODE` (from preamble) controls how to handle issues outside your branch:
- **`solo`** — You own everything. Investigate and offer to fix proactively.
- **`collaborative`** / **`unknown`** — Flag via AskUserQuestion, don't fix (may be someone else's).

Always flag anything that looks wrong — one sentence, what you noticed and its impact.

## Search Before Building

Before building anything unfamiliar, **search first.**
- **Layer 1** (tried and true) — standard patterns, built-in to the runtime/framework. Don't reinvent.
- **Layer 2** (new and popular) — blog posts, trending approaches. Scrutinize — people follow hype.
- **Layer 3** (first principles) — your own reasoning about the specific problem. Prize above all.

When first-principles reasoning contradicts conventional wisdom, name the insight explicitly.

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

### Base Branch Detection

```bash
# Detect base branch — try platform tools first, fall back to git
_BASE=""

# GitHub
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  _BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || true)
fi

# GitLab
if [ -z "$_BASE" ] && command -v glab &>/dev/null; then
  _BASE=$(glab mr view --output json 2>/dev/null | grep -o '"target_branch":"[^"]*"' | cut -d'"' -f4 || true)
fi

# Plain git fallback
if [ -z "$_BASE" ]; then
  for _CANDIDATE in main master develop; do
    if git show-ref --verify --quiet "refs/heads/$_CANDIDATE" 2>/dev/null || \
       git show-ref --verify --quiet "refs/remotes/origin/$_CANDIDATE" 2>/dev/null; then
      _BASE="$_CANDIDATE"
      break
    fi
  done
fi

_BASE=${_BASE:-main}
echo "BASE_BRANCH: $_BASE"
```

Use `_BASE` (the value printed above) as the base branch for all diff operations. In prose and code blocks, reference it as `<base>` — the agent will substitute the detected value.

# Requesting Code Review

You are running the `/requesting-code-review` workflow. Dispatch a focused code-reviewer agent to catch structural issues that tests don't catch. The reviewer gets precisely crafted context — never your session's history.

**Announce at start:** "I'm using the requesting-code-review skill to review the current branch."

**Core principle:** Review early, review often. Fix first, ask second.

---

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing a major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing a complex bug

---

## Step 1: Check Branch

1. Run `git branch --show-current` to get the current branch.
2. If on the base branch, output: **"Nothing to review -- you're on the base branch or have no changes against it."** and stop.
3. Run `git fetch origin <base> --quiet && git diff origin/<base> --stat` to check if there's a diff. If no diff, output the same message and stop.

---

## Step 2: Scope Drift Detection

Before reviewing code quality, check: **did they build what was requested -- nothing more, nothing less?**

1. Read commit messages: `git log origin/<base>..HEAD --oneline`
2. Read plan file if it exists: look for `docs/rkstack/plans/*.md` referencing this feature. Read PR description: `gh pr view --json body --jq .body 2>/dev/null || true`.
   **If no PR exists:** rely on commit messages and plan files for stated intent -- this is the common case since review runs before a PR is created.
3. Identify the **stated intent** -- what was this branch supposed to accomplish?
4. Run `git diff origin/<base>...HEAD --stat` and compare the files changed against the stated intent.
5. Evaluate with skepticism:

   **SCOPE CREEP detection:**
   - Files changed that are unrelated to the stated intent
   - New features or refactors not mentioned in the plan
   - "While I was in there..." changes that expand blast radius

   **MISSING REQUIREMENTS detection:**
   - Requirements from plan/PR description not addressed in the diff
   - Test coverage gaps for stated requirements
   - Partial implementations (started but not finished)

6. Output (before the main review begins):
   ```
   Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
   Intent: <1-line summary of what was requested>
   Delivered: <1-line summary of what the diff actually does>
   [If drift: list each out-of-scope change]
   [If missing: list each unaddressed requirement]
   ```

7. This is **INFORMATIONAL** -- does not block the review. Proceed to Step 3 (checklist).

---

## Step 3: Read the Checklist

If `skills/requesting-code-review/checklist.md` exists in the RKstack plugin directory, read it before reviewing. The checklist provides review categories, severity classification, fix-first heuristics, and suppressions that the code-reviewer agent must follow.

**If the checklist cannot be read:** Proceed without it -- the code-reviewer.md already contains the core review categories. The checklist adds depth (crypto/entropy, time window safety, type coercion, distribution/CI) but is not a hard blocker.

---

## Step 4: Get the Diff

Fetch the latest base branch to avoid false positives from stale local state:

```bash
git fetch origin <base> --quiet
```

Get the full diff. This includes both committed and uncommitted changes against the latest base branch:

```bash
git diff origin/<base>...HEAD
```

Also get SHAs for the reviewer agent context:

```bash
BASE_SHA=$(git merge-base origin/<base> HEAD)
HEAD_SHA=$(git rev-parse HEAD)
echo "BASE_SHA: $BASE_SHA"
echo "HEAD_SHA: $HEAD_SHA"
```

---

## Web project review additions

If `flowType` is `web` (from detection cache) and the branch diff includes frontend files (`.tsx`, `.jsx`, `.css`, `.scss`, `.html`):

1. **Include screenshots.** Take screenshots of pages affected by the changes and include them in the review context. The code-reviewer agent sees both the diff and the visual result.

2. **Visual regression flag.** If a performance baseline exists (`.rkstack/benchmarks/baseline.json`), run `$RKSTACK_BROWSE perf` and compare. Flag any regressions in the review.

If `flowType` is not `web` or the branch doesn't touch frontend files, skip this section entirely.

---

## Step 5: Dispatch Code-Reviewer Agent

Use the Agent tool to dispatch the code-reviewer agent with the review context. Fill in the template from `requesting-code-review/code-reviewer.md`:

**Placeholders to fill:**
- `{WHAT_WAS_IMPLEMENTED}` -- Summary of what was built (from scope drift analysis)
- `{PLAN_OR_REQUIREMENTS}` -- The stated intent, plan file reference, or requirements
- `{BASE_SHA}` -- Starting commit SHA from Step 4
- `{HEAD_SHA}` -- Ending commit SHA from Step 4
- `{DESCRIPTION}` -- Brief summary of the changes
- `{SCOPE_CHECK_RESULT}` -- The scope check output from Step 2

The agent performs the two-pass review and returns structured findings. See `code-reviewer.md` for the full review framework.

---

## Step 6: Act on Feedback -- Fix-First Paradigm

**Every finding gets action -- not just critical ones.**

Output a summary header: `Pre-Landing Review: N issues (X critical, Y informational)`

### Step 6a: Classify each finding

For each finding from the reviewer, classify as AUTO-FIX or ASK:

**AUTO-FIX** (apply directly, no discussion):
- Single-file change
- No behavior change
- Naming, formatting, comments
- Obvious typos
- Missing null checks with clear intent
- Dead code removal

**ASK** (requires user approval):
- Multi-file change
- Behavior change
- Design decision
- Breaking change
- Ambiguous intent
- Security-related change

Critical findings lean toward ASK; informational findings lean toward AUTO-FIX.

### Step 6b: Auto-fix all AUTO-FIX items

Apply each fix directly. For each one, output a one-line summary:
`[AUTO-FIXED] [file:line] Problem -> what you did`

### Step 6c: Batch-ask about ASK items

If there are ASK items remaining, present them in ONE AskUserQuestion:

- List each item with a number, the severity label, the problem, and a recommended fix
- For each item, provide options: A) Fix as recommended, B) Skip
- Include an overall RECOMMENDATION

Example format:
```
I auto-fixed 5 issues. 2 need your input:

1. [CRITICAL] app/models/post.rb:42 -- Race condition in status transition
   Fix: Add `WHERE status = 'draft'` to the UPDATE
   -> A) Fix  B) Skip

2. [INFORMATIONAL] app/services/generator.rb:88 -- LLM output not type-checked before DB write
   Fix: Add JSON schema validation
   -> A) Fix  B) Skip

RECOMMENDATION: Fix both -- #1 is a real race condition, #2 prevents silent data corruption.
```

If 3 or fewer ASK items, you may use individual AskUserQuestion calls instead of batching.

### Step 6d: Apply user-approved fixes

Apply fixes for items where the user chose "Fix." Output what was fixed.

If no ASK items exist (everything was AUTO-FIX), skip the question entirely.

---

## Step 7: Test Coverage Audit

100% coverage is the goal. Evaluate every codepath changed in the diff and identify test gaps. Gaps become INFORMATIONAL findings that follow the Fix-First flow.

### Test Framework Detection

Before analyzing coverage, detect the project's test framework:

1. **Read CLAUDE.md** -- look for a `## Testing` section with test command and framework name. If found, use that as the authoritative source.
2. **If CLAUDE.md has no testing section, auto-detect:**

```bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
```

3. **If no framework detected:** still produce the coverage diagram, but skip test generation.

**Step 1. Trace every codepath changed** using `git diff origin/<base>...HEAD`:

Read every changed file. For each one, trace how data flows through the code -- don't just list functions, actually follow the execution:

1. **Read the diff.** For each changed file, read the full file (not just the diff hunk) to understand context.
2. **Trace data flow.** Starting from each entry point (route handler, exported function, event listener, component render), follow the data through every branch:
   - Where does input come from? (request params, props, database, API call)
   - What transforms it? (validation, mapping, computation)
   - Where does it go? (database write, API response, rendered output, side effect)
   - What can go wrong at each step? (null/undefined, invalid input, network failure, empty collection)
3. **Diagram the execution.** For each changed file, draw an ASCII diagram showing:
   - Every function/method that was added or modified
   - Every conditional branch (if/else, switch, ternary, guard clause, early return)
   - Every error path (try/catch, rescue, error boundary, fallback)
   - Every call to another function (trace into it -- does IT have untested branches?)
   - Every edge: what happens with null input? Empty array? Invalid type?

This is the critical step -- you're building a map of every line of code that can execute differently based on input. Every branch in this diagram needs a test.

**Step 2. Map user flows, interactions, and error states:**

Code coverage isn't enough -- you need to cover how real users interact with the changed code. For each changed feature, think through:

- **User flows:** What sequence of actions does a user take that touches this code? Map the full journey. Each step in the journey needs a test.
- **Interaction edge cases:** Double-click/rapid resubmit, navigate away mid-operation, submit with stale data, slow connection, concurrent actions
- **Error states the user can see:** For every error the code handles, what does the user actually experience? Can the user recover?
- **Empty/zero/boundary states:** What does the UI show with zero results? With 10,000 results? With maximum-length input?

Add these to your diagram alongside the code branches.

**Step 3. Check each branch against existing tests:**

Go through your diagram branch by branch -- both code paths AND user flows. For each one, search for a test that exercises it:
- Function `processPayment()` -> look for `billing.test.ts`, `billing.spec.ts`
- An if/else -> look for tests covering BOTH the true AND false path
- An error handler -> look for a test that triggers that specific error condition
- A user flow -> look for an integration or E2E test that walks through the journey

Quality scoring rubric:
- 3-star: Tests behavior with edge cases AND error paths
- 2-star: Tests correct behavior, happy path only
- 1-star: Smoke test / existence check / trivial assertion

### E2E Test Decision Matrix

**RECOMMEND E2E:**
- Common user flow spanning 3+ components/services
- Integration point where mocking hides real failures
- Auth/payment/data-destruction flows

**STICK WITH UNIT TESTS:**
- Pure function with clear inputs/outputs
- Internal helper with no side effects
- Edge case of a single function

### REGRESSION RULE (mandatory)

**IRON RULE:** When the coverage audit identifies a REGRESSION -- code that previously worked but the diff broke -- a regression test is written immediately. No AskUserQuestion. No skipping. Regressions are the highest-priority test because they prove something broke.

Format: commit as `test: regression test for {what broke}`

**Step 4. Output ASCII coverage diagram:**

```
CODE PATH COVERAGE
===========================
[+] src/services/billing.ts
    |
    +-- processPayment()
    |   +-- [3-star TESTED] Happy path + card declined + timeout -- billing.test.ts:42
    |   +-- [GAP]           Network timeout -- NO TEST
    |   +-- [GAP]           Invalid currency -- NO TEST
    |
    +-- refundPayment()
        +-- [2-star TESTED] Full refund -- billing.test.ts:89
        +-- [1-star TESTED] Partial refund (checks non-throw only) -- billing.test.ts:101

------------------------------
COVERAGE: 3/5 paths tested (60%)
QUALITY:  3-star: 1  2-star: 1  1-star: 1
GAPS: 2 paths need tests
------------------------------
```

**Fast path:** All paths covered -> "All new code paths have test coverage." Continue.

**Step 5. Generate tests for gaps (Fix-First):**

If test framework is detected and gaps were identified:
- Classify each gap as AUTO-FIX or ASK per the Fix-First Heuristic:
  - **AUTO-FIX:** Simple unit tests for pure functions, edge cases of existing tested functions
  - **ASK:** E2E tests, tests requiring new test infrastructure, tests for ambiguous behavior
- For AUTO-FIX gaps: generate the test, run it, commit as `test: coverage for {feature}`
- For ASK gaps: include in the Fix-First batch question with the other review findings

If no test framework detected -> include gaps as INFORMATIONAL findings only, no generation.

**Diff is test-only changes:** Skip entirely: "No new application code paths to audit."

### Coverage Warning

After producing the coverage diagram, check the coverage percentage. Read CLAUDE.md for a `## Test Coverage` section with a `Minimum:` field. If not found, use default: 60%.

If coverage is below the minimum threshold, output a prominent warning:

```
WARNING: COVERAGE WARNING: AI-assessed coverage is {X}%. {N} code paths untested.
Consider writing tests before running /finishing-a-development-branch.
```

This is INFORMATIONAL -- does not block the review. But it makes low coverage visible early.

---

## Step 8: Adversarial Review

## Adversarial Review (auto-scaled)

Adversarial review thoroughness scales automatically based on diff size.

**Detect diff size:**

```bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
echo "DIFF_SIZE: $DIFF_TOTAL"
```

**Auto-select tier based on diff size:**
- **Small (< 50 lines changed):** Skip adversarial review entirely. Print: "Small diff ($DIFF_TOTAL lines) -- adversarial review skipped." Continue.
- **Medium (50-199 lines changed):** Run Claude adversarial subagent.
- **Large (200+ lines changed):** Run Claude adversarial subagent with comprehensive scope.

**User override:** If the user explicitly requested a thorough or paranoid review, honor that regardless of diff size.

---

### Medium tier (50-199 lines)

Claude's structured review already ran. Now add a **cross-model adversarial challenge** via a fresh subagent.

**Claude adversarial subagent:**

Dispatch via the Agent tool. The subagent has fresh context -- no checklist bias from the structured review. This genuine independence catches things the primary reviewer is blind to.

Subagent prompt:
"Read the diff for this branch with `git diff origin/<base>`. Think like an attacker and a chaos engineer. Your job is to find ways this code will fail in production. Look for: edge cases, race conditions, security holes, resource leaks, failure modes, silent data corruption, logic errors that produce wrong results silently, error handling that swallows failures, and trust boundary violations. Be adversarial. Be thorough. No compliments -- just the problems. For each finding, classify as FIXABLE (you know how to fix it) or INVESTIGATE (needs human judgment)."

Present findings under an `ADVERSARIAL REVIEW (subagent):` header. **FIXABLE findings** flow into the same Fix-First pipeline as the structured review. **INVESTIGATE findings** are presented as informational.

If the subagent fails or times out: "Adversarial subagent unavailable. Continuing without adversarial review."

---

### Large tier (200+ lines)

Run the adversarial subagent with expanded scope:

1. **Claude adversarial subagent** (same prompt as medium tier)
2. **Architecture review subagent** -- dispatch a second subagent focused on structural issues:

"Read the diff for this branch with `git diff origin/<base>`. Focus on architecture and design: does the code introduce unnecessary coupling? Are abstractions at the right level? Are there circular dependencies? Is the error handling strategy consistent? Are there patterns that will be hard to extend or test? For each finding, cite file:line."

Present findings under `ADVERSARIAL REVIEW (architecture):` header.

---

### Synthesis (medium and large tiers)

After all passes complete, synthesize:

```
ADVERSARIAL REVIEW SYNTHESIS (TIER, N lines):
  High confidence (found by multiple sources): [findings agreed on by >1 pass]
  Unique to structured review: [from earlier step]
  Unique to adversarial: [from subagent]
  Unique to architecture: [from architecture subagent, if ran]
```

High-confidence findings (agreed on by multiple sources) should be prioritized for fixes.

---

## Step 8.5: Plan Completion Audit

### Plan File Discovery

1. **Conversation context (primary):** Check if there is an active plan file in this conversation. If found, use it directly.

2. **Content-based search (fallback):** If no plan file is referenced in conversation context, search by content:

```bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)")
# Search common plan file locations
for PLAN_DIR in "docs/rkstack/plans" "docs/plans" ".rkstack/plans"; do
  [ -d "$PLAN_DIR" ] || continue
  PLAN=$(ls -t "$PLAN_DIR"/*.md 2>/dev/null | xargs grep -l "$BRANCH" 2>/dev/null | head -1)
  [ -z "$PLAN" ] && PLAN=$(ls -t "$PLAN_DIR"/*.md 2>/dev/null | xargs grep -l "$REPO" 2>/dev/null | head -1)
  [ -z "$PLAN" ] && PLAN=$(find "$PLAN_DIR" -name '*.md' -mmin -1440 -maxdepth 1 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
  [ -n "$PLAN" ] && break
done
[ -n "$PLAN" ] && echo "PLAN_FILE: $PLAN" || echo "NO_PLAN_FILE"
```

3. **Validation:** If a plan file was found via content-based search, read the first 20 lines and verify it is relevant to the current branch's work. If it appears to be from a different project or feature, treat as "no plan file found."

**Error handling:**
- No plan file found -> skip with "No plan file detected -- skipping."
- Plan file found but unreadable -> skip with "Plan file found but unreadable -- skipping."

### Actionable Item Extraction

Read the plan file. Extract every actionable item -- anything that describes work to be done. Look for:

- **Checkbox items:** `- [ ] ...` or `- [x] ...`
- **Numbered steps** under implementation headings: "1. Create ...", "2. Add ...", "3. Modify ..."
- **Imperative statements:** "Add X to Y", "Create a Z service", "Modify the W controller"
- **File-level specifications:** "New file: path/to/file.ts", "Modify path/to/existing.rb"
- **Test requirements:** "Test that X", "Add test for Y", "Verify Z"

**Ignore:**
- Context/Background sections
- Questions and open items (marked with ?, "TBD", "TODO: decide")
- Explicitly deferred items ("Future:", "Out of scope:", "P2:", "P3:")

**Cap:** Extract at most 50 items. If the plan has more, note: "Showing top 50 of N plan items."

For each item, note:
- The item text (verbatim or concise summary)
- Its category: CODE | TEST | MIGRATION | CONFIG | DOCS

### Cross-Reference Against Diff

Run `git diff origin/<base>...HEAD` and `git log origin/<base>..HEAD --oneline` to understand what was implemented.

For each extracted plan item, check the diff and classify:

- **DONE** -- Clear evidence in the diff that this item was implemented. Cite the specific file(s) changed.
- **PARTIAL** -- Some work toward this item exists but it's incomplete.
- **NOT DONE** -- No evidence in the diff that this item was addressed.
- **CHANGED** -- Implemented using a different approach than the plan described, but the same goal is achieved.

**Be conservative with DONE** -- require clear evidence in the diff.
**Be generous with CHANGED** -- if the goal is met by different means, that counts.

### Output Format

```
PLAN COMPLETION AUDIT
===========================
Plan: {plan file path}

## Implementation Items
  [DONE]      Create UserService -- src/services/user_service.rb (+142 lines)
  [PARTIAL]   Add validation -- model validates but missing controller checks
  [NOT DONE]  Add caching layer -- no cache-related changes in diff
  [CHANGED]   "Redis queue" -> implemented with Sidekiq instead

## Test Items
  [DONE]      Unit tests for UserService -- test/services/user_service_test.rb
  [NOT DONE]  E2E test for signup flow

------------------------------
COMPLETION: 4/7 DONE, 1 PARTIAL, 1 NOT DONE, 1 CHANGED
------------------------------
```

### Integration with Scope Drift Detection

The plan completion results augment the existing Scope Drift Detection. If a plan file is found:

- **NOT DONE items** become additional evidence for **MISSING REQUIREMENTS** in the scope drift report.
- **Items in the diff that don't match any plan item** become evidence for **SCOPE CREEP** detection.

This is **INFORMATIONAL** -- does not block the review.

Update the scope drift output to include plan file context:

```
Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
Intent: <from plan file -- 1-line summary>
Plan: <plan file path>
Delivered: <1-line summary of what the diff actually does>
Plan items: N DONE, M PARTIAL, K NOT DONE
[If NOT DONE: list each missing item]
[If scope creep: list each out-of-scope change not in the plan]
```

**No plan file found:** Fall back to existing scope drift behavior (check TODOS.md and PR description only).

---

## Step 9: TODOS Cross-Reference

Read `TODOS.md` in the repository root (if it exists). Cross-reference the diff against open TODOs:

- **Does this branch close any open TODOs?** If yes, note which items: "This branch addresses TODO: <title>"
- **Does this branch create work that should become a TODO?** If yes, flag it as an INFORMATIONAL finding: "New deferred work detected that should be tracked in TODOS.md: <description>"
- **Are there related TODOs that provide context for this review?** If yes, reference them when discussing related findings.

If TODOS.md does not exist, skip this step silently.

---

## Step 10: Documentation Staleness Check

Cross-reference the diff against documentation files. For each `.md` file in the repo root (`README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `CLAUDE.md`, etc.):

1. Check if code changes in the diff affect features, components, or workflows described in that doc file.
2. If the doc file was NOT updated in this branch but the code it describes WAS changed, flag it as an INFORMATIONAL finding:
   ```
   Documentation may be stale: <file> describes <feature/component> but code changed in this branch.
   ```

This is informational only -- never critical. Skip silently if no documentation files exist.

---

## Step 11: Review Report

After all steps complete, output the final structured report:

```
## Review Summary

**Branch:** <current branch> -> <base branch>
**Scope:** [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
**Verdict:** [Ready to merge / Ready with fixes applied / Needs attention]

### Strengths
[What's well done -- be specific with file:line citations]

### Issues Found
[Total: N | Critical: X | Important: Y | Minor: Z]

#### Critical (Must Fix)
[Bugs, security issues, data loss risks -- with file:line]

#### Important (Should Fix)
[Architecture problems, missing error handling, test gaps -- with file:line]

#### Minor (Nice to Have)
[Code style, optimization opportunities, documentation -- with file:line]

### Adversarial Findings
[Attack vectors discovered in Step 8 -- with scenario and severity]

### Test Coverage
[Summary from Step 7 -- files with gaps, untested paths]

### TODOS
[Items from Step 9 -- closed TODOs, new deferred work]

### Documentation
[Stale docs from Step 10 -- files that need updates]

### Actions Taken
- [AUTO-FIXED] N items (list each)
- [USER-APPROVED] N items (list each)
- [SKIPPED] N items (list each)

### Assessment
**Ready to merge?** [Yes / No / With fixes]
**Reasoning:** [1-2 sentence technical assessment]
```

---

## Verification of Claims

Before producing the final review output:
- If you claim "this pattern is safe" -- cite the specific line proving safety
- If you claim "this is handled elsewhere" -- read and cite the handling code
- If you claim "tests cover this" -- name the test file and method
- Never say "likely handled" or "probably tested" -- verify or flag as unknown

**Rationalization prevention:** "This looks fine" is not a finding. Either cite evidence it IS fine, or flag it as unverified.

---

## Important Rules

- **Read the FULL diff before commenting.** Do not flag issues already addressed in the diff.
- **Fix-first, not read-only.** AUTO-FIX items are applied directly. ASK items are only applied after user approval. Never commit, push, or create PRs -- that is the user's job.
- **Be terse.** One line problem, one line fix. No preamble.
- **Only flag real problems.** Skip anything that's fine.
- **Cite file:line for every finding.** Never give vague feedback like "improve error handling."
- **Two passes always.** CRITICAL first (blockers), then INFORMATIONAL (improvements). Never mix severity levels.
- **Adversarial review is a separate pass.** Do not mix adversarial findings into the two-pass review. They go in Step 8 after fix-first handling.

---

## After Review

Suggest the next workflow step:

> "Review complete. When ready to ship, use **finishing-a-development-branch** to merge or create a PR."
