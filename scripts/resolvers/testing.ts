import type { TemplateContext } from './types';

/**
 * Test framework bootstrap — detect, research, install, verify.
 * Used by: qa, design-review, finishing-a-development-branch
 *
 * Adapted from gstack. Removed gstack-slug references.
 * Uses .rkstack/ instead of .gstack/ for opt-out marker.
 */
export function generateTestBootstrap(_ctx: TemplateContext): string {
  return `## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

\`\`\`bash
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
\`\`\`

**If test framework detected** (config files or test directories found):
Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."
Read 2-3 existing test files to learn conventions (naming, imports, assertion style, setup patterns).
Store conventions as prose context for use in later test generation steps. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED** appears: Print "Test bootstrap previously declined -- skipping." **Skip the rest of bootstrap.**

**If NO runtime detected** (no config files found): Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H -> write \`.rkstack/no-test-bootstrap\` and continue without tests.

**If runtime detected but no test framework -- bootstrap:**

### B2. Research best practices

Use WebSearch to find current best practices for the detected runtime:
- \`"[runtime] best test framework 2025 2026"\`
- \`"[framework A] vs [framework B] comparison"\`

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

If user picks C -> write \`.rkstack/no-test-bootstrap\`. Tell user: "If you change your mind later, delete \`.rkstack/no-test-bootstrap\` and re-run." Continue without tests.

If multiple runtimes detected (monorepo) -> ask which runtime to set up first, with option to do both sequentially.

### B4. Install and configure

1. Install the chosen packages (npm/bun/gem/pip/etc.)
2. Create minimal config file
3. Create directory structure (test/, spec/, etc.)
4. Create one example test matching the project's code to verify setup works

If package installation fails -> debug once. If still failing -> revert with \`git checkout -- package.json package-lock.json\` (or equivalent for the runtime). Warn user and continue without tests.

### B4.5. First real tests

Generate 3-5 real tests for existing code:

1. **Find recently changed files:** \`git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10\`
2. **Prioritize by risk:** Error handlers > business logic with conditionals > API endpoints > pure functions
3. **For each file:** Write one test that tests real behavior with meaningful assertions. Never \`expect(x).toBeDefined()\` -- test what the code DOES.
4. Run each test. Passes -> keep. Fails -> fix once. Still fails -> delete silently.
5. Generate at least 1 test, cap at 5.

Never import secrets, API keys, or credentials in test files. Use environment variables or test fixtures.

### B5. Verify

\`\`\`bash
# Run the full test suite to confirm everything works
{detected test command}
\`\`\`

If tests fail -> debug once. If still failing -> revert all bootstrap changes and warn user.

### B5.5. CI/CD pipeline

\`\`\`bash
# Check CI provider
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
\`\`\`

If \`.github/\` exists (or no CI detected -- default to GitHub Actions):
Create \`.github/workflows/test.yml\` with:
- \`runs-on: ubuntu-latest\`
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

First check: If CLAUDE.md already has a \`## Testing\` section -> skip. Don't duplicate.

Append a \`## Testing\` section:
- Run command and test directory
- Reference to TESTING.md
- Test expectations:
  - When writing new functions, write a corresponding test
  - When fixing a bug, write a regression test
  - When adding error handling, write a test that triggers the error
  - When adding a conditional (if/else, switch), write tests for BOTH paths
  - Never commit code that makes existing tests fail

### B8. Commit

\`\`\`bash
git status --porcelain
\`\`\`

Only commit if there are changes. Stage all bootstrap files (config, test directory, TESTING.md, CLAUDE.md, .github/workflows/test.yml if created):
\`git commit -m "chore: bootstrap test framework ({framework name})"\`

---`;
}

// ─── Test Coverage Audit ────────────────────────────────────
//
// Shared methodology for codepath tracing, ASCII diagrams, and test gap analysis.
// Two modes, two placeholders, one inner function:
//
//   {{TEST_COVERAGE_AUDIT_SHIP}}   → finishing-a-development-branch: auto-generates tests, coverage summary
//   {{TEST_COVERAGE_AUDIT_REVIEW}} → requesting-code-review: generates tests via Fix-First (ASK)

type CoverageAuditMode = 'ship' | 'review';

function generateTestCoverageAuditInner(mode: CoverageAuditMode): string {
  const sections: string[] = [];

  // ── Intro (mode-specific) ──
  if (mode === 'ship') {
    sections.push(`100% coverage is the goal -- every untested path is a path where bugs hide. Evaluate what was ACTUALLY coded (from the diff), not what was planned.`);
  } else {
    sections.push(`100% coverage is the goal. Evaluate every codepath changed in the diff and identify test gaps. Gaps become INFORMATIONAL findings that follow the Fix-First flow.`);
  }

  // ── Test framework detection (shared) ──
  sections.push(`
### Test Framework Detection

Before analyzing coverage, detect the project's test framework:

1. **Read CLAUDE.md** -- look for a \`## Testing\` section with test command and framework name. If found, use that as the authoritative source.
2. **If CLAUDE.md has no testing section, auto-detect:**

\`\`\`bash
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
\`\`\`

3. **If no framework detected:**${mode === 'ship' ? ' falls through to the Test Framework Bootstrap step which handles full setup.' : ' still produce the coverage diagram, but skip test generation.'}`);

  // ── Before/after count (ship only) ──
  if (mode === 'ship') {
    sections.push(`
**0. Before/after test count:**

\`\`\`bash
# Count test files before any generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

Store this number for the PR body.`);
  }

  // ── Codepath tracing methodology (shared) ──
  sections.push(`
**${mode === 'ship' ? '1' : 'Step 1'}. Trace every codepath changed** using \`git diff origin/<base>...HEAD\`:

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

This is the critical step -- you're building a map of every line of code that can execute differently based on input. Every branch in this diagram needs a test.`);

  // ── User flow coverage (shared) ──
  sections.push(`
**${mode === 'ship' ? '2' : 'Step 2'}. Map user flows, interactions, and error states:**

Code coverage isn't enough -- you need to cover how real users interact with the changed code. For each changed feature, think through:

- **User flows:** What sequence of actions does a user take that touches this code? Map the full journey. Each step in the journey needs a test.
- **Interaction edge cases:** Double-click/rapid resubmit, navigate away mid-operation, submit with stale data, slow connection, concurrent actions
- **Error states the user can see:** For every error the code handles, what does the user actually experience? Can the user recover?
- **Empty/zero/boundary states:** What does the UI show with zero results? With 10,000 results? With maximum-length input?

Add these to your diagram alongside the code branches.`);

  // ── Check branches against tests + quality rubric (shared) ──
  sections.push(`
**${mode === 'ship' ? '3' : 'Step 3'}. Check each branch against existing tests:**

Go through your diagram branch by branch -- both code paths AND user flows. For each one, search for a test that exercises it:
- Function \`processPayment()\` -> look for \`billing.test.ts\`, \`billing.spec.ts\`
- An if/else -> look for tests covering BOTH the true AND false path
- An error handler -> look for a test that triggers that specific error condition
- A user flow -> look for an integration or E2E test that walks through the journey

Quality scoring rubric:
- 3-star: Tests behavior with edge cases AND error paths
- 2-star: Tests correct behavior, happy path only
- 1-star: Smoke test / existence check / trivial assertion`);

  // ── E2E test decision matrix (shared) ──
  sections.push(`
### E2E Test Decision Matrix

**RECOMMEND E2E:**
- Common user flow spanning 3+ components/services
- Integration point where mocking hides real failures
- Auth/payment/data-destruction flows

**STICK WITH UNIT TESTS:**
- Pure function with clear inputs/outputs
- Internal helper with no side effects
- Edge case of a single function`);

  // ── Regression rule (shared) ──
  sections.push(`
### REGRESSION RULE (mandatory)

**IRON RULE:** When the coverage audit identifies a REGRESSION -- code that previously worked but the diff broke -- a regression test is written immediately. No AskUserQuestion. No skipping. Regressions are the highest-priority test because they prove something broke.${mode !== 'plan' ? '\n\nFormat: commit as `test: regression test for {what broke}`' : ''}`);

  // ── ASCII coverage diagram (shared) ──
  sections.push(`
**${mode === 'ship' ? '4' : 'Step 4'}. Output ASCII coverage diagram:**

\`\`\`
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
\`\`\`

**Fast path:** All paths covered -> "All new code paths have test coverage." Continue.`);

  // ── Mode-specific action section ──
  if (mode === 'ship') {
    sections.push(`
**5. Generate tests for uncovered paths:**

If test framework detected (or bootstrapped):
- Prioritize error handlers and edge cases first (happy paths are more likely already tested)
- Read 2-3 existing test files to match conventions exactly
- Generate unit tests. Mock all external dependencies (DB, API, Redis).
- For paths marked E2E: generate integration/E2E tests using the project's E2E framework
- Write tests that exercise the specific uncovered path with real assertions
- Run each test. Passes -> commit as \`test: coverage for {feature}\`
- Fails -> fix once. Still fails -> revert, note gap in diagram.

Caps: 30 code paths max, 20 tests generated max, 2-min per-test exploration cap.

If no test framework AND user declined bootstrap -> diagram only, no generation. Note: "Test generation skipped -- no test framework configured."

**Diff is test-only changes:** Skip entirely: "No new application code paths to audit."

**6. After-count and coverage summary:**

\`\`\`bash
# Count test files after generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

For PR body: \`Tests: {before} -> {after} (+{delta} new)\`
Coverage line: \`Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.\`

**7. Coverage gate:**

Before proceeding, check CLAUDE.md for a \`## Test Coverage\` section with \`Minimum:\` and \`Target:\` fields. If found, use those percentages. Otherwise use defaults: Minimum = 60%, Target = 80%.

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

**100% coverage:** "Coverage gate: PASS (100%)." Continue.`);
  } else {
    // review mode
    sections.push(`
**Step 5. Generate tests for gaps (Fix-First):**

If test framework is detected and gaps were identified:
- Classify each gap as AUTO-FIX or ASK per the Fix-First Heuristic:
  - **AUTO-FIX:** Simple unit tests for pure functions, edge cases of existing tested functions
  - **ASK:** E2E tests, tests requiring new test infrastructure, tests for ambiguous behavior
- For AUTO-FIX gaps: generate the test, run it, commit as \`test: coverage for {feature}\`
- For ASK gaps: include in the Fix-First batch question with the other review findings

If no test framework detected -> include gaps as INFORMATIONAL findings only, no generation.

**Diff is test-only changes:** Skip entirely: "No new application code paths to audit."

### Coverage Warning

After producing the coverage diagram, check the coverage percentage. Read CLAUDE.md for a \`## Test Coverage\` section with a \`Minimum:\` field. If not found, use default: 60%.

If coverage is below the minimum threshold, output a prominent warning:

\`\`\`
WARNING: COVERAGE WARNING: AI-assessed coverage is {X}%. {N} code paths untested.
Consider writing tests before running /finishing-a-development-branch.
\`\`\`

This is INFORMATIONAL -- does not block the review. But it makes low coverage visible early.`);
  }

  return sections.join('\n');
}

export function generateTestCoverageAuditShip(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('ship');
}

export function generateTestCoverageAuditReview(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('review');
}
