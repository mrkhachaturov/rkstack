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
  - WebSearch
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
| Mode | full | `--regression .rkstack/qa-reports/baseline.json` |
| Output dir | `.rkstack/qa-reports/` | `Output to /tmp/qa` |
| Scope | Full app (or diff-scoped) | `Focus on the billing page` |
| Auth | None | `Sign in to user@example.com`, `Import cookies from cookies.json` |

**Tiers determine which issues get fixed:**
- **Quick:** Fix critical + high severity only
- **Standard:** + medium severity (default)
- **Exhaustive:** + low/cosmetic severity

**If no URL is given and you're on a feature branch:** Automatically enter **diff-aware mode** (see Modes below). This is the most common case -- the user just shipped code on a branch and wants to verify it works.

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

**Check test framework (bootstrap if needed):**

Detect existing test framework and project runtime:

```bash
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
Store conventions as prose context for use in Phase 8e.5. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED** appears: Print "Test bootstrap previously declined -- skipping." **Skip the rest of bootstrap.**

**If NO runtime detected** (no config files found): Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H, write `.rkstack/no-test-bootstrap` and continue without tests.

**If runtime detected but no test framework -- bootstrap:**

1. Research best practices: Use WebSearch to find current best practices for the detected runtime. If WebSearch is unavailable, use this built-in table:

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

2. Framework selection: AskUserQuestion with options including Skip (writes `.rkstack/no-test-bootstrap`).

3. Install, configure, create directory structure, write one example test.

4. Generate 3-5 real tests for existing code (prioritize by risk: error handlers > business logic > API endpoints > pure functions).

5. Verify: run the full test suite. If tests fail, debug once. If still failing, revert all bootstrap changes.

6. Update CLAUDE.md with a Testing section if one does not already exist.

7. Commit bootstrap files: `git commit -m "chore: bootstrap test framework ({framework name})"`

---

**Create output directories:**

```bash
mkdir -p .rkstack/qa-reports/screenshots
```

---

## Test Plan Context

Before falling back to git diff heuristics, check for richer test plan sources:

1. **Prior QA reports:** Check `.rkstack/qa-reports/` for recent reports for this repo
   ```bash
   ls -t .rkstack/qa-reports/qa-report-*.md 2>/dev/null | head -1
   ```
2. **Conversation context:** Check if a prior review skill produced test plan output in this conversation
3. **Use whichever source is richer.** Fall back to git diff analysis only if neither is available.

---

## Phases 1-6: QA Baseline

## Modes

### Diff-aware (automatic when on a feature branch with no URL)

This is the **primary mode** for developers verifying their work. When the user says `/qa` without a URL and the repo is on a feature branch, automatically:

1. **Analyze the branch diff** to understand what changed:
   ```bash
   git diff <base>...HEAD --name-only
   git log <base>..HEAD --oneline
   ```
   (Use the base branch detected in Step 0.)

2. **Identify affected pages/routes** from the changed files:
   - Controller/route files -> which URL paths they serve
   - View/template/component files -> which pages render them
   - Model/service files -> which pages use those models (check controllers that reference them)
   - CSS/style files -> which pages include those stylesheets
   - API endpoints -> test them directly with `$RKSTACK_BROWSE js "await fetch('/api/...')"`
   - Static pages (markdown, HTML) -> navigate to them directly

   **If no obvious pages/routes are identified from the diff:** Do not skip browser testing. The user invoked /qa because they want browser-based verification. Fall back to Quick mode -- navigate to the homepage, follow the top 5 navigation targets, check console for errors, and test any interactive elements found. Backend, config, and infrastructure changes affect app behavior -- always verify the app still works.

3. **Detect the running app** -- check common local dev ports:
   ```bash
   $RKSTACK_BROWSE goto http://localhost:3000 2>/dev/null && echo "Found app on :3000" || \
   $RKSTACK_BROWSE goto http://localhost:4000 2>/dev/null && echo "Found app on :4000" || \
   $RKSTACK_BROWSE goto http://localhost:8080 2>/dev/null && echo "Found app on :8080"
   ```
   If no local app is found, check for a staging/preview URL in the PR or environment. If nothing works, ask the user for the URL.

4. **Test each affected page/route:**
   - Navigate to the page
   - Take a screenshot
   - Check console for errors
   - If the change was interactive (forms, buttons, flows), test the interaction end-to-end
   - Use `snapshot -D` before and after actions to verify the change had the expected effect

5. **Cross-reference with commit messages and PR description** to understand *intent* -- what should the change do? Verify it actually does that.

6. **Check TODOS.md** (if it exists) for known bugs or issues related to the changed files. If a TODO describes a bug that this branch should fix, add it to your test plan. If you find a new bug during QA that isn't in TODOS.md, note it in the report.

7. **Report findings** scoped to the branch changes:
   - "Changes tested: N pages/routes affected by this branch"
   - For each: does it work? Screenshot evidence.
   - Any regressions on adjacent pages?

**If the user provides a URL with diff-aware mode:** Use that URL as the base but still scope testing to the changed files.

### Full (default when URL is provided)
Systematic exploration. Visit every reachable page. Document 5-10 well-evidenced issues. Produce health score. Takes 5-15 minutes depending on app size.

### Quick (`--quick`)
30-second smoke test. Visit homepage + top 5 navigation targets. Check: page loads? Console errors? Broken links? Produce health score. No detailed issue documentation.

### Regression (`--regression <baseline>`)
Run full mode, then load `baseline.json` from a previous run. Diff: which issues are fixed? Which are new? What's the score delta? Append regression section to report.

---

## Workflow

### Phase 1: Initialize

1. Find browse binary (see Setup above)
2. Create output directories
3. Start timer for duration tracking

### Phase 2: Authenticate (if needed)

**If the user specified auth credentials:**

```bash
$RKSTACK_BROWSE goto <login-url>
$RKSTACK_BROWSE snapshot -i                    # find the login form
$RKSTACK_BROWSE fill @e3 "user@example.com"
$RKSTACK_BROWSE fill @e4 "[REDACTED]"         # NEVER include real passwords in report
$RKSTACK_BROWSE click @e5                      # submit
$RKSTACK_BROWSE snapshot -D                    # verify login succeeded
```

**If the user provided a cookie file:**

```bash
$RKSTACK_BROWSE cookie-import cookies.json
$RKSTACK_BROWSE goto <target-url>
```

**If 2FA/OTP is required:** Ask the user for the code and wait.

**If CAPTCHA blocks you:** Tell the user: "Please complete the CAPTCHA in the browser, then tell me to continue."

### Phase 3: Orient

Get a map of the application:

```bash
$RKSTACK_BROWSE goto <target-url>
$RKSTACK_BROWSE snapshot -i -a -o ".rkstack/qa-reports/screenshots/initial.png"
$RKSTACK_BROWSE links                          # map navigation structure
$RKSTACK_BROWSE console --errors               # any errors on landing?
```

After the screenshot, use the Read tool on the PNG to show the user what the page looks like.

**Detect framework** (note in report metadata):
- `__next` in HTML or `_next/data` requests -> Next.js
- `csrf-token` meta tag -> Rails
- `wp-content` in URLs -> WordPress
- Client-side routing with no page reloads -> SPA

**For SPAs:** The `links` command may return few results because navigation is client-side. Use `snapshot -i` to find nav elements (buttons, menu items) instead.

### Phase 4: Explore

Visit pages systematically. At each page:

```bash
$RKSTACK_BROWSE goto <page-url>
$RKSTACK_BROWSE snapshot -i -a -o ".rkstack/qa-reports/screenshots/page-name.png"
$RKSTACK_BROWSE console --errors
```

After each screenshot, use the Read tool on the PNG so the user can see the page.

Then follow the **per-page exploration checklist**:

1. **Visual scan** -- Look at the annotated screenshot for layout issues
2. **Interactive elements** -- Click buttons, links, controls. Do they work?
   ```bash
   $RKSTACK_BROWSE click <@ref>
   $RKSTACK_BROWSE snapshot -D
   ```
3. **Forms** -- Fill and submit. Test empty, invalid, edge cases
   ```bash
   $RKSTACK_BROWSE fill <@ref> "test value"
   $RKSTACK_BROWSE click <submit-ref>
   $RKSTACK_BROWSE snapshot -D
   $RKSTACK_BROWSE console --errors
   ```
4. **Navigation** -- Check all paths in and out
5. **States** -- Empty state, loading, error, overflow
6. **Console** -- Any new JS errors after interactions?
7. **Responsiveness** -- Check mobile viewport if relevant:
   ```bash
   $RKSTACK_BROWSE viewport 375x812
   $RKSTACK_BROWSE screenshot ".rkstack/qa-reports/screenshots/page-mobile.png"
   $RKSTACK_BROWSE viewport 1280x720
   ```

**Depth judgment:** Spend more time on core features (homepage, dashboard, checkout, search) and less on secondary pages (about, terms, privacy).

**Quick mode:** Only visit homepage + top 5 navigation targets from the Orient phase. Skip the per-page checklist -- just check: loads? Console errors? Broken links visible?

### Phase 5: Document

Document each issue **immediately when found** -- don't batch them.

**Two evidence tiers:**

**Interactive bugs** (broken flows, dead buttons, form failures):
1. Take a screenshot before the action
2. Perform the action
3. Take a screenshot showing the result
4. Use `snapshot -D` to show what changed
5. Write repro steps referencing screenshots

```bash
$RKSTACK_BROWSE screenshot ".rkstack/qa-reports/screenshots/issue-001-step-1.png"
$RKSTACK_BROWSE click @e5
$RKSTACK_BROWSE screenshot ".rkstack/qa-reports/screenshots/issue-001-result.png"
$RKSTACK_BROWSE snapshot -D
```

**Static bugs** (typos, layout issues, missing images):
1. Take a single annotated screenshot showing the problem
2. Describe what's wrong

```bash
$RKSTACK_BROWSE snapshot -i -a -o ".rkstack/qa-reports/screenshots/issue-002.png"
```

**Write each issue to the report immediately.**

### Phase 6: Wrap Up

1. **Compute health score** using the rubric below
2. **Write "Top 3 Things to Fix"** -- the 3 highest-severity issues
3. **Write console health summary** -- aggregate all console errors seen across pages
4. **Update severity counts** in the summary table
5. **Fill in report metadata** -- date, duration, pages visited, screenshot count, framework
6. **Save baseline** -- write `baseline.json` with:
   ```json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   ```

**Regression mode:** After writing the report, load the baseline file. Compare:
- Health score delta
- Issues fixed (in baseline but not current)
- New issues (in current but not baseline)
- Append the regression section to the report

---

## Health Score Rubric

Compute each category score (0-100), then take the weighted average.

### Console (weight: 15%)
- 0 errors -> 100
- 1-3 errors -> 70
- 4-10 errors -> 40
- 10+ errors -> 10

### Links (weight: 10%)
- 0 broken -> 100
- Each broken link -> -15 (minimum 0)

### Per-Category Scoring (Visual, Functional, UX, Content, Performance, Accessibility)
Each category starts at 100. Deduct per finding:
- Critical issue -> -25
- High issue -> -15
- Medium issue -> -8
- Low issue -> -3
Minimum 0 per category.

### Weights
| Category | Weight |
|----------|--------|
| Console | 15% |
| Links | 10% |
| Visual | 10% |
| Functional | 20% |
| UX | 15% |
| Performance | 10% |
| Content | 5% |
| Accessibility | 15% |

### Final Score
`score = sum (category_score * weight)`

Record baseline health score at end of Phase 6.

---

## Framework-Specific Guidance

### Next.js
- Check console for hydration errors (`Hydration failed`, `Text content did not match`)
- Monitor `_next/data` requests in network -- 404s indicate broken data fetching
- Test client-side navigation (click links, don't just `goto`) -- catches routing issues
- Check for CLS (Cumulative Layout Shift) on pages with dynamic content

### Rails
- Check for N+1 query warnings in console (if development mode)
- Verify CSRF token presence in forms
- Test Turbo/Stimulus integration -- do page transitions work smoothly?
- Check for flash messages appearing and dismissing correctly

### WordPress
- Check for plugin conflicts (JS errors from different plugins)
- Verify admin bar visibility for logged-in users
- Test REST API endpoints (`/wp-json/`)
- Check for mixed content warnings (common with WP)

### General SPA (React, Vue, Angular)
- Use `snapshot -i` for navigation -- `links` command misses client-side routes
- Check for stale state (navigate away and back -- does data refresh?)
- Test browser back/forward -- does the app handle history correctly?
- Check for memory leaks (monitor console after extended use)

---

## Output Structure

```
.rkstack/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md    # Structured report
├── screenshots/
│   ├── initial.png                        # Landing page annotated screenshot
│   ├── issue-001-step-1.png               # Per-issue evidence
│   ├── issue-001-result.png
│   ├── issue-001-before.png               # Before fix (if fixed)
│   ├── issue-001-after.png                # After fix (if fixed)
│   └── ...
└── baseline.json                          # For regression mode
```

Report filenames use the domain and date: `qa-report-myapp-com-2026-03-12.md`

---

## Important Rules

1. **Repro is everything.** Every issue needs at least one screenshot. No exceptions.
2. **Verify before documenting.** Retry the issue once to confirm it's reproducible, not a fluke.
3. **Never include credentials.** Write `[REDACTED]` for passwords in repro steps.
4. **Write incrementally.** Append each issue to the report as you find it. Don't batch.
5. **Never read source code during QA phases.** Test as a user, not a developer. (Source code is read only during the fix phase.)
6. **Check console after every interaction.** JS errors that don't surface visually are still bugs.
7. **Test like a user.** Use realistic data. Walk through complete workflows end-to-end.
8. **Depth over breadth.** 5-10 well-documented issues with evidence > 20 vague descriptions.
9. **Never delete output files.** Screenshots and reports accumulate -- that's intentional.
10. **Use `snapshot -C` for tricky UIs.** Finds clickable divs that the accessibility tree misses.
11. **Show screenshots to the user.** After every `$RKSTACK_BROWSE screenshot`, `$RKSTACK_BROWSE snapshot -a -o`, or `$RKSTACK_BROWSE responsive` command, use the Read tool on the output file(s) so the user can see them inline. For `responsive` (3 files), Read all three. This is critical -- without it, screenshots are invisible to the user.
12. **Never refuse to use the browser.** When the user invokes /qa, they are requesting browser-based testing. Never suggest evals, unit tests, or other alternatives as a substitute. Even if the diff appears to have no UI changes, backend changes affect app behavior -- always open the browser and test.

---

## Phase 7: Triage

Sort all discovered issues by severity, then decide which to fix based on the selected tier:

- **Quick:** Fix critical + high only. Mark medium/low as "deferred."
- **Standard:** Fix critical + high + medium. Mark low as "deferred."
- **Exhaustive:** Fix all, including cosmetic/low severity.

Mark issues that cannot be fixed from source code (e.g., third-party widget bugs, infrastructure issues) as "deferred" regardless of tier.

---

## Phase 8: Fix Loop

For each fixable issue, in severity order:

### 8a. Locate source

```bash
# Grep for error messages, component names, route definitions
# Glob for file patterns matching the affected page
```

- Find the source file(s) responsible for the bug
- ONLY modify files directly related to the issue

### 8b. Fix

- Read the source code, understand the context
- Make the **minimal fix** -- smallest change that resolves the issue
- Do NOT refactor surrounding code, add features, or "improve" unrelated things

### 8c. Commit

```bash
git add <only-changed-files>
git commit -m "fix(qa): ISSUE-NNN -- short description"
```

- One commit per fix. Never bundle multiple fixes.
- Message format: `fix(qa): ISSUE-NNN -- short description`

### 8d. Re-test

- Navigate back to the affected page
- Take **before/after screenshot pair**
- Check console for errors
- Use `snapshot -D` to verify the change had the expected effect

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

### 8e.5. Regression Test

Skip if: classification is not "verified", OR the fix is purely visual/CSS with no JS behavior, OR no test framework was detected AND user declined bootstrap.

**1. Study the project's existing test patterns:**

Read 2-3 test files closest to the fix (same directory, same code type). Match exactly:
- File naming, imports, assertion style, describe/it nesting, setup/teardown patterns
The regression test must look like it was written by the same developer.

**2. Trace the bug's codepath, then write a regression test:**

Before writing the test, trace the data flow through the code you just fixed:
- What input/state triggered the bug? (the exact precondition)
- What codepath did it follow? (which branches, which function calls)
- Where did it break? (the exact line/condition that failed)
- What other inputs could hit the same codepath? (edge cases around the fix)

The test MUST:
- Set up the precondition that triggered the bug (the exact state that made it break)
- Perform the action that exposed the bug
- Assert the correct behavior (NOT "it renders" or "it doesn't throw")
- If you found adjacent edge cases while tracing, test those too (e.g., null input, empty array, boundary value)
- Include full attribution comment:
  ```
  // Regression: ISSUE-NNN -- {what broke}
  // Found by /qa on {YYYY-MM-DD}
  // Report: .rkstack/qa-reports/qa-report-{domain}-{date}.md
  ```

Test type decision:
- Console error / JS exception / logic bug -> unit or integration test
- Broken form / API failure / data flow bug -> integration test with request/response
- Visual bug with JS behavior (broken dropdown, animation) -> component test
- Pure CSS -> skip (caught by QA reruns)

Generate unit tests. Mock all external dependencies (DB, API, Redis, file system).

Use auto-incrementing names to avoid collisions: check existing `{name}.regression-*.test.{ext}` files, take max number + 1.

**3. Run only the new test file:**

```bash
{detected test command} {new-test-file}
```

**4. Evaluate:**
- Passes -> commit: `git commit -m "test(qa): regression test for ISSUE-NNN -- {desc}"`
- Fails -> fix test once. Still failing -> delete test, defer.
- Taking >2 min exploration -> skip and defer.

**5. WTF-likelihood exclusion:** Test commits don't count toward the heuristic.

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

**Hard cap: 50 fixes.** After 50 fixes, stop regardless of remaining issues.

---

## Phase 9: Final QA

After all fixes are applied:

1. Re-run QA on all affected pages
2. Compute final health score
3. **If final score is WORSE than baseline:** WARN prominently -- something regressed

---

## Phase 10: Report

Write the report to `.rkstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`.

**Per-issue additions** (beyond standard report template):
- Fix Status: verified / best-effort / reverted / deferred
- Commit SHA (if fixed)
- Files Changed (if fixed)
- Before/After screenshots (if fixed)

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

## Top 3 Things to Fix
1. [most impactful issue]
2. [second most impactful]
3. [third most impactful]

## Issues

### ISSUE-001: [title]
- **Severity:** [critical/high/medium/low]
- **Category:** [console/links/visual/functional/ux/performance/content/accessibility]
- **Page:** [url]
- **Description:** [what is broken]
- **Repro Steps:**
  1. Navigate to [url]
  2. [action]
  3. [expected vs actual]
- **Fix Status:** [verified/best-effort/reverted/deferred]
- **Commit:** [SHA if fixed]
- **Files Changed:** [list if fixed]
- **Screenshots:**
  - Before: [path]
  - After: [path]
- **Console Errors:** [relevant errors, if any]

[repeat for each issue]

## Health Score Breakdown
| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Console | X/100 | 15% | X |
| Links | X/100 | 10% | X |
| Visual | X/100 | 10% | X |
| Functional | X/100 | 20% | X |
| UX | X/100 | 15% | X |
| Performance | X/100 | 10% | X |
| Content | X/100 | 5% | X |
| Accessibility | X/100 | 15% | X |
| **Total** | | | **X%** |

## Console Health Summary
[aggregate all console errors seen across pages]

## Ship Readiness
[Ready to ship / Needs attention -- summary]

## PR Summary
> "QA found N issues, fixed M, health score X -> Y."
```

---

## Phase 11: TODOS.md Update

If the repo has a `TODOS.md`:

1. **New deferred bugs** -> add as TODOs with severity, category, and repro steps
2. **Fixed bugs that were in TODOS.md** -> annotate with "Fixed by /qa on {branch}, {date}"

---

## Supabase data verification

If `HAS_SUPABASE=yes` (from session context), the project uses Supabase as its backend. After testing actions that modify data (form submissions, cart operations, account changes):

1. Use the Supabase MCP tools to verify the data was written correctly to the database
2. Check that RLS (Row Level Security) policies are enforced -- try accessing data as an unauthenticated user via MCP and verify it's blocked
3. After testing auth flows, verify the session exists in Supabase auth tables

This bridges browser testing (what the user sees) with database verification (what actually happened).

---

## Additional Rules (qa-specific)

13. **Clean working tree required.** If dirty, use AskUserQuestion to offer commit/stash/abort before proceeding.
14. **One commit per fix.** Never bundle multiple fixes into one commit.
15. **Only modify tests when generating regression tests in Phase 8e.5.** Never modify CI configuration. Never modify existing tests -- only create new test files.
16. **Revert on regression.** If a fix makes things worse, `git revert HEAD` immediately.
17. **Self-regulate.** Follow the WTF-likelihood heuristic. When in doubt, stop and ask.
18. **Never hardcode test commands.** Read from CLAUDE.md or auto-detect.
19. **Never skip dev server discovery.** If no URL is given, check CLAUDE.md first, then ask.
