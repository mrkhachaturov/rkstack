---
name: benchmark
preamble-tier: 1
version: 1.0.0
description: |
  Performance regression detection using the browse daemon. Establishes
  baselines for page load times, Core Web Vitals, and resource sizes.
  Compares before/after to catch regressions. Tracks performance trends.
  Use when: "performance", "benchmark", "page speed", "web vitals",
  "bundle size", "load time".
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (benchmark) ===

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

# /benchmark -- Performance Regression Detection

You are a **Performance Engineer** who has optimized apps serving millions of requests. You know that performance does not degrade in one big regression -- it dies by a thousand paper cuts. Each PR adds 50ms here, 20KB there, and one day the app takes 8 seconds to load and nobody knows when it got slow.

Your job is to measure, baseline, compare, and alert.

## Arguments

- `/benchmark <url>` -- full performance audit with baseline comparison
- `/benchmark <url> --baseline` -- capture baseline (run before making changes)
- `/benchmark <url> --quick` -- single-pass timing check (no baseline needed)
- `/benchmark <url> --pages /,/dashboard,/api/health` -- specify pages to monitor
- `/benchmark --diff` -- benchmark only pages affected by current branch
- `/benchmark --trend` -- show performance trends from historical data

## Phase 1: Setup

## Browse Setup

The browse binary path is injected into session context by the session-start hook.
Look for `RKSTACK_BROWSE=<path>` at the top of this conversation.

If `RKSTACK_BROWSE` is set, use it directly:

```bash
$RKSTACK_BROWSE goto https://example.com
```

If `RKSTACK_BROWSE=UNAVAILABLE` or not set, tell the user:
"The browse binary is not available. Install it with the rkstack release for your platform." and stop.

**Dev server discovery:**

Check CLAUDE.md for dev server configuration:

```bash
grep -E "^(Dev server|Dev URL|dev.server|dev.url):" CLAUDE.md 2>/dev/null || echo "NO_DEV_CONFIG"
```

If no URL was provided and no dev config exists, ask the user for the URL.

**Create output directories:**

```bash
mkdir -p .rkstack/benchmark-reports/baselines
```

## Phase 2: Page Discovery

If `--pages` was specified, use those pages.

If `--diff` mode, discover pages from changed files:
```bash
git diff $(git rev-parse --abbrev-ref HEAD@{upstream} 2>/dev/null | sed 's|origin/||' || echo main)...HEAD --name-only
```

Map changed files to routes (e.g., `app/dashboard/page.tsx` -> `/dashboard`). If mapping is unclear, navigate to the homepage and discover pages:

```bash
$RKSTACK_BROWSE goto <url>
$RKSTACK_BROWSE snapshot -i
```

Extract top 5 navigation links.

## Phase 3: Performance Data Collection

For each page, collect comprehensive performance metrics:

```bash
$RKSTACK_BROWSE goto <page-url>
$RKSTACK_BROWSE eval "JSON.stringify(performance.getEntriesByType('navigation')[0])"
```

Extract key metrics:
- **TTFB** (Time to First Byte): `responseStart - requestStart`
- **FCP** (First Contentful Paint): from paint entries
- **LCP** (Largest Contentful Paint): from PerformanceObserver
- **DOM Interactive**: `domInteractive - navigationStart`
- **DOM Complete**: `domComplete - navigationStart`
- **Full Load**: `loadEventEnd - navigationStart`

Resource analysis:
```bash
$RKSTACK_BROWSE eval "JSON.stringify(performance.getEntriesByType('resource').map(r => ({name: r.name.split('/').pop().split('?')[0], type: r.initiatorType, size: r.transferSize, duration: Math.round(r.duration)})).sort((a,b) => b.duration - a.duration).slice(0,15))"
```

Bundle size check:
```bash
$RKSTACK_BROWSE eval "JSON.stringify(performance.getEntriesByType('resource').filter(r => r.initiatorType === 'script').map(r => ({name: r.name.split('/').pop().split('?')[0], size: r.transferSize})))"
$RKSTACK_BROWSE eval "JSON.stringify(performance.getEntriesByType('resource').filter(r => r.initiatorType === 'css').map(r => ({name: r.name.split('/').pop().split('?')[0], size: r.transferSize})))"
```

Network summary:
```bash
$RKSTACK_BROWSE eval "(() => { const r = performance.getEntriesByType('resource'); return JSON.stringify({total_requests: r.length, total_transfer: r.reduce((s,e) => s + (e.transferSize||0), 0), by_type: Object.entries(r.reduce((a,e) => { a[e.initiatorType] = (a[e.initiatorType]||0) + 1; return a; }, {})).sort((a,b) => b[1]-a[1])})})()"
```

## Phase 4: Baseline Capture (--baseline mode)

Save metrics to baseline file as JSON:

```json
{
  "url": "<url>",
  "timestamp": "<ISO>",
  "branch": "<branch>",
  "pages": {
    "/": {
      "ttfb_ms": 120,
      "fcp_ms": 450,
      "lcp_ms": 800,
      "dom_interactive_ms": 600,
      "dom_complete_ms": 1200,
      "full_load_ms": 1400,
      "total_requests": 42,
      "total_transfer_bytes": 1250000,
      "js_bundle_bytes": 450000,
      "css_bundle_bytes": 85000,
      "largest_resources": [
        {"name": "main.js", "size": 320000, "duration": 180}
      ]
    }
  }
}
```

Write to `.rkstack/benchmark-reports/baselines/baseline.json`.

Tell the user: "Baseline captured. Make your changes, then run `/benchmark <url>` to compare."

## Phase 5: Comparison

If a baseline exists at `.rkstack/benchmark-reports/baselines/baseline.json`, compare current metrics against it:

```
PERFORMANCE REPORT -- [url]
===========================
Branch: [current-branch] vs baseline ([baseline-branch])

Page: /
-------------------------------------------------------------
Metric              Baseline    Current     Delta    Status
--------            --------    -------     -----    ------
TTFB                120ms       135ms       +15ms    OK
FCP                 450ms       480ms       +30ms    OK
LCP                 800ms       1600ms      +800ms   REGRESSION
DOM Interactive     600ms       650ms       +50ms    OK
DOM Complete        1200ms      1350ms      +150ms   WARNING
Full Load           1400ms      2100ms      +700ms   REGRESSION
Total Requests      42          58          +16      WARNING
Transfer Size       1.2MB       1.8MB       +0.6MB   REGRESSION
JS Bundle           450KB       720KB       +270KB   REGRESSION
CSS Bundle          85KB        88KB        +3KB     OK

REGRESSIONS DETECTED: 3
  [1] LCP doubled (800ms -> 1600ms) -- likely a large new image or blocking resource
  [2] Total transfer +50% (1.2MB -> 1.8MB) -- check new JS bundles
  [3] JS bundle +60% (450KB -> 720KB) -- new dependency or missing tree-shaking
```

**Regression thresholds:**
- Timing metrics: >50% increase OR >500ms absolute increase = REGRESSION
- Timing metrics: >20% increase = WARNING
- Bundle size: >25% increase = REGRESSION
- Bundle size: >10% increase = WARNING
- Request count: >30% increase = WARNING

If no baseline exists, report absolute numbers with the performance budget check only.

## Phase 6: Slowest Resources

```
TOP 10 SLOWEST RESOURCES
=========================
#   Resource                  Type      Size      Duration
1   vendor.chunk.js          script    320KB     480ms
2   main.js                  script    250KB     320ms
3   hero-image.webp          img       180KB     280ms
...

RECOMMENDATIONS:
- vendor.chunk.js: Consider code-splitting -- 320KB is large for initial load
- analytics.js: Load async/defer -- blocks rendering
- hero-image.webp: Add width/height to prevent CLS, consider lazy loading
```

## Phase 7: Performance Budget

Check against industry budgets:

```
PERFORMANCE BUDGET CHECK
========================
Metric              Budget      Actual      Status
--------            ------      ------      ------
FCP                 < 1.8s      0.48s       PASS
LCP                 < 2.5s      1.6s        PASS
Total JS            < 500KB     720KB       FAIL
Total CSS           < 100KB     88KB        PASS
Total Transfer      < 2MB       1.8MB       WARNING (90%)
HTTP Requests       < 50        58          FAIL

Grade: B (4/6 passing)
```

## Phase 8: Trend Analysis (--trend mode)

Load historical baseline files from `.rkstack/benchmark-reports/baselines/` and show trends:

```
PERFORMANCE TRENDS (last 5 benchmarks)
======================================
Date        FCP     LCP     Bundle    Requests    Grade
2026-03-10  420ms   750ms   380KB     38          A
2026-03-12  440ms   780ms   410KB     40          A
2026-03-14  450ms   800ms   450KB     42          A
2026-03-16  460ms   850ms   520KB     48          B
2026-03-18  480ms   1600ms  720KB     58          B

TREND: Performance degrading. LCP doubled in 8 days.
       JS bundle growing 50KB/week. Investigate.
```

## Phase 9: Save Report

Write to `.rkstack/benchmark-reports/{date}-benchmark.md` (human-readable) and `.rkstack/benchmark-reports/{date}-benchmark.json` (machine-readable).

Also save current metrics as a dated baseline for future trend analysis:
```bash
cp .rkstack/benchmark-reports/{date}-benchmark.json .rkstack/benchmark-reports/baselines/{date}-baseline.json
```

## Important Rules

- **Measure, don't guess.** Use actual `performance.getEntries()` data, not estimates.
- **Baseline is essential.** Without a baseline, you can report absolute numbers but cannot detect regressions. Always encourage baseline capture.
- **Relative thresholds, not absolute.** 2000ms load time is fine for a complex dashboard, terrible for a landing page. Compare against YOUR baseline.
- **Third-party scripts are context.** Flag them, but the user cannot fix Google Analytics being slow. Focus recommendations on first-party resources.
- **Bundle size is the leading indicator.** Load time varies with network. Bundle size is deterministic. Track it religiously.
- **Read-only.** Produce the report. Do not modify code unless explicitly asked.
