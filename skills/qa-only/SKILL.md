---
name: qa-only
preamble-tier: 4
version: 1.0.0
description: |
  Report-only QA testing. Systematically tests a web application and produces a
  structured report with health score, screenshots, and repro steps -- but never
  fixes anything. Use when asked to "just report bugs", "qa report only", or
  "test but don't fix". For the full test-fix-verify loop, use /qa instead.
  Proactively suggest when the user wants a bug report without any code changes.
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
  - WebSearch
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (qa-only) ===

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
- **TypeScript/JavaScript** — see `detection.projectType` (web or node). If web: check React/Vue/Svelte patterns, responsive design, component architecture. If node: CLI tools, MCP servers, backend scripts.
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
- Read `detection.langs` for project scale (files, lines of code, complexity per language).
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

# /qa-only: Report-Only QA Testing

You are a QA engineer. Test web applications like a real user -- click everything, fill every form, check every state. Produce a structured report with evidence. **NEVER fix anything.**

**Hard anti-patterns -- things you must NEVER do in /qa-only:**
- NEVER read source code, edit files, or suggest fixes in the report
- NEVER open source files to diagnose bugs -- test as a user, not a developer
- NEVER modify any file except the report and screenshots in the output directory
- NEVER suggest code changes in the report body -- say what is broken, not how to fix it
- NEVER run `git add`, `git commit`, or any git write commands

Your job is to report what is broken from the user's perspective, not to diagnose root causes in code. For the full test-fix-verify loop, use `/qa` instead.

## Setup

**Parse the user's request for these parameters:**

| Parameter | Default | Override example |
|-----------|---------|-----------------:|
| Target URL | (auto-detect or required) | `https://myapp.com`, `http://localhost:3000` |
| Mode | full | `--quick`, `--regression .rkstack/qa-reports/baseline.json` |
| Output dir | `.rkstack/qa-reports/` | `Output to /tmp/qa` |
| Scope | Full app (or diff-scoped) | `Focus on the billing page` |
| Auth | None | `Sign in to user@example.com`, `Import cookies from cookies.json` |

**If no URL is given and you're on a feature branch:** Automatically enter **diff-aware mode** (see Modes below). This is the most common case -- the user just shipped code on a branch and wants to verify it works.

**Dev server discovery:**

Check CLAUDE.md for dev server configuration:

```bash
grep -E "^(Dev server|Dev URL|dev.server|dev.url):" CLAUDE.md 2>/dev/null || echo "NO_DEV_CONFIG"
```

If no dev server config is found and no URL was provided, use AskUserQuestion:

> **Re-ground:** No dev server configuration found in CLAUDE.md.
>
> **Simplify:** I need a URL to test against.
>
> **RECOMMENDATION:** Tell me your dev server URL so I can save it to CLAUDE.md for next time.
>
> A) My dev server runs at `___`
> B) Test a deployed URL: `___`

**Find the browse binary:**

The browse binary path is injected into session context by the session-start hook. Look for `RKSTACK_BROWSE=<path>` at the top of this conversation.

If `RKSTACK_BROWSE` is set, use it directly. For the rest of this skill, `$RKSTACK_BROWSE` refers to the browse binary.

If `RKSTACK_BROWSE=UNAVAILABLE` or not set, tell the user: "The browse binary is not available. Install it with the rkstack release for your platform." and stop.

**Create output directories:**

```bash
mkdir -p .rkstack/qa-reports/screenshots
```

---

## Test Plan Context

Before falling back to git diff heuristics, check for richer test plan sources:

1. **Prior QA reports:** Check `.rkstack/qa-reports/` for recent reports for this repo
   ```bash
   setopt +o nomatch 2>/dev/null || true  # zsh compat
   ls -t .rkstack/qa-reports/qa-report-*.md 2>/dev/null | head -1
   ```
2. **Conversation context:** Check if a prior review skill produced test plan output in this conversation
3. **Use whichever source is richer.** Fall back to git diff analysis only if neither is available.

---

## Modes

### Diff-aware (automatic when on a feature branch with no URL)

This is the **primary mode** for developers verifying their work. When the user says `/qa-only` without a URL and the repo is on a feature branch, automatically:

1. **Analyze the branch diff** to understand what changed:
   ```bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   ```

2. **Identify affected pages/routes** from the changed files:
   - Controller/route files -> which URL paths they serve
   - View/template/component files -> which pages render them
   - Model/service files -> which pages use those models (check controllers that reference them)
   - CSS/style files -> which pages include those stylesheets
   - API endpoints -> test them directly with `$RKSTACK_BROWSE js "await fetch('/api/...')"`
   - Static pages (markdown, HTML) -> navigate to them directly

   **If no obvious pages/routes are identified from the diff:** Do not skip browser testing. The user invoked /qa-only because they want browser-based verification. Fall back to Quick mode -- navigate to the homepage, follow the top 5 navigation targets, check console for errors, and test any interactive elements found. Backend, config, and infrastructure changes affect app behavior -- always verify the app still works.

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

## Report

Write the report to `.rkstack/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`.

Report template:

```markdown
# QA Report (Report Only) -- [domain] -- [YYYY-MM-DD]

## Summary
- **URL:** [target url]
- **Mode:** [full/quick/diff-aware/regression]
- **Duration:** [time taken]
- **Pages Visited:** [count]
- **Framework:** [detected framework or "unknown"]
- **Health Score:** [score]%
- **Issues Found:** [total] (critical: X, high: Y, medium: Z, low: W)

## Top 3 Things to Fix
1. [most impactful issue]
2. [second most impactful]
3. [third most impactful]

## Issues

### ISSUE-001: [title]
- **Severity:** [critical/high/medium/low]
- **Category:** [console/links/visual/functional/ux/performance/content/accessibility]
- **Page:** [url]
- **Description:** [what the user sees that is broken]
- **Repro Steps:**
  1. Navigate to [url]
  2. [action]
  3. [expected vs actual]
- **Screenshot:** [path]
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

## Recommendation
[Overall assessment. Suggest running /qa for the full test-fix-verify loop.]
```

---

## Output Structure

```
.rkstack/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md    # Structured report
├── screenshots/
│   ├── initial.png                        # Landing page annotated screenshot
│   ├── issue-001-step-1.png               # Per-issue evidence
│   ├── issue-001-result.png
│   └── ...
└── baseline.json                          # For regression mode
```

Report filenames use the domain and date: `qa-report-myapp-com-2026-03-12.md`

---

## Additional Rules

1. **Never fix bugs.** Find and document only. Do not read source code, edit files, or suggest fixes in the report. Your job is to report what's broken from the user's perspective, not to fix it. Use `/qa` for the test-fix-verify loop.
2. **Always show screenshots.** After every screenshot command, use the Read tool on the PNG file so the user can see it.
3. **Include repro steps for every issue.** Each issue must have step-by-step reproduction instructions that anyone can follow.
4. **Severity must be justified.** For each issue, explain why it has the assigned severity.
5. **Never skip dev server discovery.** If no URL is given, check CLAUDE.md first, then ask.
6. **Verify before documenting.** Retry the issue once to confirm it's reproducible, not a fluke.
7. **Write incrementally.** Append each issue to the report as you find it. Don't batch.
8. **Depth over breadth.** 5-10 well-documented issues with evidence > 20 vague descriptions.
9. **Check console after every interaction.** JS errors that don't surface visually are still bugs.
10. **Use `snapshot -C` for tricky UIs.** Finds clickable divs that the accessibility tree misses.
11. **Never refuse to use the browser.** When the user invokes /qa-only, they are requesting browser-based testing. Never suggest evals, unit tests, or other alternatives as a substitute. Even if the diff appears to have no UI changes, backend changes affect app behavior -- always open the browser and test.
12. **No test framework detected?** If the project has no test infrastructure (no test config files, no test directories), include in the report summary: "No test framework detected. Run `/qa` to bootstrap one and enable regression test generation."
