---
name: finishing-a-development-branch
preamble-tier: 4
version: 2.0.0
description: |
  Use when implementation is complete and ready to merge, create PR, or
  clean up a branch. Use when asked to ship, merge, land, or finish.
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
# === RKstack Preamble (finishing-a-development-branch) ===

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
- **TypeScript/JavaScript** — see PROJECT_TYPE in session context (web or node). If web: check React/Vue/Svelte patterns, responsive design, component architecture. If node: CLI tools, MCP servers, backend scripts.
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

# Finishing a Development Branch

Guide completion of development work by presenting clear options and handling the chosen workflow.

**Core principle:** Merge base -> Verify tests -> Present options -> Execute choice -> Clean up.

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

---

## Step 1: Pre-flight Verification

Before presenting options, verify the branch is ready to integrate.

### 1.1 Check branch safety

```bash
_CURRENT=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "CURRENT_BRANCH: $_CURRENT"
```

If the current branch equals `<base>` (the detected base branch), **STOP**: "You're on the base branch. Switch to a feature branch first."

### 1.2 Check for uncommitted changes

```bash
git status --short
```

If there are uncommitted changes, present them and use AskUserQuestion:

> **Re-ground:** On branch `<branch>` with uncommitted changes.
>
> **Simplify:** You have changes that aren't committed yet. They need to be handled before integrating.
>
> **RECOMMENDATION:** Choose A to include everything. Completeness: 9/10.
>
> A) Commit all changes now (recommended) -- Completeness: 9/10
> B) Stash changes -- keep them separate from this branch -- Completeness: 7/10
> C) Discard uncommitted changes -- Completeness: 5/10

### 1.3 Merge base branch into feature branch (BEFORE tests)

Fetch and merge the base branch so tests run against the merged state — not just the feature branch in isolation:

```bash
git fetch origin <base> && git merge origin/<base> --no-edit
```

**If already up to date:** Continue silently.

**If there are merge conflicts:**
- Simple conflicts (whitespace, import ordering, lock files): auto-resolve and commit.
- Complex or ambiguous conflicts: **STOP** and use AskUserQuestion:

> **Re-ground:** Merging `<base>` into `<branch>` produced conflicts in <N> files.
>
> **Simplify:** The base branch has changes that overlap with your work. Some conflicts need your judgment to resolve correctly.
>
> **RECOMMENDATION:** Choose A to resolve together. Completeness: 9/10.
>
> A) Show conflicts and resolve together (recommended) -- Completeness: 9/10
> B) Abort merge and keep branch as-is -- Completeness: 5/10

### 1.4 Run tests (on merged code)

Read the test command from CLAUDE.md (look for a `## Testing` section). If no test command is configured, auto-detect the project's test framework:

```bash
# Check CLAUDE.md for test command
grep -A 3 "^## Testing" CLAUDE.md 2>/dev/null | head -5
# Detect test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini setup.py Cargo.toml go.mod 2>/dev/null
ls package.json Gemfile pyproject.toml 2>/dev/null
```

Run the detected test command. **Never hardcode** `npm test` or `cargo test` -- use whatever the project uses.

**If tests fail:** Do NOT immediately stop. Apply the Test Failure Ownership Triage:

## Test Failure Ownership Triage

When tests fail, do NOT immediately stop. First, determine ownership:

### Step T1: Classify each failure

For each failing test:

1. **Get the files changed on this branch:**
   ```bash
   git diff origin/<base>...HEAD --name-only
   ```

2. **Classify the failure:**
   - **In-branch** if: the failing test file itself was modified on this branch, OR the test output references code that was changed on this branch, OR you can trace the failure to a change in the branch diff.
   - **Likely pre-existing** if: neither the test file nor the code it tests was modified on this branch, AND the failure is unrelated to any branch change you can identify.
   - **When ambiguous, default to in-branch.** It is safer to stop the developer than to let a broken test ship.

### Step T2: Handle in-branch failures

**STOP.** These are your failures. Show them and do not proceed.

### Step T3: Handle pre-existing failures

Check `REPO_MODE` from the preamble output.

**If REPO_MODE is `solo`:**

Use AskUserQuestion:
> These test failures appear pre-existing (not caused by your branch changes):
> [list each failure with file:line and brief error description]
>
> RECOMMENDATION: Choose A — fix now while the context is fresh. Completeness: 9/10.
> A) Investigate and fix now (human: ~2-4h / CC: ~15min) — Completeness: 10/10
> B) Add as TODO — fix after this branch lands — Completeness: 7/10
> C) Skip — I know about this, ship anyway — Completeness: 3/10

**If REPO_MODE is `collaborative` or `unknown`:**

Use AskUserQuestion:
> These test failures appear pre-existing (not caused by your branch changes):
> [list each failure with file:line and brief error description]
>
> RECOMMENDATION: Choose B — assign it to whoever broke it. Completeness: 9/10.
> A) Investigate and fix now anyway — Completeness: 10/10
> B) Blame + assign issue to the author — Completeness: 9/10
> C) Add as TODO — Completeness: 7/10
> D) Skip — ship anyway — Completeness: 3/10

### Step T4: Execute the chosen action

- **Fix now:** Switch to debugging mindset. Fix, commit separately, continue.
- **TODO:** Add to TODOS.md with title, error, branch, priority P0.
- **Blame + assign:** `git log --format="%an" -1 -- <file>` → create issue assigned to author.
- **Skip:** Continue. Note "Pre-existing test failure skipped: <test-name>".

**After triage:** If any in-branch failures remain unfixed, **STOP**. Do not proceed to Step 2. If all failures were pre-existing and handled (fixed, TODOed, assigned, or skipped), continue.

**If all tests pass:** Continue to Step 1.5.

### 1.5 Gather branch summary

```bash
# Commit count on this branch
git log <base>..HEAD --oneline | wc -l | tr -d ' '

# Files changed
git diff <base>...HEAD --stat

# Commits on this branch
git log <base>..HEAD --oneline
```

Note the commit count, files changed count, and insertions/deletions for use in the options presentation.

---

## Step 2: Detect Base Branch

Use `_BASE` from the Base Branch Detection output above. Verify it is correct:

```bash
echo "Base branch: $_BASE"
git log --oneline $_BASE..HEAD | head -5
```

If the base branch looks wrong (e.g., zero commits diverged), use AskUserQuestion to confirm:

> **Re-ground:** Detected `<base>` as your base branch, but this branch shows 0 commits ahead.
>
> **Simplify:** I need to know which branch you want to integrate into.
>
> **RECOMMENDATION:** Confirm or correct the base branch.
>
> A) Use `<base>` as detected
> B) Use a different branch (specify)

---

## Step 3: Present Options

Use AskUserQuestion with the full format (re-ground, simplify, recommend, options):

> **Re-ground:** Working on branch `<branch>` in project `<project>`. <N> commits, <M> files changed since `<base>`.
>
> **Simplify:** Your implementation is ready. How do you want to integrate it?
>
> **RECOMMENDATION:** Choose B for collaborative repos (creates a review trail), A for solo repos (faster). Completeness: 9/10.
>
> A) Merge locally -- `git merge` into `<base>`, push directly. Fast, no review trail. Completeness: 7/10
> B) Push + create PR (recommended for collaborative) -- push branch, create PR with summary. Completeness: 9/10
> C) Keep branch as-is -- not ready to integrate yet. Completeness: 5/10
> D) Discard branch -- abandon this work. Completeness: N/A

Check `REPO_MODE` from the preamble:
- **`solo`**: Recommend A (merge locally) -- faster, no review overhead.
- **`collaborative`** or **`unknown`**: Recommend B (push + PR) -- creates review trail.

---

## Step 4: Execute Choice

### Option A: Merge Locally

1. Check commit history for bisectability (see Step 4.5 below).

2. Switch to base branch and merge:
   ```bash
   git checkout <base>
   git pull origin <base>
   git merge <branch> --no-edit
   ```

3. Verify tests pass on the merged result. Use the same test command from Step 1.4. If tests fail, **STOP** -- do not push broken code.

4. Update CHANGELOG and TODOS (see Steps 4.6 and 4.7 below).

5. Push:
   ```bash
   git push origin <base>
   ```

6. Continue to Step 5 (Cleanup).

### Option B: Push + Create PR

1. Check commit history for bisectability (see Step 4.5 below).

2. Update CHANGELOG (see Step 4.6 below).

3. Update TODOS.md (see Step 4.7 below).

4. Run the Verification Gate (see Step 4.8 below).

5. Push the branch with upstream tracking:
   ```bash
   git push -u origin <branch>
   ```

6. Create a PR using `gh pr create` with a rich body:

   ```bash
   gh pr create --base <base> --title "<type>: <summary>" --body "$(cat <<'EOF'
   ## Summary
   <bullet points of what changed -- infer from commits and diff>

   ## Test Results
   <test suite name>: <N> tests passed, 0 failures

   ## Files Changed
   <output of git diff <base>...HEAD --stat, summarized>

   ## TODOS Completed
   <list of TODO items completed by this branch, or "None">

   Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

   For the title, use conventional commit format: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` based on the nature of the changes.

   For the Summary section, use `git log <base>..HEAD --oneline` and `git diff <base>...HEAD --stat` to write concise bullet points describing what changed.

   For the Test Results section, include the test command used and its pass/fail counts from Step 1.4.

   For the Files Changed section, summarize `git diff <base>...HEAD --stat` (total files, insertions, deletions).

   For the TODOS Completed section, include any items marked done in Step 4.7, or "None" if no items were completed.

7. Output the PR URL.

8. Suggest next step: "Consider running `/document-release` to update project documentation for these changes."

9. Continue to Step 5 (Cleanup).

### Option C: Keep Branch As-Is

Report current state:

```
Keeping branch <branch>. Current status:
- <N> commits ahead of <base>
- <M> files changed
- All tests passing

Next steps when ready:
- Run this skill again to merge or create PR
- Continue development on this branch
```

**Do NOT clean up worktree or branch.** Skip Step 5.

### Option D: Discard Branch

This is destructive. Confirm with AskUserQuestion:

> **Re-ground:** About to permanently delete branch `<branch>` with <N> commits.
>
> **Simplify:** This will permanently delete all work on this branch. This cannot be undone.
>
> **RECOMMENDATION:** Only choose A if you are certain this work is not needed. Completeness: N/A.
>
> A) Confirm discard -- permanently delete branch and all commits
> B) Cancel -- keep the branch (go back to options)

If confirmed:
```bash
git checkout <base>
git branch -D <branch>
```

If the branch was pushed to remote:
```bash
git push origin --delete <branch> 2>/dev/null || true
```

Continue to Step 5 (Cleanup).

---

## Step 4.5: Bisectable Commits Check

Before pushing (for Options A and B), check if the branch has a clean commit history:

```bash
git log <base>..HEAD --oneline
```

Look for WIP commits, fixup commits, or disorganized history. Signs of a messy history:
- Commit messages starting with `wip`, `WIP`, `fixup!`, `squash!`, `temp`, `tmp`
- Multiple commits that touch the same file with incremental fixes
- Messages like `fix typo`, `oops`, `forgot to add`

**If the history is clean:** Continue silently.

**If WIP/fixup commits exist:** Use AskUserQuestion:

> **Re-ground:** Branch `<branch>` has <N> commits, some of which appear to be WIP or fixup commits: <list problematic commit messages>.
>
> **Simplify:** A clean commit history makes it easier to review changes and use `git bisect` to find bugs later. You can squash these into logical commits.
>
> **RECOMMENDATION:** Choose A for a cleaner history. Completeness: 9/10.
>
> A) Squash into logical commits (recommended) -- non-interactive squash to clean up -- Completeness: 9/10
> B) Keep as-is -- ship with current history -- Completeness: 7/10

If user chooses A: perform a non-interactive rebase to squash fixup/WIP commits into their logical parent commits. Each resulting commit should represent one coherent change. After rebasing, re-run tests to verify nothing broke.

---

## Step 4.6: Auto-generate CHANGELOG Entry

**Only if `CHANGELOG.md` exists** in the repository root.

```bash
ls CHANGELOG.md 2>/dev/null
```

**If CHANGELOG.md does not exist:** Skip this step silently.

**If CHANGELOG.md exists:**

1. Read the CHANGELOG header to understand the existing format:
   ```bash
   head -20 CHANGELOG.md
   ```

2. Auto-generate an entry from ALL commits on the branch:
   - Use `git log <base>..HEAD --oneline` to see every commit being shipped
   - Use `git diff <base>...HEAD` to understand the full scope of changes
   - The entry must cover ALL changes, not just recent ones
   - Write for **users**, not contributors: describe what changed in plain language
   - Apply **humanizer** constraints — CHANGELOG entries and PR descriptions are human-facing prose
   - Categorize into applicable sections:
     - `### Added` -- new features
     - `### Changed` -- changes to existing functionality
     - `### Fixed` -- bug fixes
     - `### Removed` -- removed features
   - Format: `## [Unreleased] - YYYY-MM-DD` (or match the project's existing format)
   - Insert after the file header, before existing entries

3. Commit the CHANGELOG update:
   ```bash
   git add CHANGELOG.md && git commit -m "docs: update CHANGELOG for branch <branch>"
   ```

**Do NOT ask the user to describe changes.** Infer everything from the diff and commit history.

---

## Step 4.7: TODOS.md Auto-update

**Only if `TODOS.md` exists** in the repository root.

```bash
ls TODOS.md 2>/dev/null
```

**If TODOS.md does not exist:** Skip this step silently.

**If TODOS.md exists:**

1. Read the current TODOS.md.

2. Cross-reference against the changes being shipped. Use the diff and commit history already gathered:
   - `git diff <base>...HEAD` (full diff against the base branch)
   - `git log <base>..HEAD --oneline` (all commits being shipped)

3. For each TODO item, check if the changes on this branch complete it by:
   - Matching commit messages against the TODO title and description
   - Checking if files referenced in the TODO appear in the diff
   - Checking if the TODO's described work matches the functional changes

4. **Be conservative:** Only mark a TODO as completed if there is clear evidence in the diff. If uncertain, leave it alone.

5. Move completed items to a `## Completed` section (create it if it does not exist). Append: `**Completed:** <branch> (YYYY-MM-DD)`

6. Commit the TODOS update:
   ```bash
   git add TODOS.md && git commit -m "docs: mark completed TODOs for branch <branch>"
   ```

7. Output summary:
   - `TODOS.md: N items marked complete (item1, item2, ...). M items remaining.`
   - Or: `TODOS.md: No completed items detected. M items remaining.`

**Defensive:** If TODOS.md cannot be written (permission error, parse issue), warn the user and continue. Never stop the workflow for a TODOS failure.

---

## Step 4.8: Verification Gate

**IRON LAW: If any code was changed after tests passed, re-run tests before proceeding. Never ship unverified code.**

Before pushing, check if code changed during Steps 4.5-4.7:

1. **Were any source files modified** after Step 1.4's test run? (CHANGELOG and TODOS edits do not count -- only code, test, or config files.)

2. **If yes:** Re-run the test suite. Use the same test command from Step 1.4. Paste fresh output.

3. **If tests fail:** STOP. Do not push. Fix the issue and re-run tests.

4. **Rationalization prevention:**
   - "Should work now" -- RUN IT.
   - "I'm confident" -- Confidence is not evidence.
   - "I already tested earlier" -- Code changed since then. Test again.
   - "It's a trivial change" -- Trivial changes break production.

Claiming work is complete without verification is dishonesty, not efficiency.

---

## Web project shipping additions

If `PROJECT_TYPE` is `web` (from session context):

1. **QA gate.** Before creating the PR, invoke the `/qa` skill in standard mode. Fix any critical and high severity issues found. This is a blocking gate — do not create the PR until QA passes.

2. **Performance check.** If a baseline exists (`.rkstack/benchmark-reports/baseline.json`), run `/benchmark` and compare. Flag regressions >20% in the PR description.

3. **Visual evidence in PR.** Include screenshots of key visual changes in the PR description. If before/after screenshots are available (from QA or design-review), include those.

4. **Supabase migration check.** If `HAS_SUPABASE=yes` and the branch includes database migrations (files in `supabase/migrations/`), verify the migrations apply cleanly and that RLS policies are in place for any new tables.

If `PROJECT_TYPE` is not `web`, skip this section entirely.

---

## Step 5: Cleanup

**For Options A, B, D only.** Skip for Option C.

### 5.1 Remove worktree if applicable

```bash
# Check if we're in a worktree
_WT_PATH=$(git rev-parse --show-toplevel 2>/dev/null)
_MAIN_WT=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
```

If `_WT_PATH` differs from `_MAIN_WT`, we are in a worktree:
```bash
cd "$_MAIN_WT"
git worktree remove "$_WT_PATH" 2>/dev/null || echo "Worktree already removed or not applicable"
```

### 5.2 Delete local branch if merged (Options A and D only)

For Option A (merged):
```bash
git branch -d <branch>
```

For Option D (discarded): already deleted in Step 4.

For Option B (PR created): keep the local branch -- it may need updates based on review.

### 5.3 Report final status

```
Branch completion: DONE
- Method: <merge locally | PR created | discarded>
- Base branch: <base>
- Worktree: <removed | not applicable>
- Local branch: <deleted | kept for PR>
<PR URL if Option B>
<CHANGELOG updated: yes/no>
<TODOS updated: N items completed / no changes / not applicable>
```

---

## Quick Reference

| Option | Tests | Merge Base First | Bisect Check | Push | PR | CHANGELOG | TODOS | Cleanup Branch |
|--------|-------|-----------------|--------------|------|----|-----------|-------|----------------|
| A. Merge locally | verify post-merge | yes (Step 1.3) | yes | yes (base) | no | yes (if exists) | yes (if exists) | yes (delete) |
| B. Push + create PR | pre-verified | yes (Step 1.3) | yes | yes (branch) | yes (rich body) | yes (if exists) | yes (if exists) | no (keep) |
| C. Keep as-is | pre-verified | yes (Step 1.3) | no | no | no | no | no | no |
| D. Discard | n/a | n/a | no | no | no | no | no | yes (force) |

---

## Important Rules

- **Never skip test verification.** If tests fail, stop.
- **Never merge without verifying tests on the result.** Post-merge test run is mandatory for Option A.
- **Never ship unverified code.** If code changed after tests passed, re-run tests (Verification Gate).
- **Never force-push.** Use regular `git push` only.
- **Never delete work without explicit confirmation.** Option D requires typed confirmation.
- **Never hardcode test commands.** Read from CLAUDE.md or auto-detect.
- **Always merge base branch before running tests.** Tests must run on the merged state, not the feature branch in isolation.
- **Always present exactly 4 options.** Keep them structured and concise.
- **Always use AskUserQuestion format** with re-ground, simplify, recommend, and lettered options.
- **Clean up worktree for Options A and D only.** Keep for B and C.
- **CHANGELOG entries are for users, not contributors.** Write what changed in plain language.
- **TODOS completion must be conservative.** Only mark items done when the diff clearly shows the work is done.
