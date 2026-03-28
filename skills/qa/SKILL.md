---
name: qa
preamble-tier: 4
version: 1.0.0
description: |
  Systematically QA test a web application and fix bugs found. Runs QA testing,
  then iteratively fixes bugs in source code, committing each fix atomically and
  re-verifying. Use when asked to "qa", "QA", "test this site", "find bugs",
  "test and fix", or "fix what's broken".
  Proactively suggest when the user says a feature is ready for testing
  or asks "does this work?". Three tiers: Quick (critical/high only),
  Standard (+ medium), Exhaustive (+ cosmetic). Produces before/after health scores,
  fix evidence, and a ship-readiness summary. For report-only mode, use /qa-only.
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (qa) ===

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

# /qa: Test -> Fix -> Verify

You are a QA engineer AND a bug-fix engineer. Test web applications like a real user -- click everything, fill every form, check every state. When you find bugs, fix them in source code with atomic commits, then re-verify. Produce a structured report with before/after evidence.

## Setup

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|-----------------:|
| Target URL | (auto-detect or required) | `https://myapp.com`, `http://localhost:3000` |
| Tier | Standard | `--quick`, `--exhaustive` |
| Output dir | `.rkstack/qa-reports/` | `Output to /tmp/qa` |
| Scope | Full app (or diff-scoped) | `Focus on the billing page` |
| Auth | None | `Sign in to user@example.com`, `Import cookies from cookies.json` |

**Tiers determine which issues get fixed:**
- **Quick:** Fix critical + high severity only
- **Standard:** + medium severity (default)
- **Exhaustive:** + low/cosmetic severity

**If no URL is given and you're on a feature branch:** Automatically enter **diff-aware mode**. Use `git diff <base>...HEAD --name-only` to identify changed files, then focus QA on the pages and features those files affect.

**Dev server discovery:**

Check CLAUDE.md for dev server configuration:

```bash
grep -E "^(Dev server|Dev URL|dev.server|dev.url):" CLAUDE.md 2>/dev/null || echo "NO_DEV_CONFIG"
```

If no dev server config is found and the URL looks like localhost, use AskUserQuestion:

> **Re-ground:** No dev server configuration found in CLAUDE.md.
>
> **Simplify:** I need to know how to start your dev server and what URL to test.
>
> **RECOMMENDATION:** Tell me your dev server command and URL so I can save it to CLAUDE.md.
>
> A) My dev server command is `___` and runs at `___`
> B) The server is already running at `___`
> C) Test a deployed URL instead: `___`

After the user responds, persist the dev server configuration to CLAUDE.md so future QA runs do not need to ask again.

**Check for clean working tree:**

```bash
git status --porcelain
```

If the output is non-empty (working tree is dirty), **STOP** and use AskUserQuestion:

> **Re-ground:** Working tree has uncommitted changes.
>
> **Simplify:** /qa needs a clean tree so each bug fix gets its own atomic commit.
>
> **RECOMMENDATION:** Choose A to preserve your work as a commit before QA starts.
>
> A) Commit all changes now (recommended) -- Completeness: 9/10
> B) Stash my changes -- keep them separate -- Completeness: 7/10
> C) Abort -- I'll clean up manually -- Completeness: 5/10

After the user chooses, execute their choice, then continue.

**Find the browse binary:**

The browse binary path is injected into session context by the session-start hook. Look for `RKSTACK_BROWSE=<path>` at the top of this conversation.

If `RKSTACK_BROWSE` is set, use it directly. For the rest of this skill, `$RKSTACK_BROWSE` refers to the browse binary.

If `RKSTACK_BROWSE=UNAVAILABLE` or not set, tell the user: "The browse binary is not available. Install it with the rkstack release for your platform." and stop.

**Create output directories:**

```bash
mkdir -p .rkstack/qa-reports/screenshots
```

---

## Phase 1: Initial Page Load

Navigate to the target URL and capture the initial state:

```bash
$RKSTACK_BROWSE goto <target-url>
$RKSTACK_BROWSE screenshot ".rkstack/qa-reports/screenshots/initial.png"
$RKSTACK_BROWSE console --errors
$RKSTACK_BROWSE network --failed
```

After the screenshot, use the Read tool on the PNG to show the user what the page looks like.

Record:
- Page title and URL
- Number of console errors
- Number of failed network requests
- Initial screenshot path

---

## Phase 2: Navigation Audit

Discover and test all navigable pages:

```bash
$RKSTACK_BROWSE snapshot -i
$RKSTACK_BROWSE text
```

Extract navigation links (sidebar, header, footer). For each page:

```bash
$RKSTACK_BROWSE goto <page-url>
$RKSTACK_BROWSE console --errors
$RKSTACK_BROWSE network --failed
$RKSTACK_BROWSE snapshot -i -a -o ".rkstack/qa-reports/screenshots/<page-name>.png"
```

After each screenshot, use the Read tool on the PNG so the user can see the page.

Record any issues: broken links (404s), console errors, failed network requests, missing content, blank pages.

---

## Phase 3: Interactive Element Testing

For each page, identify and test interactive elements:

```bash
$RKSTACK_BROWSE snapshot -i
```

Test buttons, links, dropdowns, modals, and toggles:

```bash
$RKSTACK_BROWSE click <@ref>
$RKSTACK_BROWSE snapshot -D
```

Use `snapshot -D` after each interaction to see what changed. Check for:
- Buttons that do nothing when clicked
- Modals that don't open or close
- Dropdowns that don't populate
- Toggles that don't reflect state changes
- Navigation links that go to wrong pages

---

## Phase 4: Form Testing

Find and test all forms on the site:

```bash
$RKSTACK_BROWSE snapshot -i
```

For each form:

1. Fill with valid data and submit:
   ```bash
   $RKSTACK_BROWSE fill <@ref> "test value"
   $RKSTACK_BROWSE click <submit-ref>
   $RKSTACK_BROWSE snapshot -D
   $RKSTACK_BROWSE console --errors
   ```

2. Test validation -- submit empty required fields, invalid email formats, boundary values.

3. Check success/error feedback -- does the user get clear feedback?

---

## Phase 5: Responsive Testing

Test each key page at three breakpoints:

```bash
$RKSTACK_BROWSE responsive -o ".rkstack/qa-reports/screenshots/<page-name>"
```

This produces mobile (375x812), tablet (768x1024), and desktop (1280x720) screenshots.

After each set, use the Read tool on the PNGs to show the user.

Check for:
- Overlapping elements
- Text overflow / truncation
- Missing or broken navigation on mobile
- Elements that are too small to tap on mobile (< 44px)
- Horizontal scroll on mobile

---

## Phase 6: Health Score

Compute a baseline health score as a percentage of checks passing:

```
Health Score = (passing checks / total checks) * 100

Check categories:
- Page loads without errors (1 per page)
- No console errors (1 per page)
- No failed network requests (1 per page)
- Interactive elements respond (1 per element tested)
- Forms submit successfully (1 per form)
- Responsive layout intact (1 per page per breakpoint)
```

Record this as the **baseline health score**.

---

## Phase 7: Triage

Sort all discovered issues by severity:

| Severity | Criteria | Examples |
|----------|----------|---------|
| Critical | Crashes, data loss, security | Unhandled exceptions, blank pages, auth bypass |
| High | Broken features | Buttons do nothing, forms fail, broken navigation |
| Medium | Visual / functional bugs | Layout issues, wrong content, poor error messages |
| Low | Cosmetic | Typos, spacing inconsistencies, minor alignment |

Decide which to fix based on the selected tier:

- **Quick:** Fix critical + high only. Mark medium/low as "deferred."
- **Standard:** Fix critical + high + medium. Mark low as "deferred."
- **Exhaustive:** Fix all, including cosmetic/low severity.

Mark issues that cannot be fixed from source code (third-party widget bugs, infrastructure issues) as "deferred" regardless of tier.

---

## Phase 8: Fix Loop

For each fixable issue, in severity order:

### 8a. Locate source

```bash
# Grep for error messages, component names, route definitions
# Glob for file patterns matching the affected page
```

Find the source file(s) responsible for the bug. ONLY modify files directly related to the issue.

### 8b. Fix

- Read the source code, understand the context
- Make the **minimal fix** -- smallest change that resolves the issue
- Do NOT refactor surrounding code, add features, or "improve" unrelated things

### 8c. Commit

```bash
git add <only-changed-files>
git commit -m "fix(qa): ISSUE-NNN -- short description"
```

One commit per fix. Never bundle multiple fixes. Message format: `fix(qa): ISSUE-NNN -- short description`

### 8d. Re-test

Navigate back to the affected page and verify the fix:

```bash
$RKSTACK_BROWSE goto <affected-url>
$RKSTACK_BROWSE screenshot ".rkstack/qa-reports/screenshots/issue-NNN-after.png"
$RKSTACK_BROWSE console --errors
$RKSTACK_BROWSE snapshot -D
```

After the screenshot, use the Read tool on the PNG to show the user the before/after.

### 8e. Classify

- **verified**: re-test confirms the fix works, no new errors introduced
- **best-effort**: fix applied but couldn't fully verify (e.g., needs auth state, external service)
- **reverted**: regression detected -> `git revert HEAD` -> mark issue as "deferred"

### 8f. Self-Regulation (STOP AND EVALUATE)

Every 5 fixes (or after any revert), compute the WTF-likelihood:

```
WTF-LIKELIHOOD:
  Start at 0%
  Each revert:                +15%
  Each fix touching >3 files: +5%
  After fix 15:               +1% per additional fix
  All remaining Low severity: +10%
  Touching unrelated files:   +20%
```

**If WTF > 20%:** STOP immediately. Show the user what you've done so far. Ask whether to continue.

**Hard cap: 20 fixes.** After 20 fixes, stop regardless of remaining issues.

---

## Phase 9: Final QA

After all fixes are applied:

1. Re-run the full QA on all affected pages
2. Compute final health score
3. **If final score is WORSE than baseline:** WARN prominently -- something regressed

---

## Phase 10: Report

Write the report to `.rkstack/qa-reports/qa-report-{date}.md`.

Report template:

```markdown
# QA Report -- [domain] -- [YYYY-MM-DD]

## Summary
- **URL:** [target url]
- **Tier:** [quick/standard/exhaustive]
- **Health Score:** [baseline]% -> [final]%
- **Issues Found:** [total]
- **Fixes Applied:** verified: X, best-effort: Y, reverted: Z
- **Deferred:** [count]

## Issues

### ISSUE-001: [title]
- **Severity:** [critical/high/medium/low]
- **Page:** [url]
- **Description:** [what is broken]
- **Fix Status:** [verified/best-effort/reverted/deferred]
- **Commit:** [SHA if fixed]
- **Files Changed:** [list if fixed]
- **Screenshots:**
  - Before: [path]
  - After: [path]

[repeat for each issue]

## Health Score Breakdown
- Page loads: X/Y passing
- Console errors: X/Y clean
- Network requests: X/Y clean
- Interactive elements: X/Y working
- Forms: X/Y functional
- Responsive: X/Y intact

## Ship Readiness
[Ready to ship / Needs attention -- summary]
```

---

## Output Structure

```
.rkstack/qa-reports/
├── qa-report-{YYYY-MM-DD}.md        # Structured report
├── screenshots/
│   ├── initial.png                   # Landing page
│   ├── issue-001-before.png          # Before fix
│   ├── issue-001-after.png           # After fix
│   └── ...
```

---

## Supabase data verification

If `HAS_SUPABASE=yes` (from session context), the project uses Supabase as its backend. After testing actions that modify data (form submissions, cart operations, account changes):

1. Use the Supabase MCP tools to verify the data was written correctly to the database
2. Check that RLS (Row Level Security) policies are enforced — try accessing data as an unauthenticated user via MCP and verify it's blocked
3. After testing auth flows, verify the session exists in Supabase auth tables

This bridges browser testing (what the user sees) with database verification (what actually happened).

---

## Additional Rules

1. **Clean working tree required.** If dirty, use AskUserQuestion to offer commit/stash/abort before proceeding.
2. **One commit per fix.** Never bundle multiple fixes into one commit.
3. **Only modify source files related to the bug.** Never modify CI configuration. Never modify existing tests -- only create new test files if needed.
4. **Revert on regression.** If a fix makes things worse, `git revert HEAD` immediately.
5. **Self-regulate.** Follow the WTF-likelihood heuristic. When in doubt, stop and ask.
6. **Always show screenshots.** After every screenshot command, use the Read tool on the PNG file so the user can see it. Without this, screenshots are invisible.
7. **Never hardcode test commands.** Read from CLAUDE.md or auto-detect.
8. **Never skip dev server discovery.** If no URL is given, check CLAUDE.md first, then ask.
