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
announce-action: complete this work
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (finishing-a-development-branch) ===

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
setopt +o nomatch 2>/dev/null || true  # zsh compat
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini setup.py Cargo.toml go.mod 2>/dev/null
ls package.json Gemfile pyproject.toml 2>/dev/null
```

Run the detected test command. **Never hardcode** `npm test` or `cargo test` -- use whatever the project uses.

**If no test framework detected:** Follow the Test Framework Bootstrap procedure:

## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

```bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detect sub-frameworks
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Check opt-out marker
[ -f .rkstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
```

**If test framework detected** (config files or test directories found):
Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."
Read 2-3 existing test files to learn conventions (naming, imports, assertion style, setup patterns).
Store conventions as prose context for use in later test generation steps. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED** appears: Print "Test bootstrap previously declined -- skipping." **Skip the rest of bootstrap.**

**If NO runtime detected** (no config files found): Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H -> write `.rkstack/no-test-bootstrap` and continue without tests.

**If runtime detected but no test framework -- bootstrap:**

### B2. Research best practices

Use WebSearch to find current best practices for the detected runtime:
- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

If WebSearch is unavailable, use this built-in knowledge table:

| Runtime | Primary recommendation | Alternative |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | -- |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | -- |

### B3. Framework selection

Use AskUserQuestion:
"I detected this is a [Runtime/Framework] project with no test framework. I researched current best practices. Here are the options:
A) [Primary] -- [rationale]. Includes: [packages]. Supports: unit, integration, smoke, e2e
B) [Alternative] -- [rationale]. Includes: [packages]
C) Skip -- don't set up testing right now
RECOMMENDATION: Choose A because [reason based on project context]"

If user picks C -> write `.rkstack/no-test-bootstrap`. Tell user: "If you change your mind later, delete `.rkstack/no-test-bootstrap` and re-run." Continue without tests.

If multiple runtimes detected (monorepo) -> ask which runtime to set up first, with option to do both sequentially.

### B4. Install and configure

1. Install the chosen packages (npm/bun/gem/pip/etc.)
2. Create minimal config file
3. Create directory structure (test/, spec/, etc.)
4. Create one example test matching the project's code to verify setup works

If package installation fails -> debug once. If still failing -> revert with `git checkout -- package.json package-lock.json` (or equivalent for the runtime). Warn user and continue without tests.

### B4.5. First real tests

Generate 3-5 real tests for existing code:

1. **Find recently changed files:** `git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10`
2. **Prioritize by risk:** Error handlers > business logic with conditionals > API endpoints > pure functions
3. **For each file:** Write one test that tests real behavior with meaningful assertions. Never `expect(x).toBeDefined()` -- test what the code DOES.
4. Run each test. Passes -> keep. Fails -> fix once. Still fails -> delete silently.
5. Generate at least 1 test, cap at 5.

Never import secrets, API keys, or credentials in test files. Use environment variables or test fixtures.

### B5. Verify

```bash
# Run the full test suite to confirm everything works
{detected test command}
```

If tests fail -> debug once. If still failing -> revert all bootstrap changes and warn user.

### B5.5. CI/CD pipeline

```bash
# Check CI provider
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
```

If `.github/` exists (or no CI detected -- default to GitHub Actions):
Create `.github/workflows/test.yml` with:
- `runs-on: ubuntu-latest`
- Appropriate setup action for the runtime (setup-node, setup-ruby, setup-python, etc.)
- The same test command verified in B5
- Trigger: push + pull_request

If non-GitHub CI detected -> skip CI generation with note: "Detected {provider} -- CI pipeline generation supports GitHub Actions only. Add test step to your existing pipeline manually."

### B6. Create TESTING.md

First check: If TESTING.md already exists -> read it and update/append rather than overwriting. Never destroy existing content.

Write TESTING.md with:
- Framework name and version
- How to run tests (the verified command from B5)
- Test layers: Unit tests (what, where, when), Integration tests, Smoke tests, E2E tests
- Conventions: file naming, assertion style, setup/teardown patterns

### B7. Update CLAUDE.md

First check: If CLAUDE.md already has a `## Testing` section -> skip. Don't duplicate.

Append a `## Testing` section:
- Run command and test directory
- Reference to TESTING.md
- Test expectations:
  - When writing new functions, write a corresponding test
  - When fixing a bug, write a regression test
  - When adding error handling, write a test that triggers the error
  - When adding a conditional (if/else, switch), write tests for BOTH paths
  - Never commit code that makes existing tests fail

### B8. Commit

```bash
git status --porcelain
```

Only commit if there are changes. Stage all bootstrap files (config, test directory, TESTING.md, CLAUDE.md, .github/workflows/test.yml if created):
`git commit -m "chore: bootstrap test framework ({framework name})"`

---

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

2. **Enumerate every commit on the branch:**
   ```bash
   git log <base>..HEAD --oneline
   ```
   Copy the full list. Count the commits. You will use this as a checklist.

3. **Read the full diff** to understand what each commit actually changed:
   ```bash
   git diff <base>...HEAD
   ```

4. **Group commits by theme** before writing anything. Common themes:
   - New features / capabilities
   - Bug fixes
   - Performance improvements
   - Dead code removal / cleanup
   - Infrastructure / tooling / tests
   - Refactoring

5. **Write the CHANGELOG entry** covering ALL groups:
   - Write for **users**, not contributors: describe what changed in plain language
   - Apply **humanizer** constraints — CHANGELOG entries and PR descriptions are human-facing prose
   - Categorize into applicable sections:
     - `### Added` -- new features
     - `### Changed` -- changes to existing functionality
     - `### Fixed` -- bug fixes
     - `### Removed` -- removed features
   - Format: `## [Unreleased] - YYYY-MM-DD` (or match the project's existing format)
   - Insert after the file header, before existing entries

6. **Cross-check:** Compare your CHANGELOG entry against the commit list from step 2.
   Every commit must map to at least one bullet point. If any commit is unrepresented,
   add it now. If the branch has N commits spanning K themes, the CHANGELOG must
   reflect all K themes.

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

## Step 4.85: Test Coverage Audit

100% coverage is the goal -- every untested path is a path where bugs hide. Evaluate what was ACTUALLY coded (from the diff), not what was planned.

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

3. **If no framework detected:** falls through to the Test Framework Bootstrap step which handles full setup.

**0. Before/after test count:**

```bash
# Count test files before any generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

Store this number for the PR body.

**1. Trace every codepath changed** using `git diff origin/<base>...HEAD`:

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

**2. Map user flows, interactions, and error states:**

Code coverage isn't enough -- you need to cover how real users interact with the changed code. For each changed feature, think through:

- **User flows:** What sequence of actions does a user take that touches this code? Map the full journey. Each step in the journey needs a test.
- **Interaction edge cases:** Double-click/rapid resubmit, navigate away mid-operation, submit with stale data, slow connection, concurrent actions
- **Error states the user can see:** For every error the code handles, what does the user actually experience? Can the user recover?
- **Empty/zero/boundary states:** What does the UI show with zero results? With 10,000 results? With maximum-length input?

Add these to your diagram alongside the code branches.

**3. Check each branch against existing tests:**

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

**4. Output ASCII coverage diagram:**

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

**5. Generate tests for uncovered paths:**

If test framework detected (or bootstrapped):
- Prioritize error handlers and edge cases first (happy paths are more likely already tested)
- Read 2-3 existing test files to match conventions exactly
- Generate unit tests. Mock all external dependencies (DB, API, Redis).
- For paths marked E2E: generate integration/E2E tests using the project's E2E framework
- Write tests that exercise the specific uncovered path with real assertions
- Run each test. Passes -> commit as `test: coverage for {feature}`
- Fails -> fix once. Still fails -> revert, note gap in diagram.

Caps: 30 code paths max, 20 tests generated max, 2-min per-test exploration cap.

If no test framework AND user declined bootstrap -> diagram only, no generation. Note: "Test generation skipped -- no test framework configured."

**Diff is test-only changes:** Skip entirely: "No new application code paths to audit."

**6. After-count and coverage summary:**

```bash
# Count test files after generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

For PR body: `Tests: {before} -> {after} (+{delta} new)`
Coverage line: `Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.`

**7. Coverage gate:**

Before proceeding, check CLAUDE.md for a `## Test Coverage` section with `Minimum:` and `Target:` fields. If found, use those percentages. Otherwise use defaults: Minimum = 60%, Target = 80%.

Using the coverage percentage from the diagram:

- **>= target:** Pass. "Coverage gate: PASS ({X}%)." Continue.
- **>= minimum, < target:** Use AskUserQuestion:
  - "AI-assessed coverage is {X}%. {N} code paths are untested. Target is {target}%."
  - Options:
    A) Generate more tests for remaining gaps (recommended)
    B) Ship anyway -- I accept the coverage risk
    C) These paths don't need tests -- mark as intentionally uncovered
  - Maximum 2 generation passes total.

- **< minimum:** Use AskUserQuestion:
  - "AI-assessed coverage is critically low ({X}%). Minimum threshold is {minimum}%."
  - Options:
    A) Generate tests for remaining gaps (recommended)
    B) Override -- ship with low coverage (I understand the risk)

**Coverage percentage undetermined:** Skip the gate with: "Coverage gate: could not determine percentage -- skipping."

**100% coverage:** "Coverage gate: PASS (100%)." Continue.

---

## Step 4.86: Plan Completion Audit

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

### Gate Logic

After producing the completion checklist:

- **All DONE or CHANGED:** Pass. "Plan completion: PASS -- all items addressed." Continue.
- **Only PARTIAL items (no NOT DONE):** Continue with a note in the PR body. Not blocking.
- **Any NOT DONE items:** Use AskUserQuestion:
  - Show the completion checklist above
  - "{N} items from the plan are NOT DONE. These were part of the original plan but are missing from the implementation."
  - RECOMMENDATION: depends on item count and severity. If 1-2 minor items, recommend B. If core functionality is missing, recommend A.
  - Options:
    A) Stop -- implement the missing items before shipping
    B) Ship anyway -- defer these to a follow-up
    C) These items were intentionally dropped -- remove from scope
  - If A: STOP. List the missing items for the user to implement.
  - If B: Continue. Note deferred items for TODOS.md.
  - If C: Continue. Note in PR body: "Plan items intentionally dropped: {list}."

**No plan file found:** Skip entirely. "No plan file detected -- skipping plan completion audit."

**Include in PR body:** Add a `## Plan Completion` section with the checklist summary.

---

## Step 4.87: Plan Verification

## Plan Verification

Automatically verify the plan's testing/verification steps using the `/qa-only` skill.

### 1. Check for verification section

Using the plan file already discovered in the plan completion audit step, look for a verification section. Match any of these headings: `## Verification`, `## Test plan`, `## Testing`, `## How to test`, `## Manual testing`, or any section with verification-flavored items (URLs to visit, things to check visually, interactions to test).

**If no verification section found:** Skip with "No verification steps found in plan -- skipping auto-verification."
**If no plan file was found:** Skip (already handled).

### 2. Check for running dev server

Before invoking browse-based verification, check if a dev server is reachable:

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || \
curl -s -o /dev/null -w '%{http_code}' http://localhost:8080 2>/dev/null || \
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null || \
curl -s -o /dev/null -w '%{http_code}' http://localhost:4000 2>/dev/null || echo "NO_SERVER"
```

**If NO_SERVER:** Skip with "No dev server detected -- skipping plan verification. Run /qa separately after deploying."

### 3. Run verification

Follow the /qa-only workflow with these modifications:
- **Skip the preamble** (already handled)
- **Use the plan's verification section as the primary test input** -- treat each verification item as a test case
- **Use the detected dev server URL** as the base URL
- **Skip the fix loop** -- this is report-only verification
- **Cap at the verification items from the plan** -- do not expand into general site QA

### 4. Gate logic

- **All verification items PASS:** Continue silently. "Plan verification: PASS."
- **Any FAIL:** Use AskUserQuestion:
  - Show the failures with screenshot evidence
  - RECOMMENDATION: Choose A if failures indicate broken functionality. Choose B if cosmetic only.
  - Options:
    A) Fix the failures before shipping (recommended for functional issues)
    B) Ship anyway -- known issues (acceptable for cosmetic issues)
- **No verification section / no server:** Skip (non-blocking).

### 5. Include in PR body

Add a `## Verification Results` section to the PR body:
- If verification ran: summary of results (N PASS, M FAIL, K SKIPPED)
- If skipped: reason for skipping

---

## Step 4.88: Adversarial Review

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
```

High-confidence findings (agreed on by multiple sources) should be prioritized for fixes.

---

## Step 4.89: Review Readiness Dashboard

## Review Readiness Dashboard

After completing all review steps, display a summary dashboard.

Gather the status of each review pass completed in this session:

```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review              | Status    | Findings | Required |
|---------------------|-----------|----------|----------|
| Code Review         | CLEAR     | 0        | YES      |
| Test Coverage Audit | CLEAR     | 2 gaps   | YES      |
| Plan Completion     | CLEAR     | 0        | if plan  |
| Adversarial Review  | CLEAR     | 1        | auto     |
| Plan Verification   | PASS      | 0        | if plan  |
+--------------------------------------------------------------------+
| VERDICT: CLEARED -- all required reviews passed                     |
+====================================================================+
```

**Review tiers:**
- **Code Review (required):** The primary review that gates shipping. Covers architecture, code quality, tests, performance.
- **Test Coverage Audit (required):** Ensures new code paths have test coverage.
- **Plan Completion (if plan exists):** Verifies all plan items are addressed.
- **Adversarial Review (automatic):** Auto-scales by diff size. Small diffs skip.
- **Plan Verification (if plan exists):** Auto-runs plan's test steps via /qa-only.

**Verdict logic:**
- **CLEARED**: Code Review and Test Coverage Audit both passed (or user overrode)
- **NOT CLEARED**: Any required review has unresolved blockers
- Plan Completion, Adversarial, and Plan Verification are shown for context but do not block shipping unless they surface critical issues

---

## Web project shipping additions

If `flowType` is `web` (from detection cache):

1. **QA gate.** Before creating the PR, invoke the `/qa` skill in standard mode. Fix any critical and high severity issues found. This is a blocking gate — do not create the PR until QA passes.

2. **Performance check.** If a baseline exists (`.rkstack/benchmark-reports/baseline.json`), run `/benchmark` and compare. Flag regressions >20% in the PR description.

3. **Visual evidence in PR.** Include screenshots of key visual changes in the PR description. If before/after screenshots are available (from QA or design-review), include those.

4. **Supabase migration check.** If `HAS_SUPABASE=yes` and the branch includes database migrations (files in `supabase/migrations/`), verify the migrations apply cleanly and that RLS policies are in place for any new tables.

If `flowType` is not `web`, skip this section entirely.

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
