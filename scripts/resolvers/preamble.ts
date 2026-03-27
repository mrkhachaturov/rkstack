import type { TemplateContext } from './types';

/**
 * Core bash block — runs first, collects project state as facts.
 * Every skill gets this regardless of tier.
 */
function generatePreambleBash(ctx: TemplateContext): string {
  return `## Preamble (run first)

\`\`\`bash
# === RKstack Preamble (${ctx.skillName}) ===

# Project detection via scc
_TOP_LANGS=$(scc --format wide --no-cocomo . 2>/dev/null | head -8 || echo "scc not available")
echo "STACK:"
echo "$_TOP_LANGS"

# Framework hints
_HAS_PACKAGE_JSON=$([ -f package.json ] && echo "yes" || echo "no")
_HAS_CARGO_TOML=$([ -f Cargo.toml ] && echo "yes" || echo "no")
_HAS_GO_MOD=$([ -f go.mod ] && echo "yes" || echo "no")
_HAS_PYPROJECT=$([ -f pyproject.toml ] && echo "yes" || echo "no")
_HAS_DOCKERFILE=$([ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TERRAFORM=$(find . -maxdepth 1 -name "*.tf" -print -quit 2>/dev/null | grep -q . && echo "yes" || echo "no")
echo "FRAMEWORKS: pkg=$_HAS_PACKAGE_JSON cargo=$_HAS_CARGO_TOML go=$_HAS_GO_MOD py=$_HAS_PYPROJECT docker=$_HAS_DOCKERFILE tf=$_HAS_TERRAFORM"

# Repo mode (solo vs collaborative)
_AUTHOR_COUNT=$(git shortlog -sn --no-merges --since="90 days ago" 2>/dev/null | wc -l | tr -d ' ')
_REPO_MODE=$([ "$_AUTHOR_COUNT" -le 1 ] && echo "solo" || echo "collaborative")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "REPO_MODE: $_REPO_MODE"
echo "BRANCH: $_BRANCH"

# Project config
_HAS_CLAUDE_MD=$([ -f CLAUDE.md ] && echo "yes" || echo "no")
echo "CLAUDE_MD: $_HAS_CLAUDE_MD"
\`\`\`

Use the preamble output to adapt your behavior:
- **TypeScript/JavaScript + package.json** — web/fullstack project. Check for React/Vue/Svelte patterns.
- **Python + pyproject.toml** — backend/ML. Check PEP8 conventions.
- **Rust + Cargo.toml** — systems. Check ownership patterns.
- **Go + go.mod** — backend/infra. Check error handling patterns.
- **Dockerfile + Terraform** — infrastructure. Extra caution with state.
- **CLAUDE.md exists** — read it for project-specific commands and conventions.`;
}

/**
 * AskUserQuestion format — standardized structure for all user-facing questions.
 * T2+ only.
 */
function generateAskUserFormat(_ctx: TemplateContext): string {
  return `## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the \`_BRANCH\` value from preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** \`RECOMMENDATION: Choose [X] because [one-line reason]\` — always prefer the complete option over shortcuts (see Completeness Principle). Include \`Completeness: X/10\` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work.
4. **Options:** Lettered options: \`A) ... B) ... C) ...\` — when an option involves effort, show both scales: \`(human: ~X / CC: ~Y)\`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.`;
}

/**
 * Completeness Principle — effort reference table.
 * T2+ only.
 */
function generateCompletenessSection(): string {
  return `## Completeness Principle

AI makes completeness near-free. Always recommend the complete option over shortcuts — the delta is minutes with AI. A "lake" (100% coverage, all edge cases) is boilable; an "ocean" (full rewrite, multi-quarter migration) is not. Boil lakes, flag oceans.

**Effort reference** — always show both scales:

| Task type | Human team | CC + AI | Compression |
|-----------|-----------|---------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix | 4 hours | 15 min | ~20x |

Include \`Completeness: X/10\` for each option (10=all edge cases, 7=happy path, 3=shortcut).`;
}

/**
 * Repo ownership section — solo vs collaborative handling.
 * T3+ only.
 */
function generateRepoModeSection(): string {
  return `## Repo Ownership

\`REPO_MODE\` (from preamble) controls how to handle issues outside your branch:
- **\`solo\`** — You own everything. Investigate and offer to fix proactively.
- **\`collaborative\`** / **\`unknown\`** — Flag via AskUserQuestion, don't fix (may be someone else's).

Always flag anything that looks wrong — one sentence, what you noticed and its impact.`;
}

/**
 * Search Before Building — three-layer knowledge model.
 * T3+ only.
 */
function generateSearchBeforeBuildingSection(): string {
  return `## Search Before Building

Before building anything unfamiliar, **search first.**
- **Layer 1** (tried and true) — standard patterns, built-in to the runtime/framework. Don't reinvent.
- **Layer 2** (new and popular) — blog posts, trending approaches. Scrutinize — people follow hype.
- **Layer 3** (first principles) — your own reasoning about the specific problem. Prize above all.

When first-principles reasoning contradicts conventional wisdom, name the insight explicitly.`;
}

/**
 * Completion status + escalation protocol.
 * All tiers get this.
 */
function generateCompletionStatus(): string {
  return `## Completion Status

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
\`\`\`
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
\`\`\``;
}

/**
 * Test Failure Triage — ownership classification for test failures.
 * Exported as a separate resolver (not part of preamble composition).
 * Used by ship/review/qa skills via {{TEST_FAILURE_TRIAGE}}.
 */
export function generateTestFailureTriage(): string {
  return `## Test Failure Ownership Triage

When tests fail, do NOT immediately stop. First, determine ownership:

### Step T1: Classify each failure

For each failing test:

1. **Get the files changed on this branch:**
   \`\`\`bash
   git diff origin/<base>...HEAD --name-only
   \`\`\`

2. **Classify the failure:**
   - **In-branch** if: the failing test file itself was modified on this branch, OR the test output references code that was changed on this branch, OR you can trace the failure to a change in the branch diff.
   - **Likely pre-existing** if: neither the test file nor the code it tests was modified on this branch, AND the failure is unrelated to any branch change you can identify.
   - **When ambiguous, default to in-branch.** It is safer to stop the developer than to let a broken test ship.

### Step T2: Handle in-branch failures

**STOP.** These are your failures. Show them and do not proceed.

### Step T3: Handle pre-existing failures

Check \`REPO_MODE\` from the preamble output.

**If REPO_MODE is \`solo\`:**

Use AskUserQuestion:
> These test failures appear pre-existing (not caused by your branch changes):
> [list each failure with file:line and brief error description]
>
> RECOMMENDATION: Choose A — fix now while the context is fresh. Completeness: 9/10.
> A) Investigate and fix now (human: ~2-4h / CC: ~15min) — Completeness: 10/10
> B) Add as TODO — fix after this branch lands — Completeness: 7/10
> C) Skip — I know about this, ship anyway — Completeness: 3/10

**If REPO_MODE is \`collaborative\` or \`unknown\`:**

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
- **Blame + assign:** \`git log --format="%an" -1 -- <file>\` → create issue assigned to author.
- **Skip:** Continue. Note "Pre-existing test failure skipped: <test-name>".`;
}

// ─── Preamble Composition (tier → sections) ─────────────────
//
// T1: core bash + completionStatus
// T2: T1 + askUserFormat + completeness
// T3: T2 + repoMode + searchBeforeBuilding
// T4: same as T3 (TEST_FAILURE_TRIAGE is a separate {{}} placeholder)
//
// Skills by tier:
//   T1: using-rkstack, brainstorming, careful, freeze, guard, unfreeze
//   T2: systematic-debugging, writing-plans, verification, executing-plans,
//       subagent-driven, parallel-agents, worktrees, receiving-review,
//       writing-skills, document-release, retro
//   T3: test-driven-development, cso
//   T4: requesting-code-review, finishing-a-development-branch

export function generatePreamble(ctx: TemplateContext): string {
  const tier = ctx.preambleTier ?? 4;
  if (tier < 1 || tier > 4) {
    throw new Error(`Invalid preamble-tier: ${tier} in ${ctx.tmplPath}. Must be 1-4.`);
  }

  const sections = [
    generatePreambleBash(ctx),
    ...(tier >= 2 ? [generateAskUserFormat(ctx), generateCompletenessSection()] : []),
    ...(tier >= 3 ? [generateRepoModeSection(), generateSearchBeforeBuildingSection()] : []),
    generateCompletionStatus(),
  ];

  return sections.join('\n\n');
}
