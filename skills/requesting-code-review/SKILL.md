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
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (requesting-code-review) ===

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

After the two-pass review and fix-first handling, check test coverage for changed files.

1. Identify all files changed in the diff (`git diff origin/<base>...HEAD --name-only`).
2. For each changed source file, check if a corresponding test file exists. Use the project's test naming convention (read from CLAUDE.md if available, otherwise infer from existing test files).
3. For files with tests, scan the test file for coverage of the code paths changed in the diff. Flag code paths that have no test coverage.
4. If CLAUDE.md defines a `test:coverage` command (or equivalent), run it and report the results.
5. Output:
   ```
   Test Coverage: N changed files, M with tests, K with gaps
   [For each gap: file:line -- code path with no test coverage]
   ```

This is **INFORMATIONAL** -- test gaps are flagged as findings but do not block the review. They follow the same Fix-First flow (lean toward ASK since writing tests changes behavior contracts).

---

## Step 8: Adversarial Review

After fix-first handling, assume the code is wrong and try to break it. This is a deliberate red-team pass -- not a repeat of the two-pass review.

For each significant code change in the diff, ask:

1. **Input attacks:** What inputs cause failures? Empty strings, null values, negative numbers, Unicode edge cases, extremely long strings, special characters in paths. What happens if the input is valid but unexpected (e.g., a date in the year 2099)?

2. **Concurrency attacks:** What concurrent access patterns cause races? Two users hitting the same endpoint simultaneously. A background job running while a user request modifies the same data. A deploy happening mid-transaction.

3. **Failure path attacks:** What error paths are untested? Network timeouts, disk full, out-of-memory, permission denied. What happens when an external service returns garbage instead of an error code?

4. **State attacks:** What state transitions are invalid? Can the system reach a state the code doesn't handle? What if the database has stale data from a previous version?

5. **Boundary attacks:** What happens at zero, one, MAX_INT, empty collection, single-element collection? What about timestamps at midnight, month boundaries, DST transitions?

For each plausible attack vector found, add it as a finding:
- **If exploitable** (concrete scenario leads to data loss, crash, or security issue): CRITICAL finding, classified as ASK.
- **If theoretical** (plausible but requires unlikely conditions): INFORMATIONAL finding, include the scenario description.

**Do not invent impossible scenarios.** Every attack vector must be grounded in the actual code paths from the diff.

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
