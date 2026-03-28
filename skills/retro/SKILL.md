---
name: retro
argument-hint: "[24h|7d|14d|30d|compare]"
preamble-tier: 2
version: 1.0.0
description: |
  Weekly engineering retrospective. Analyzes commit history, work patterns,
  and code quality metrics. Supports time windows: /retro [24h|7d|14d|30d].
  Tracks trends across retros. Use for team health, focus scoring, and
  identifying hotspots.
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (retro) ===

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

## Arguments

Parse the following: $ARGUMENTS

If no arguments provided, default to `7d` (last 7 days).

# /retro — Engineering Retrospective

Generates a comprehensive engineering retrospective analyzing commit history, work patterns, and code quality metrics. Team-aware: identifies the user running the command, then analyzes every contributor with per-person praise and growth opportunities.

## User-invocable
When the user types `/retro`, run this skill.

## Arguments

- `/retro` — default: last 7 days
- `/retro 24h` — last 24 hours
- `/retro 14d` — last 14 days
- `/retro 30d` — last 30 days
- `/retro compare` — compare current window vs prior same-length window
- `/retro compare 14d` — compare with explicit window

## Instructions

Parse the argument to determine the time window. Default to 7 days if no argument given. All times should be reported in the user's **local timezone** (use the system default — do NOT set `TZ`).

**Midnight-aligned windows:** For day (`d`) and week (`w`) units, compute an absolute start date at local midnight, not a relative string. For example, if today is 2026-03-27 and the window is 7 days: the start date is 2026-03-20. Use `--since="2026-03-20T00:00:00"` for git log queries — the explicit `T00:00:00` suffix ensures git starts from midnight. Without it, git uses the current wall-clock time (e.g., `--since="2026-03-20"` at 11pm means 11pm, not midnight). For week units, multiply by 7 to get days (e.g., `2w` = 14 days back). For hour (`h`) units, use `--since="N hours ago"` since midnight alignment does not apply to sub-day windows.

**Argument validation:** If the argument doesn't match a number followed by `d`, `h`, or `w`, or the word `compare` (optionally followed by a window), show this usage and stop:
```
Usage: /retro [window | compare]
  /retro              — last 7 days (default)
  /retro 24h          — last 24 hours
  /retro 14d          — last 14 days
  /retro 30d          — last 30 days
  /retro compare      — compare this period vs prior period
  /retro compare 14d  — compare with explicit window
```

---

### Step 1: Gather Raw Data

First, fetch origin and identify the current user and default branch:
```bash
# Detect default branch
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
[ -z "$DEFAULT_BRANCH" ] && DEFAULT_BRANCH=$(git branch -r | grep -E 'origin/(main|master)' | head -1 | sed 's|.*origin/||' | tr -d ' ')
[ -z "$DEFAULT_BRANCH" ] && DEFAULT_BRANCH="main"
echo "DEFAULT_BRANCH: $DEFAULT_BRANCH"

git fetch origin "$DEFAULT_BRANCH" --quiet

# Identify who is running the retro
git config user.name
git config user.email
```

The name returned by `git config user.name` is **"you"** — the person reading this retro. All other authors are teammates. Use this to orient the narrative: "your" commits vs teammate contributions.

Run ALL of these git commands in parallel (they are independent):

```bash
# 1. All commits in window with timestamps, subject, hash, author, files changed, insertions, deletions
git log origin/<default> --since="<window>" --format="%H|%aN|%ae|%ai|%s" --shortstat

# 2. Per-commit test vs total LOC breakdown with author
#    Each commit block starts with COMMIT:<hash>|<author>, followed by numstat lines.
#    Separate test files (matching test/|spec/|__tests__/) from production files.
git log origin/<default> --since="<window>" --format="COMMIT:%H|%aN" --numstat

# 3. Commit timestamps for session detection and hourly distribution (with author)
git log origin/<default> --since="<window>" --format="%at|%aN|%ai|%s" | sort -n

# 4. Files most frequently changed (hotspot analysis)
git log origin/<default> --since="<window>" --format="" --name-only | grep -v '^$' | sort | uniq -c | sort -rn

# 5. PR/MR numbers from commit messages (GitHub #NNN, GitLab !NNN)
git log origin/<default> --since="<window>" --format="%s" | grep -oE '[#!][0-9]+' | sort -t'#' -k1 | uniq

# 6. Per-author file hotspots (who touches what)
git log origin/<default> --since="<window>" --format="AUTHOR:%aN" --name-only

# 7. Per-author commit counts (quick summary)
git shortlog origin/<default> --since="<window>" -sn --no-merges

# 8. TODOS.md backlog (if available)
cat TODOS.md 2>/dev/null || true

# 9. Test file count
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' 2>/dev/null | grep -v node_modules | wc -l

# 10. Test files changed in window
git log origin/<default> --since="<window>" --format="" --name-only | grep -E '\.(test|spec)\.' | sort -u | wc -l
```

If `gh` CLI is available, also gather PR data:

```bash
# PR count in window (if gh is available)
gh pr list --state merged --base <default> --search "merged:>=<start-date>" --json number,title,additions,deletions --limit 100 2>/dev/null || echo "GH_UNAVAILABLE"
```

---

### Step 2: Metrics Summary Table

Calculate and present these metrics in a summary table:

| Metric | Value |
|--------|-------|
| Commits to main | N |
| Contributors | N |
| PRs merged | N |
| Total insertions | N |
| Total deletions | N |
| Net LOC added | N |
| Test LOC (insertions) | N |
| Test LOC ratio | N% |
| Version range | vX.Y.Z → vX.Y.Z |
| Active days | N |
| Detected sessions | N |
| Avg LOC/session-hour | N |
| Test Health | N total tests, M changed this period |

Then show a **per-author leaderboard** immediately below:

```
Contributor         Commits   +/-          Top area
You (name)               32   +2400/-300   src/
alice                    12   +800/-150    lib/
bob                       3   +120/-40     tests/
```

Sort by commits descending. The current user (from `git config user.name`) always appears first, labeled "You (name)".

**Backlog Health (if TODOS.md exists):** Read `TODOS.md` (fetched in Step 1, command 8). Compute:
- Total open TODOs (exclude items in `## Completed` section)
- High-priority count (P0/P1 items)
- Items completed this period (items in Completed section with dates within the retro window)
- Items added this period (cross-reference git log for commits that modified TODOS.md within the window)

Include in the metrics table:
```
| Backlog Health | N open (X high-priority) · Z completed this period |
```

If TODOS.md doesn't exist, skip the Backlog Health row.

---

### Step 3: Commit Time Distribution

Show hourly histogram in local time using bar chart:

```
Hour  Commits  ________________
 00:    4      ||||
 07:    5      |||||
 ...
```

Identify and call out:
- Peak hours
- Dead zones
- Whether pattern is bimodal (morning/evening) or continuous
- Late-night coding clusters (after 10pm)

---

### Step 4: Work Session Detection

Detect sessions using **45-minute gap** threshold between consecutive commits. For each session report:
- Start/end time (local timezone)
- Number of commits
- Duration in minutes

Classify sessions:
- **Deep sessions** (50+ min)
- **Medium sessions** (20-50 min)
- **Micro sessions** (<20 min, typically single-commit fire-and-forget)

Calculate:
- Total active coding time (sum of session durations)
- Average session length
- LOC per hour of active time

---

### Step 5: Commit Type Breakdown

Categorize by conventional commit prefix (feat/fix/refactor/test/chore/docs). Show as percentage bar:

```
feat:     20  (40%)  ||||||||||||||||||||
fix:      27  (54%)  |||||||||||||||||||||||||||
refactor:  2  ( 4%)  ||
```

Flag if fix ratio exceeds 50% — this signals a "ship fast, fix fast" pattern that may indicate review gaps.

---

### Step 6: Hotspot Analysis

Show top 10 most-changed files. Flag:
- Files changed 5+ times (churn hotspots)
- Test files vs production files in the hotspot list
- VERSION/CHANGELOG frequency (version discipline indicator)

---

### Step 7: Focus Score + Ship of the Week

**Focus score:** Calculate the percentage of commits touching the single most-changed top-level directory (e.g., `src/`, `lib/`). Higher score = deeper focused work. Lower score = scattered context-switching. Report as: "Focus score: 62% (src/)"

**Ship of the week:** Auto-identify the single highest-LOC PR (or commit group) in the window. Highlight it:
- PR number and title (or commit subject if no PR data)
- LOC changed
- Why it matters (infer from commit messages and files touched)

---

### Step 8: Team Member Analysis

**If collaborative repo** (`REPO_MODE` from preamble is `collaborative`):

For each contributor (including the current user), compute:

1. **Commits and LOC** — total commits, insertions, deletions, net LOC
2. **Areas of focus** — which directories/files they touched most (top 3)
3. **Commit type mix** — their personal feat/fix/refactor/test breakdown
4. **Session patterns** — when they code (their peak hours), session count
5. **Test discipline** — their personal test LOC ratio
6. **Biggest ship** — their single highest-impact commit or PR in the window

**For the current user ("You"):** This section gets the deepest treatment. Include all the detail from the solo retro — session analysis, time patterns, focus score. Frame it in first person: "Your peak hours...", "Your biggest ship..."

**For each teammate:** Write 2-3 sentences covering what they worked on and their pattern. Then:

- **Praise** (1-2 specific things): Anchor in actual commits. Not "great work" — say exactly what was good. Examples: "Shipped the entire auth middleware rewrite in 3 focused sessions with 45% test coverage", "Every PR under 200 LOC — disciplined decomposition."
- **Opportunity for growth** (1 specific thing): Frame as a leveling-up suggestion, not criticism. Anchor in actual data. Examples: "Test ratio was 12% this week — adding test coverage to the payment module before it gets more complex would pay off", "5 fix commits on the same file suggest the original PR could have used a review pass."

**If solo repo:** Skip the team breakdown and proceed to personal insights only — the retro is personal.

**If there are Co-Authored-By trailers:** Parse `Co-Authored-By:` lines in commit messages. Credit those authors for the commit alongside the primary author. Note AI co-authors (e.g., `noreply@anthropic.com`) but do not include them as team members — instead, track "AI-assisted commits" as a separate metric.

---

### Step 9: Trends vs Prior Retro

Before saving the new snapshot, check for prior retro history:

```bash
ls -t .context/retros/*.json 2>/dev/null
```

**If prior retros exist:** Load the most recent one using the Read tool. Calculate deltas for key metrics and include a **Trends vs Last Retro** section:
```
                    Last        Now         Delta
Test ratio:         22%    ->    41%         +19pp
Sessions:           10     ->    14          +4
LOC/hour:           200    ->    350         +75%
Fix ratio:          54%    ->    30%         -24pp (improving)
Commits:            32     ->    47          +47%
Deep sessions:      3      ->    5           +2
```

**If no prior retros exist:** Skip the comparison section and append: "First retro recorded — run again next week to see trends."

---

### Step 10: Save & Output

**Save a JSON snapshot:**

```bash
mkdir -p .context/retros
```

Determine the next sequence number for today:
```bash
today=$(date +%Y-%m-%d)
existing=$(ls .context/retros/${today}-*.json 2>/dev/null | wc -l | tr -d ' ')
next=$((existing + 1))
# Save as .context/retros/${today}-${next}.json
```

Use the Write tool to save the JSON file with this schema:
```json
{
  "date": "2026-03-27",
  "window": "7d",
  "metrics": {
    "commits": 47,
    "contributors": 3,
    "prs_merged": 12,
    "insertions": 3200,
    "deletions": 800,
    "net_loc": 2400,
    "test_loc": 1300,
    "test_ratio": 0.41,
    "active_days": 6,
    "sessions": 14,
    "deep_sessions": 5,
    "avg_session_minutes": 42,
    "loc_per_session_hour": 350,
    "feat_pct": 0.40,
    "fix_pct": 0.30,
    "peak_hour": 22,
    "ai_assisted_commits": 32
  },
  "authors": {
    "Alice": { "commits": 32, "insertions": 2400, "deletions": 300, "test_ratio": 0.41, "top_area": "src/" },
    "Bob": { "commits": 12, "insertions": 800, "deletions": 150, "test_ratio": 0.35, "top_area": "lib/" }
  },
  "version_range": ["1.0.0", "1.2.0"],
  "tweetable": "Week of Mar 20: 47 commits (3 contributors), 3.2k LOC, 38% tests, 12 PRs, peak: 10pm"
}
```

**Note:** Only include the `backlog` field if `TODOS.md` exists. Only include the `test_health` field if test files were found (command 9 returns > 0). If either has no data, omit the field entirely.

Include test health data in the JSON when test files exist:
```json
  "test_health": {
    "total_test_files": 47,
    "test_files_changed": 8
  }
```

Include backlog data in the JSON when TODOS.md exists:
```json
  "backlog": {
    "total_open": 28,
    "high_priority": 2,
    "completed_this_period": 3,
    "added_this_period": 1
  }
```

**Write the narrative** — structure the output as:

---

**Tweetable summary** (first line, before everything else):
```
Week of Mar 20: 47 commits (3 contributors), 3.2k LOC, 38% tests, 12 PRs, peak: 10pm
```

## Engineering Retro: [date range]

### Summary Table
(from Step 2)

### Trends vs Last Retro
(from Step 9, loaded before save — skip if first retro)

### Time & Session Patterns
(from Steps 3-4)

Narrative interpreting what the patterns mean:
- When the most productive hours are and what drives them
- Whether sessions are getting longer or shorter over time
- Estimated hours per day of active coding
- Notable patterns: do team members code at the same time or in shifts?

### Shipping Velocity
(from Steps 5-6)

Narrative covering:
- Commit type mix and what it reveals
- Fix-chain detection (sequences of fix commits on the same subsystem)
- Version bump discipline

### Code Quality Signals
- Test LOC ratio trend
- Hotspot analysis (are the same files churning?)

### Test Health
- Total test files: N (from command 9)
- Tests changed this period: M (from command 10)
- If prior retro exists and has `test_health`: show delta "Test count: {last} -> {now} (+{delta})"
- If test ratio < 20%: flag as growth area — "Test coverage is worth investing in. Tests make fast iteration safe."

### Focus & Highlights
(from Step 7)
- Focus score with interpretation
- Ship of the week callout

### Your Week (personal deep-dive)
(from Step 8, for the current user only)

This is the section the user cares most about. Include:
- Their personal commit count, LOC, test ratio
- Their session patterns and peak hours
- Their focus areas
- Their biggest ship
- **What you did well** (2-3 specific things anchored in commits)
- **Where to level up** (1-2 specific, actionable suggestions)

### Team Breakdown
(from Step 8, for each teammate — skip if solo repo)

For each teammate (sorted by commits descending), write a section:

#### [Name]
- **What they shipped**: 2-3 sentences on their contributions, areas of focus, and commit patterns
- **Praise**: 1-2 specific things they did well, anchored in actual commits. Be genuine — what would you actually say in a 1:1?
- **Opportunity for growth**: 1 specific, constructive suggestion. Frame as investment, not criticism.

**AI collaboration note:** If many commits have `Co-Authored-By` AI trailers (e.g., Claude, Copilot), note the AI-assisted commit percentage as a team metric. Frame it neutrally — "N% of commits were AI-assisted" — without judgment.

### Top 3 Wins
Identify the 3 highest-impact things shipped in the window. For each:
- What it was
- Who shipped it
- Why it matters (product/architecture impact)

### 3 Things to Improve
Specific, actionable, anchored in actual commits. Mix personal and team-level suggestions. Phrase as "to get even better..."

### 3 Habits for Next Week
Small, practical, realistic. Each must be something that takes <5 minutes to adopt. At least one should be team-oriented if collaborative repo.

---

## Compare Mode

When the user runs `/retro compare` (or `/retro compare 14d`):

1. Compute metrics for the current window (default 7d) using the midnight-aligned start date
2. Compute metrics for the immediately prior same-length window using both `--since` and `--until` with midnight-aligned dates to avoid overlap
3. Show a side-by-side comparison table with deltas and direction indicators
4. Write a brief narrative highlighting the biggest improvements and regressions
5. Save only the current-window snapshot to `.context/retros/` (same as a normal retro run); do **not** persist the prior-window metrics

---

## Tone

- Encouraging but candid, no coddling
- Specific and concrete — always anchor in actual commits/code
- Skip generic praise ("great job!") — say exactly what was good and why
- Frame improvements as leveling up, not criticism
- **Praise should feel like something you'd actually say in a 1:1** — specific, earned, genuine
- **Growth suggestions should feel like investment advice** — "this is worth your time because..." not "you failed at..."
- Never compare teammates against each other negatively. Each person's section stands on its own.
- Keep total output around 3000-4500 words (slightly longer to accommodate team sections)
- Use markdown tables and code blocks for data, prose for narrative
- Apply **humanizer** constraints for all narrative sections — the retro is human-facing prose
- Output directly to the conversation — do NOT write to filesystem (except the `.context/retros/` JSON snapshot)

## Important Rules

- ALL narrative output goes directly to the user in the conversation. The ONLY file written is the `.context/retros/` JSON snapshot.
- Use `origin/<default>` for all git queries (not local main which may be stale)
- Display all timestamps in the user's local timezone (do not override `TZ`)
- If the window has zero commits, say so and suggest a different window
- Round LOC/hour to nearest 50
- Treat merge commits as PR boundaries
- Do not read CLAUDE.md or other docs — this skill is self-contained
- On first run (no prior retros), skip comparison sections gracefully
