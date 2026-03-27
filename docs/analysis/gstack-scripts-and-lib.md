# gstack Scripts & Lib — Reference for RKstack

How gstack organizes its build tooling, resolvers, and shared infrastructure.
Before writing any script or resolver for RKstack, check this document and then
look at the actual source in `.upstreams/gstack/scripts/`.

## scripts/ — Build & DX Tooling

### discover-skills.ts
Dynamic filesystem scanning. Finds all SKILL.md and .tmpl files by walking the
repo root + one level of subdirs. Skips node_modules/.git/dist. Returns arrays
of `{tmpl, output}` pairs. Used by gen-skill-docs, skill-check, and dev-skill.

### gen-skill-docs.ts
Template engine. Reads .tmpl → finds `{{PLACEHOLDERS}}` → resolves via RESOLVERS
registry → writes .md. Supports `--dry-run` (exit 1 if stale) and `--host codex`
(generate for Codex format). ~44K tokens — this is a substantial script.

### skill-check.ts
Health dashboard. Validates all SKILL.md files: checks template freshness (calls
gen-skill-docs --dry-run), validates commands referenced in skills, reports per-skill
status with color + emoji. Exit code 1 if any issues.

### dev-skill.ts
Watch mode. Uses `fs.watch()` on .tmpl files and source dependencies. On change:
auto-regenerates SKILL.md and validates immediately. Reports with timestamps
`[watch]`, `[gen]`, `[check]`. Zero-second feedback loop.

### analytics.ts
Reads `~/.gstack/analytics/skill-usage.jsonl`. Displays invocation stats, per-repo
breakdown, safety hook events. JSONL append-only format with period filtering
(7d, 30d, all).

## scripts/resolvers/ — Template Code Generation

Each `{{PLACEHOLDER}}` in a .tmpl maps to a resolver function that takes
`TemplateContext` and returns a string.

### types.ts
Central type definitions:

```typescript
type Host = 'claude' | 'codex';

interface HostPaths {
  skillRoot: string;          // ~/.claude/skills/gstack
  localSkillRoot: string;     // .claude/skills/gstack
  binDir: string;             // ${skillRoot}/bin
  browseDir: string;          // ${skillRoot}/browse/dist
}

interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];    // dependency tracking between skills
  host: Host;
  paths: HostPaths;
  preambleTier?: number;      // 1-4, controls preamble detail level
}
```

### index.ts
Central resolver registry. 50+ entries mapping placeholder names to generator
functions. Single source of truth. Consistent naming: UPPER_SNAKE_CASE for
placeholders, `generateCamelCase` for functions.

### preamble.ts — KEY FILE
Multi-section generator with tier system. NOT a single bash block — it's a
composition of sections controlled by preamble-tier:

| Tier | Includes |
|------|----------|
| T1 | Core bash (branch, sessions, config) + upgrade check + lake intro + telemetry + contributor + completion principle |
| T2 | T1 + AskUserFormat + Completeness effort table |
| T3 | T2 + RepoMode (solo/collaborative) + SearchBeforeBuilding |
| T4 | T3 (fullest — for shipping/QA/deploy skills) |

Key generator functions inside preamble.ts:
- `generatePreambleBash(ctx)` — the bash code block
- `generateUpgradeCheck(ctx)` — version upgrade handling
- `generateLakeIntro()` — "Boil the Lake" one-time intro
- `generateTelemetryPrompt(ctx)` — user consent workflow
- `generateProactivePrompt(ctx)` — opt-in for auto-invocation
- `generateAskUserFormat(ctx)` — standardized AskUserQuestion structure
- `generateCompletenessSection()` — effort compression reference table
- `generateRepoModeSection()` — solo vs collaborative handling
- `generateTestFailureTriage()` — test ownership logic
- `generatePreamble(ctx)` — combines all sections by tier

**Pattern:** AskUserFormat, Completeness, Escalation, RepoMode are all
SECTIONS WITHIN the preamble, not separate `{{PLACEHOLDER}}`s.

### constants.ts
Shared design constants: AI_SLOP_BLACKLIST (10 anti-patterns), OPENAI_HARD_REJECTIONS,
OPENAI_LITMUS_CHECKS, codexErrorHandling(). Used by design review skills.

### utility.ts
- `generateBaseBranchDetect()` — detect GitHub/GitLab/git-native base branch
- `generateDeployBootstrap()` — detect deploy platform (fly, render, vercel, netlify, heroku, railway)
- `generateQAMethodology()` — 4 QA modes (diff-aware, full, quick, regression)
- `generateSlugEval()` — project namespace evaluation

### codex-helpers.ts
Codex format support:
- `extractNameAndDescription(content)` — parse frontmatter
- `condenseOpenAIShortDescription(desc)` — truncate to 120 chars
- `generateOpenAIYaml(name, desc)` — Codex skill YAML
- `transformFrontmatter(content, host)` — strip fields for Codex (keep only name + description)
- `extractHookSafetyProse(tmplContent)` — safety advisory from hook config

### design.ts
Design review methodology generators: design review lite (code-level), full design
methodology (4 modes), design hard rules, design outside voices (Codex critique),
design sketch (early-stage visualization). Used by design-review and plan-design-review skills.

### review.ts
Code review methodology: review readiness dashboard (5 dimensions), plan file review,
spec review loop, Codex second opinion, adversarial testing (auto-scales by diff size),
plan completion audit. Used by review, ship, and autoplan skills.

### testing.ts
Test framework bootstrap (8 steps from zero to CI), test coverage audit (3 modes:
plan, ship, review). Codepath tracing with ASCII diagrams, coverage gate (60% min,
80% target). Used by ship and qa skills.

### browse.ts
Browser command reference and snapshot flags, generated from `browse/src/commands.ts`
and `browse/src/snapshot.ts`. gstack-specific (Playwright headless browser).

## lib/ — Reusable Infrastructure

### worktree.ts
Git worktree management for isolated execution:
- `create(testName)` — creates detached worktree at HEAD
- `harvest(testName)` — extracts all changes as patch (staged + untracked)
- `cleanup()` / `cleanupAll()` — removes worktrees, auto-cleanup on exit
- SHA256 deduplication via `~/.gstack-dev/harvests/dedup.json`
- `pruneStale()` — removes worktrees from previous runs

General-purpose, not gstack-specific. Useful for any skill that needs isolated
execution (TDD, debugging, parallel agents, E2E testing).
