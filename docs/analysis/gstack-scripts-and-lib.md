# gstack Scripts & Lib — What We're Missing

## scripts/ — Build & DX Tooling

### discover-skills.ts
Dynamic filesystem scanning — finds all SKILL.md and .tmpl files automatically.
No hardcoded lists. Skips node_modules/.git/dist.

**We need this.** Currently our gen-skill-docs walks skills/ but doesn't have a
separate discovery module.

### skill-check.ts
Health dashboard — validates all SKILL.md files, checks template freshness
(runs gen-skill-docs --dry-run), reports per-skill status with emoji feedback.

**We need this.** `just check` only verifies freshness, not content validity.

### dev-skill.ts
Watch mode — watches .tmpl files, auto-regenerates and validates on change.
Zero-second feedback loop for skill authoring.

**We need this.** Currently have to manually run `just build` after each edit.

### analytics.ts
Reads ~/.gstack/analytics/skill-usage.jsonl, displays invocation stats per repo.
JSONL append-only format.

**Later.** Not critical for MVP.

## scripts/resolvers/ — Template Code Generation

### types.ts (gstack)
```typescript
type Host = 'claude' | 'codex';
interface HostPaths { skillRoot, localSkillRoot, binDir, browseDir }
interface TemplateContext {
  skillName, tmplPath, benefitsFrom?, host, paths, preambleTier?
}
```

**We're missing:** `benefitsFrom` (skill dependencies), `preambleTier` (tier system),
`paths` (host-specific paths). Our TemplateContext is simpler.

### index.ts (gstack)
50+ resolver entries. Ours has 1 (PREAMBLE).
As we add skills, new resolvers will appear naturally.

### preamble.ts (gstack) — KEY FILE
Not just a bash block. It's a **multi-section generator** with tier system:

- T1: core bash + upgrade + lake intro + telemetry + contributor + completion
- T2: T1 + AskUserFormat + Completeness table
- T3: T2 + RepoMode + SearchBeforeBuilding
- T4: T3 (fullest)

**Key functions we're missing:**
- `generateAskUserFormat()` — standardized question structure
- `generateCompletenessSection()` — effort compression table
- `generateRepoModeSection()` — solo vs collaborative handling
- `generateLakeIntro()` — "Boil the Lake" one-time intro
- `generateTestFailureTriage()` — test ownership logic

**We should NOT copy these as standalone placeholders ({{ASK_FORMAT}} etc).
They should be PART of the preamble, controlled by tier level.**

### constants.ts
Shared constants: AI_SLOP_BLACKLIST (10 design anti-patterns),
OPENAI_HARD_REJECTIONS, OPENAI_LITMUS_CHECKS.

**Later** — when we add design review skills.

### utility.ts
- `generateBaseBranchDetect()` — detect GitHub/GitLab/git-native base branch
- `generateDeployBootstrap()` — detect deploy platform (fly, render, vercel...)
- `generateQAMethodology()` — 4 QA modes (diff-aware, full, quick, regression)

**We need `generateBaseBranchDetect()` soon** — any skill that works with PRs needs it.

### codex-helpers.ts
YAML generation for Codex skill format. Frontmatter transformation per host.
`transformFrontmatter(content, host)` strips fields for Codex.

**We need this** when we generate for Codex host.

### design.ts
Design review methodology — 4 modes, letter grades, regression detection.
**Later** — when we add design skills.

### review.ts
Code review methodology, review readiness dashboard (5 dimensions),
plan file integration, staleness detection.
**Later** — when we add review skills.

### testing.ts
Test framework bootstrap (8 steps), test coverage audit (3 modes).
Codepath tracing with ASCII diagrams. Coverage gate (60% min, 80% target).
**Later** — when we add testing/QA skills.

### browse.ts
Browser automation command reference. gstack-specific, skip.

## lib/ — Reusable Infrastructure

### worktree.ts — HIGHLY REUSABLE
Git worktree management for isolated test execution:
- `create(testName)` — creates detached worktree at HEAD
- `harvest(testName)` — extracts all changes as patch
- `cleanup()` — removes worktrees, auto-cleanup on exit
- SHA256 deduplication of harvested patches

**We should adopt this** for any skill that needs isolated execution
(TDD, debugging, parallel agents).

## What rkstack is Missing Right Now

### Immediate (needed for Phase 1)
1. **discover-skills.ts** — separate discovery module
2. **Preamble tier system** — T1/T2/T3/T4 instead of flat preamble
3. **AskUserFormat as part of preamble** (not a separate placeholder)
4. **Completeness section as part of preamble**
5. **`<!-- AUTO-GENERATED -->` header** ✓ done

### Soon (needed for Phase 2)
6. **skill-check.ts** — health dashboard
7. **dev-skill.ts** — watch mode for template authoring
8. **generateBaseBranchDetect()** — for PR-related skills
9. **Host-aware generation** — Codex output from same templates

### Later (Phase 3+)
10. **worktree.ts** — isolated execution
11. **analytics** — usage tracking
12. **Design/review/testing resolvers** — when those skills are added
