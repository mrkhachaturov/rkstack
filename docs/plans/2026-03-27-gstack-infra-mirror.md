# Mirror gstack Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align rkstack's build pipeline to match gstack's architecture — TemplateContext with frontmatter parsing, tiered preamble composition, standalone discover-skills, health dashboard, and watch mode.

**Architecture:** Rewrite `scripts/resolvers/types.ts`, `scripts/gen-skill-docs.ts`, `scripts/resolvers/preamble.ts`, and `scripts/resolvers/index.ts` to match gstack's patterns. Extract `discover-skills.ts` as a standalone module. Add `skill-check.ts` and `dev-skill.ts` as DX tooling. Add `utility.ts` resolver for `BASE_BRANCH_DETECT`.

**Tech Stack:** Bun, TypeScript, `fs.watch()` for dev mode

---

### Task 1: Rewrite `scripts/resolvers/types.ts`

Add `HostPaths`, `preambleTier`, `tmplPath`, `benefitsFrom` to match gstack's `TemplateContext`. Drop `skillDir` and `repoRoot` (not in gstack — use `paths` instead).

**Files:**
- Modify: `scripts/resolvers/types.ts`

- [ ] **Step 1: Replace types.ts with gstack-aligned version**

```typescript
/** Supported host platforms */
export type Host = 'claude' | 'codex' | 'gemini';

/** Host-specific path configuration */
export interface HostPaths {
  /** Root of the installed plugin (e.g. ~/.claude/plugins/rkstack) */
  skillRoot: string;
  /** Local (repo-relative) plugin root */
  localSkillRoot: string;
  /** Directory for CLI utilities */
  binDir: string;
}

/** Per-host path defaults */
export const HOST_PATHS: Record<Host, HostPaths> = {
  claude: {
    skillRoot: '~/.claude/plugins/rkstack',
    localSkillRoot: '.claude/plugins/rkstack',
    binDir: '~/.claude/plugins/rkstack/bin',
  },
  codex: {
    skillRoot: '$RKSTACK_ROOT',
    localSkillRoot: '.agents/skills/rkstack',
    binDir: '$RKSTACK_BIN',
  },
  gemini: {
    skillRoot: '~/.gemini/plugins/rkstack',
    localSkillRoot: '.gemini/plugins/rkstack',
    binDir: '~/.gemini/plugins/rkstack/bin',
  },
};

/** Context passed to every placeholder resolver */
export interface TemplateContext {
  /** Skill name (from frontmatter `name:` or directory name) */
  skillName: string;
  /** Absolute path to the .tmpl file */
  tmplPath: string;
  /** Prerequisite skills (from frontmatter `benefits-from:`) */
  benefitsFrom?: string[];
  /** Which host we're generating for */
  host: Host;
  /** Host-specific paths */
  paths: HostPaths;
  /** Preamble tier 1-4 (from frontmatter `preamble-tier:`) */
  preambleTier?: number;
}

/** A placeholder resolver: takes context, returns the replacement string */
export type Resolver = (ctx: TemplateContext) => string;
```

- [ ] **Step 2: Verify types compile**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun build scripts/resolvers/types.ts --no-bundle 2>&1 | head -5`
Expected: No type errors (warnings about no output are fine)

- [ ] **Step 3: Commit**

```bash
git add scripts/resolvers/types.ts
git commit -m "rewrite types.ts: align TemplateContext with gstack pattern

Add HostPaths, preambleTier, tmplPath, benefitsFrom. Drop skillDir/repoRoot
in favor of paths struct. Match gstack's TemplateContext interface."
```

---

### Task 2: Create `scripts/discover-skills.ts`

Extract template discovery into a standalone module (matching gstack's `discover-skills.ts`). Scans `skills/` + root for `.tmpl` and `SKILL.md` files. Returns `{tmpl, output}` pairs. Used by gen-skill-docs, skill-check, dev-skill.

**Files:**
- Create: `scripts/discover-skills.ts`

- [ ] **Step 1: Write discover-skills.ts**

```typescript
/**
 * Shared discovery for SKILL.md and .tmpl files.
 * Scans root + one level of subdirs under skills/, skipping node_modules/.git/dist.
 *
 * Follows gstack's pattern: flat scan, no recursion, returns relative paths.
 */

import * as fs from 'fs';
import * as path from 'path';

const SKIP = new Set(['node_modules', '.git', 'dist', '.upstreams']);

function subdirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !SKIP.has(d.name))
    .map(d => d.name);
}

/**
 * Find all SKILL.md.tmpl files under skillsDir + check root for SKILL.md.tmpl.
 * Returns relative paths from repoRoot.
 */
export function discoverTemplates(repoRoot: string): Array<{ tmpl: string; output: string }> {
  const skillsDir = path.join(repoRoot, 'skills');
  const results: Array<{ tmpl: string; output: string }> = [];

  // Check root SKILL.md.tmpl
  if (fs.existsSync(path.join(repoRoot, 'SKILL.md.tmpl'))) {
    results.push({ tmpl: 'SKILL.md.tmpl', output: 'SKILL.md' });
  }

  // Check skills/{name}/SKILL.md.tmpl (one level deep)
  for (const dir of subdirs(skillsDir)) {
    const rel = `skills/${dir}/SKILL.md.tmpl`;
    if (fs.existsSync(path.join(repoRoot, rel))) {
      results.push({ tmpl: rel, output: rel.replace(/\.tmpl$/, '') });
    }
  }

  return results.sort((a, b) => a.tmpl.localeCompare(b.tmpl));
}

/**
 * Find all SKILL.md files (generated or standalone).
 * Returns relative paths from repoRoot.
 */
export function discoverSkillFiles(repoRoot: string): string[] {
  const skillsDir = path.join(repoRoot, 'skills');
  const results: string[] = [];

  // Check root SKILL.md
  if (fs.existsSync(path.join(repoRoot, 'SKILL.md'))) {
    results.push('SKILL.md');
  }

  // Check skills/{name}/SKILL.md (one level deep)
  for (const dir of subdirs(skillsDir)) {
    const rel = `skills/${dir}/SKILL.md`;
    if (fs.existsSync(path.join(repoRoot, rel))) {
      results.push(rel);
    }
  }

  return results.sort();
}
```

- [ ] **Step 2: Verify it compiles and discovers the brainstorming template**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun -e "import { discoverTemplates, discoverSkillFiles } from './scripts/discover-skills'; const R = import.meta.dir; console.log('templates:', discoverTemplates(R)); console.log('skills:', discoverSkillFiles(R));"`
Expected: Output shows `skills/brainstorming/SKILL.md.tmpl` and `skills/brainstorming/SKILL.md`

- [ ] **Step 3: Commit**

```bash
git add scripts/discover-skills.ts
git commit -m "add discover-skills.ts: standalone template/skill discovery

Follows gstack pattern — flat scan of skills/ + root, returns relative
paths. Reusable by gen-skill-docs, skill-check, and dev-skill."
```

---

### Task 3: Rewrite `scripts/gen-skill-docs.ts`

Parse frontmatter (`preamble-tier`, `name`, `benefits-from`). Build full `TemplateContext` with all fields. Use `discover-skills.ts`. Fail on unresolved placeholders (not warn). Match gstack's error behavior.

**Files:**
- Modify: `scripts/gen-skill-docs.ts`

- [ ] **Step 1: Rewrite gen-skill-docs.ts**

```typescript
#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   discover .tmpl → parse frontmatter → build TemplateContext → resolve {{PLACEHOLDERS}} → write .md
 *
 * Supports --dry-run: generate to memory, exit 1 if different from committed file.
 * Supports --host: generate for claude (default), codex, or gemini.
 *
 * Usage:
 *   bun scripts/gen-skill-docs.ts              # generate all
 *   bun scripts/gen-skill-docs.ts --dry-run    # check freshness
 *   bun scripts/gen-skill-docs.ts --host codex # generate for Codex
 */

import * as fs from 'fs';
import * as path from 'path';
import { RESOLVERS } from './resolvers/index';
import { HOST_PATHS } from './resolvers/types';
import type { Host, TemplateContext } from './resolvers/types';
import { discoverTemplates } from './discover-skills';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const GENERATED_HEADER = '<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n<!-- Regenerate: just build -->';

// Host detection
const HOST: Host = (() => {
  const hostArg = process.argv.find(a => a.startsWith('--host'));
  if (!hostArg) return 'claude';
  const val = hostArg.includes('=')
    ? hostArg.split('=')[1]
    : process.argv[process.argv.indexOf(hostArg) + 1];
  if (val === 'codex' || val === 'gemini' || val === 'claude') return val as Host;
  throw new Error(`Unknown host: ${val}. Use claude, codex, or gemini.`);
})();

// ─── Frontmatter Parsing ──────────────────────────────────

const PLACEHOLDER_RE = /\{\{([A-Z_]+)\}\}/g;

/** Extract `name:` from YAML frontmatter */
function extractName(content: string): string {
  const match = content.match(/^name:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

/** Extract `preamble-tier:` from YAML frontmatter (1-4) */
function extractPreambleTier(content: string): number | undefined {
  const match = content.match(/^preamble-tier:\s*(\d+)$/m);
  return match ? parseInt(match[1], 10) : undefined;
}

/** Extract `benefits-from:` list from YAML frontmatter */
function extractBenefitsFrom(content: string): string[] | undefined {
  // Inline: benefits-from: [a, b, c]
  const inlineMatch = content.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  // Block:
  // benefits-from:
  //   - a
  //   - b
  const blockMatch = content.match(/^benefits-from:\s*\n((?:\s+-\s+.+\n?)*)/m);
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s+-\s+/, '').trim())
      .filter(Boolean);
  }
  return undefined;
}

// ─── Template Processing ──────────────────────────────────

function processTemplate(tmplRel: string, outputRel: string): string {
  const tmplPath = path.join(ROOT, tmplRel);
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');

  // Extract metadata from frontmatter
  const extractedName = extractName(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));
  const preambleTier = extractPreambleTier(tmplContent);
  const benefitsFrom = extractBenefitsFrom(tmplContent);

  const ctx: TemplateContext = {
    skillName,
    tmplPath,
    benefitsFrom,
    host: HOST,
    paths: HOST_PATHS[HOST],
    preambleTier,
  };

  // Resolve placeholders — fail on unknown
  let content = tmplContent.replace(PLACEHOLDER_RE, (match, name: string) => {
    const resolver = RESOLVERS[name];
    if (!resolver) {
      throw new Error(`Unresolved placeholder ${match} in ${tmplRel}`);
    }
    return resolver(ctx);
  });

  // Validate no remaining placeholders
  const remaining = [...content.matchAll(PLACEHOLDER_RE)].map(m => m[0]);
  if (remaining.length > 0) {
    throw new Error(`Unresolved placeholders in ${tmplRel}: ${remaining.join(', ')}`);
  }

  // Inject AUTO-GENERATED header after frontmatter
  const header = GENERATED_HEADER.replace('{{SOURCE}}', path.basename(tmplPath));
  const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
  if (fmEnd !== -1) {
    const insertPos = fmEnd + 3;
    content = content.slice(0, insertPos) + '\n' + header + content.slice(insertPos);
  }

  return content;
}

// ─── Main ──────────────────────────────────────────────────

function main() {
  const templates = discoverTemplates(ROOT);

  if (templates.length === 0) {
    console.error('No .tmpl files found');
    process.exit(1);
  }

  let staleCount = 0;
  let errorCount = 0;

  for (const { tmpl, output } of templates) {
    const outputPath = path.join(ROOT, output);

    let generated: string;
    try {
      generated = processTemplate(tmpl, output);
    } catch (err: any) {
      console.error(`ERROR: ${err.message}`);
      errorCount++;
      continue;
    }

    if (DRY_RUN) {
      if (fs.existsSync(outputPath)) {
        const existing = fs.readFileSync(outputPath, 'utf-8');
        if (existing !== generated) {
          console.log(`STALE: ${output}`);
          staleCount++;
        }
      } else {
        console.log(`MISSING: ${output}`);
        staleCount++;
      }
    } else {
      fs.writeFileSync(outputPath, generated);
      console.log(`Generated: ${output}`);
    }
  }

  if (errorCount > 0) {
    console.error(`\n${errorCount} template(s) had errors`);
    process.exit(1);
  }

  if (DRY_RUN) {
    if (staleCount > 0) {
      console.error(`\n${staleCount} file(s) out of date. Run: just build`);
      process.exit(1);
    } else {
      console.log('OK: all generated files up to date');
    }
  }
}

main();
```

- [ ] **Step 2: Verify build works with existing brainstorming template**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun scripts/gen-skill-docs.ts`
Expected: `Generated: skills/brainstorming/SKILL.md`

- [ ] **Step 3: Verify dry-run detects no drift**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun scripts/gen-skill-docs.ts --dry-run`
Expected: `OK: all generated files up to date`

- [ ] **Step 4: Commit**

```bash
git add scripts/gen-skill-docs.ts
git commit -m "rewrite gen-skill-docs: frontmatter parsing, fail on unresolved

Parse preamble-tier, name, benefits-from from YAML frontmatter.
Build full TemplateContext matching gstack pattern. Throw on unknown
placeholders instead of warning. Use discover-skills.ts for template
discovery."
```

---

### Task 4: Rewrite `scripts/resolvers/preamble.ts` with tier composition

Replace flat preamble with multi-section generator gated by `preambleTier`. Sections: core bash, AskUserFormat, Completeness, RepoMode, CompletionStatus+Escalation, SearchBeforeBuilding. Drop gstack-specific sections (upgrade check, lake intro, telemetry, contributor mode).

**Files:**
- Modify: `scripts/resolvers/preamble.ts`

- [ ] **Step 1: Rewrite preamble.ts with tier composition**

```typescript
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
//   T1: using-rkstack, brainstorming
//   T2: writing-plans, systematic-debugging
//   T3: test-driven-development, code-review
//   T4: ship, review, qa (when we add those)

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
```

- [ ] **Step 2: Rebuild and verify brainstorming gets T1 preamble (no AskUserFormat, no Completeness)**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun scripts/gen-skill-docs.ts`
Expected: `Generated: skills/brainstorming/SKILL.md`

- [ ] **Step 3: Inspect generated output — confirm T1 has bash + CompletionStatus only**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && grep -c "## AskUserQuestion Format" skills/brainstorming/SKILL.md`
Expected: `0` (brainstorming is T1, AskUserFormat is T2+)

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && grep -c "## Completion Status" skills/brainstorming/SKILL.md`
Expected: `1` (all tiers get CompletionStatus)

- [ ] **Step 4: Commit**

```bash
git add scripts/resolvers/preamble.ts
git commit -m "rewrite preamble.ts: tiered composition matching gstack

T1: core bash + completion/escalation
T2: + AskUserFormat + Completeness
T3: + RepoMode + SearchBeforeBuilding
T4: same as T3 (TEST_FAILURE_TRIAGE is separate resolver)

Drop gstack-specific: upgrade check, lake intro, telemetry, contributor."
```

---

### Task 5: Update `scripts/resolvers/index.ts` with new resolvers

Register PREAMBLE and TEST_FAILURE_TRIAGE. Prepare for utility resolvers.

**Files:**
- Modify: `scripts/resolvers/index.ts`

- [ ] **Step 1: Update index.ts**

```typescript
import type { Resolver } from './types';
import { generatePreamble, generateTestFailureTriage } from './preamble';

/**
 * Registry of all placeholder resolvers.
 * Key = placeholder name (without braces), value = resolver function.
 *
 * To add a new placeholder:
 * 1. Create a resolver function in the appropriate file under resolvers/
 * 2. Register it here
 * 3. Use {{PLACEHOLDER_NAME}} in any .tmpl file
 */
export const RESOLVERS: Record<string, Resolver> = {
  PREAMBLE: generatePreamble,
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
};
```

- [ ] **Step 2: Verify build still works**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun scripts/gen-skill-docs.ts && bun scripts/gen-skill-docs.ts --dry-run`
Expected: `Generated: skills/brainstorming/SKILL.md` then `OK: all generated files up to date`

- [ ] **Step 3: Commit**

```bash
git add scripts/resolvers/index.ts
git commit -m "update resolver index: add TEST_FAILURE_TRIAGE"
```

---

### Task 6: Add `scripts/resolvers/utility.ts` with `BASE_BRANCH_DETECT`

Platform-aware base branch detection (GitHub, GitLab, plain git). Used by review/ship/qa skills to find the merge target.

**Files:**
- Create: `scripts/resolvers/utility.ts`
- Modify: `scripts/resolvers/index.ts`

- [ ] **Step 1: Write utility.ts**

```typescript
import type { TemplateContext } from './types';

/**
 * Detect the base branch (main/master/develop) across platforms.
 * Used by skills that need to diff against the merge target.
 */
export function generateBaseBranchDetect(_ctx: TemplateContext): string {
  return `### Base Branch Detection

\`\`\`bash
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
    if git show-ref --verify --quiet "refs/heads/$_CANDIDATE" 2>/dev/null || \\
       git show-ref --verify --quiet "refs/remotes/origin/$_CANDIDATE" 2>/dev/null; then
      _BASE="$_CANDIDATE"
      break
    fi
  done
fi

_BASE=\${_BASE:-main}
echo "BASE_BRANCH: $_BASE"
\`\`\`

Use \`_BASE\` (the value printed above) as the base branch for all diff operations. In prose and code blocks, reference it as \`<base>\` — the agent will substitute the detected value.`;
}
```

- [ ] **Step 2: Register in index.ts**

Add import and register:
```typescript
import { generateBaseBranchDetect } from './utility';
```

Add to RESOLVERS:
```typescript
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
```

- [ ] **Step 3: Verify build still works (no templates use BASE_BRANCH_DETECT yet, so just compile check)**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun scripts/gen-skill-docs.ts`
Expected: `Generated: skills/brainstorming/SKILL.md` (no errors — new resolver is registered but not yet used)

- [ ] **Step 4: Commit**

```bash
git add scripts/resolvers/utility.ts scripts/resolvers/index.ts
git commit -m "add utility.ts resolver: BASE_BRANCH_DETECT

Platform-aware base branch detection (GitHub, GitLab, plain git).
Ready for use by review/ship/qa skill templates."
```

---

### Task 7: Create `scripts/skill-check.ts`

Health dashboard: template coverage, frontmatter validation, freshness check. Adapted from gstack — no browse command validation (we don't have browse), no Codex skills section (not yet).

**Files:**
- Create: `scripts/skill-check.ts`

- [ ] **Step 1: Write skill-check.ts**

```typescript
#!/usr/bin/env bun
/**
 * skill:check — Health summary for all SKILL.md files.
 *
 * Reports:
 *   - Template coverage (which SKILL.md files have .tmpl sources)
 *   - Frontmatter validation (required fields present)
 *   - Freshness check (generated files match committed files)
 */

import { discoverTemplates, discoverSkillFiles } from './discover-skills';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

const SKILL_FILES = discoverSkillFiles(ROOT);
const TEMPLATES = discoverTemplates(ROOT);

let hasErrors = false;

// ─── Frontmatter Validation ────────────────────────────────

console.log('  Skills:');
for (const file of SKILL_FILES) {
  const fullPath = path.join(ROOT, file);
  const content = fs.readFileSync(fullPath, 'utf-8');

  const issues: string[] = [];

  // Check frontmatter exists
  if (!content.startsWith('---')) {
    issues.push('missing frontmatter');
  } else {
    const fmEnd = content.indexOf('---', 4);
    if (fmEnd === -1) {
      issues.push('unclosed frontmatter');
    } else {
      const fm = content.slice(4, fmEnd);
      if (!fm.match(/^name:\s*.+$/m)) issues.push('missing name:');
      if (!fm.match(/^description:\s*/m)) issues.push('missing description:');
      if (!fm.match(/^preamble-tier:\s*\d+$/m)) issues.push('missing preamble-tier:');
    }
  }

  if (issues.length > 0) {
    hasErrors = true;
    console.log(`  \u274c ${file.padEnd(40)} — ${issues.join(', ')}`);
  } else {
    console.log(`  \u2705 ${file.padEnd(40)} — OK`);
  }
}

// ─── Templates ──────────────────────────────────────────────

console.log('\n  Templates:');
for (const { tmpl, output } of TEMPLATES) {
  const tmplPath = path.join(ROOT, tmpl);
  const outPath = path.join(ROOT, output);
  if (!fs.existsSync(tmplPath)) {
    console.log(`  \u26a0\ufe0f  ${output.padEnd(40)} — no template`);
    continue;
  }
  if (!fs.existsSync(outPath)) {
    hasErrors = true;
    console.log(`  \u274c ${output.padEnd(40)} — generated file missing! Run: just build`);
    continue;
  }
  console.log(`  \u2705 ${tmpl.padEnd(40)} \u2192 ${output}`);
}

// Skills without templates
for (const file of SKILL_FILES) {
  const tmplPath = path.join(ROOT, file + '.tmpl');
  if (!fs.existsSync(tmplPath) && !TEMPLATES.some(t => t.output === file)) {
    console.log(`  \u26a0\ufe0f  ${file.padEnd(40)} — no template (hand-authored)`);
  }
}

// ─── Freshness ──────────────────────────────────────────────

console.log('\n  Freshness:');
try {
  execSync('bun scripts/gen-skill-docs.ts --dry-run', { cwd: ROOT, stdio: 'pipe' });
  console.log('  \u2705 All generated files are fresh');
} catch (err: any) {
  hasErrors = true;
  const output = err.stdout?.toString() || '';
  console.log('  \u274c Generated files are stale:');
  for (const line of output.split('\n').filter((l: string) => l.startsWith('STALE') || l.startsWith('MISSING'))) {
    console.log(`      ${line}`);
  }
  console.log('      Run: just build');
}

console.log('');
process.exit(hasErrors ? 1 : 0);
```

- [ ] **Step 2: Run it and verify output**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && bun scripts/skill-check.ts`
Expected: Shows brainstorming/SKILL.md as OK, template coverage, freshness OK. Exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/skill-check.ts
git commit -m "add skill-check.ts: health dashboard for skills

Validates frontmatter (name, description, preamble-tier), template
coverage, and freshness. Follows gstack pattern, adapted for rkstack."
```

---

### Task 8: Create `scripts/dev-skill.ts`

Watch mode: watches `.tmpl` files and resolver source files. On change: regenerates and reports. Adapted from gstack — no browse source watching.

**Files:**
- Create: `scripts/dev-skill.ts`

- [ ] **Step 1: Write dev-skill.ts**

```typescript
#!/usr/bin/env bun
/**
 * dev:skill — Watch mode for SKILL.md template development.
 *
 * Watches .tmpl files and resolver source files.
 * On change: regenerates SKILL.md files and validates.
 */

import { discoverTemplates } from './discover-skills';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function regenerate() {
  console.log(`  [${timestamp()}] [gen] Regenerating...`);
  try {
    const output = execSync('bun scripts/gen-skill-docs.ts', { cwd: ROOT, stdio: 'pipe' });
    const lines = output.toString().trim().split('\n');
    for (const line of lines) {
      console.log(`  [${timestamp()}] [gen] ${line}`);
    }
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() || err.message;
    console.log(`  [${timestamp()}] [gen] ERROR: ${stderr}`);
    return;
  }

  // Validate freshness
  try {
    execSync('bun scripts/gen-skill-docs.ts --dry-run', { cwd: ROOT, stdio: 'pipe' });
    console.log(`  [${timestamp()}] [check] \u2705 All fresh`);
  } catch (err: any) {
    const stdout = err.stdout?.toString().trim() || '';
    console.log(`  [${timestamp()}] [check] \u274c Stale: ${stdout}`);
  }
}

// Initial run
console.log('  [watch] Watching *.md.tmpl files and resolvers...');
regenerate();

// Watch template files
const templates = discoverTemplates(ROOT);
for (const { tmpl } of templates) {
  const fullPath = path.join(ROOT, tmpl);
  if (!fs.existsSync(fullPath)) continue;
  fs.watch(fullPath, () => {
    console.log(`\n  [${timestamp()}] [watch] ${tmpl} changed`);
    regenerate();
  });
}

// Watch resolver source files
const RESOLVER_DIR = path.join(ROOT, 'scripts', 'resolvers');
if (fs.existsSync(RESOLVER_DIR)) {
  for (const entry of fs.readdirSync(RESOLVER_DIR)) {
    if (!entry.endsWith('.ts')) continue;
    const fullPath = path.join(RESOLVER_DIR, entry);
    fs.watch(fullPath, () => {
      console.log(`\n  [${timestamp()}] [watch] scripts/resolvers/${entry} changed`);
      regenerate();
    });
  }
}

console.log('  [watch] Press Ctrl+C to stop\n');
```

- [ ] **Step 2: Quick smoke test (run and Ctrl+C)**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && timeout 3 bun scripts/dev-skill.ts || true`
Expected: Shows `[watch]` output, generates, validates, then exits on timeout

- [ ] **Step 3: Commit**

```bash
git add scripts/dev-skill.ts
git commit -m "add dev-skill.ts: watch mode for template development

Watches .tmpl files and resolvers/*.ts. Regenerates + validates on
change. Follows gstack dev-skill pattern, adapted for rkstack."
```

---

### Task 9: Update `package.json` and `justfile`

Wire up new scripts: `skill:check` and `dev:skill` point to real implementations.

**Files:**
- Modify: `package.json`
- Modify: `justfile`

- [ ] **Step 1: Update package.json scripts**

Replace the TODO echo commands with real ones:

```json
{
  "scripts": {
    "build": "bun scripts/gen-skill-docs.ts",
    "build:codex": "bun scripts/gen-skill-docs.ts --host codex",
    "build:gemini": "bun scripts/gen-skill-docs.ts --host gemini",
    "build:all": "bun scripts/gen-skill-docs.ts && bun scripts/gen-skill-docs.ts --host codex && bun scripts/gen-skill-docs.ts --host gemini",
    "check": "bun scripts/gen-skill-docs.ts --dry-run",
    "skill:check": "bun scripts/skill-check.ts",
    "dev:skill": "bun scripts/dev-skill.ts",
    "test": "echo 'TODO: bun test'"
  }
}
```

- [ ] **Step 2: Update justfile**

Add `skill-check` and `dev` recipes:

```just
set shell := ["bash", "-euo", "pipefail", "-c"]

[group("setup")]
[doc("Install pinned tools via mise")]
setup:
  mise install

[group("build")]
[doc("Generate all SKILL.md from templates")]
build:
  bun scripts/gen-skill-docs.ts

[group("build")]
[doc("Check that generated SKILL.md files are up to date")]
check:
  bun scripts/gen-skill-docs.ts --dry-run

[group("build")]
[doc("Health dashboard for all skills")]
skill-check:
  bun scripts/skill-check.ts

[group("dev")]
[doc("Watch mode: auto-regen + validate on change")]
dev:
  bun scripts/dev-skill.ts

[group("detect")]
[doc("Detect project stack via scc")]
detect:
  scc --format wide --no-cocomo .
```

- [ ] **Step 3: Verify everything works end-to-end**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && just build && just check && just skill-check`
Expected: build generates, check confirms fresh, skill-check shows all green

- [ ] **Step 4: Commit**

```bash
git add package.json justfile
git commit -m "wire up skill-check and dev-skill in package.json + justfile

Replace TODO echo stubs with real implementations. Add build:gemini
and skill-check/dev recipes."
```

---

### Task 10: Regenerate brainstorming SKILL.md and verify

Final verification — rebuild with the new tiered preamble and confirm the generated output is correct.

**Files:**
- Modified (regenerated): `skills/brainstorming/SKILL.md`

- [ ] **Step 1: Rebuild**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && just build`

- [ ] **Step 2: Inspect the generated preamble — should be T1 (bash + CompletionStatus only)**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && head -80 skills/brainstorming/SKILL.md`
Expected: Frontmatter → AUTO-GENERATED comment → Preamble bash block → "Use the preamble output" → Completion Status → Escalation → skill content. No AskUserFormat, no Completeness table.

- [ ] **Step 3: Full health check**

Run: `cd /Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack && just skill-check`
Expected: All green, exit 0

- [ ] **Step 4: Commit the regenerated SKILL.md**

```bash
git add skills/brainstorming/SKILL.md
git commit -m "regenerate brainstorming SKILL.md with tiered preamble

Now uses T1 preamble: core bash + completion status + escalation.
No AskUserFormat or Completeness (those are T2+)."
```
