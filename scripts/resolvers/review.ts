import type { TemplateContext } from './types';

/**
 * Adversarial review step — auto-scaled by diff size.
 * Used by: finishing-a-development-branch, requesting-code-review
 *
 * Adapted from gstack. Removed Codex CLI integration (we use /dual-review
 * for cross-model review). Kept Claude adversarial subagent. Removed
 * gstack-review-log persistence. Removed gstack-config opt-out.
 */
export function generateAdversarialStep(ctx: TemplateContext): string {
  if (ctx.host === 'codex') return '';

  const isShip = ctx.skillName === 'finishing-a-development-branch';

  return `## Adversarial Review (auto-scaled)

Adversarial review thoroughness scales automatically based on diff size.

**Detect diff size:**

\`\`\`bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
echo "DIFF_SIZE: $DIFF_TOTAL"
\`\`\`

**Auto-select tier based on diff size:**
- **Small (< 50 lines changed):** Skip adversarial review entirely. Print: "Small diff ($DIFF_TOTAL lines) -- adversarial review skipped." Continue.
- **Medium (50-199 lines changed):** Run Claude adversarial subagent.
- **Large (200+ lines changed):** Run Claude adversarial subagent with comprehensive scope.

**User override:** If the user explicitly requested a thorough or paranoid review, honor that regardless of diff size.

---

### Medium tier (50-199 lines)

Claude's structured review already ran. Now add a **cross-model adversarial challenge** via a fresh subagent.

**Claude adversarial subagent:**

Dispatch via the Agent tool. The subagent has fresh context -- no checklist bias from the structured review. This genuine independence catches things the primary reviewer is blind to.

Subagent prompt:
"Read the diff for this branch with \`git diff origin/<base>\`. Think like an attacker and a chaos engineer. Your job is to find ways this code will fail in production. Look for: edge cases, race conditions, security holes, resource leaks, failure modes, silent data corruption, logic errors that produce wrong results silently, error handling that swallows failures, and trust boundary violations. Be adversarial. Be thorough. No compliments -- just the problems. For each finding, classify as FIXABLE (you know how to fix it) or INVESTIGATE (needs human judgment)."

Present findings under an \`ADVERSARIAL REVIEW (subagent):\` header. **FIXABLE findings** flow into the same Fix-First pipeline as the structured review. **INVESTIGATE findings** are presented as informational.

If the subagent fails or times out: "Adversarial subagent unavailable. Continuing without adversarial review."

---

### Large tier (200+ lines)

Run the adversarial subagent with expanded scope:

1. **Claude adversarial subagent** (same prompt as medium tier)
2. **Architecture review subagent** -- dispatch a second subagent focused on structural issues:

"Read the diff for this branch with \`git diff origin/<base>\`. Focus on architecture and design: does the code introduce unnecessary coupling? Are abstractions at the right level? Are there circular dependencies? Is the error handling strategy consistent? Are there patterns that will be hard to extend or test? For each finding, cite file:line."

Present findings under \`ADVERSARIAL REVIEW (architecture):\` header.

---

### Synthesis (medium and large tiers)

After all passes complete, synthesize:

\`\`\`
ADVERSARIAL REVIEW SYNTHESIS (TIER, N lines):
  High confidence (found by multiple sources): [findings agreed on by >1 pass]
  Unique to structured review: [from earlier step]
  Unique to adversarial: [from subagent]${isShip ? '' : '\n  Unique to architecture: [from architecture subagent, if ran]'}
\`\`\`

High-confidence findings (agreed on by multiple sources) should be prioritized for fixes.`;
}

// ─── Plan File Discovery (shared helper) ──────────────────────────────

function generatePlanFileDiscovery(): string {
  return `### Plan File Discovery

1. **Conversation context (primary):** Check if there is an active plan file in this conversation. If found, use it directly.

2. **Content-based search (fallback):** If no plan file is referenced in conversation context, search by content:

\`\`\`bash
setopt +o nomatch 2>/dev/null || true  # zsh compat
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)")
# Search common plan file locations
for PLAN_DIR in "docs/rkstack/plans" "docs/plans" ".rkstack/plans"; do
  [ -d "$PLAN_DIR" ] || continue
  PLAN=$(ls -t "$PLAN_DIR"/*.md 2>/dev/null | xargs grep -l "$BRANCH" 2>/dev/null | head -1)
  [ -z "$PLAN" ] && PLAN=$(ls -t "$PLAN_DIR"/*.md 2>/dev/null | xargs grep -l "$REPO" 2>/dev/null | head -1)
  [ -z "$PLAN" ] && PLAN=$(find "$PLAN_DIR" -name '*.md' -mmin -1440 -maxdepth 1 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
  [ -n "$PLAN" ] && break
done
[ -n "$PLAN" ] && echo "PLAN_FILE: $PLAN" || echo "NO_PLAN_FILE"
\`\`\`

3. **Validation:** If a plan file was found via content-based search, read the first 20 lines and verify it is relevant to the current branch's work. If it appears to be from a different project or feature, treat as "no plan file found."

**Error handling:**
- No plan file found -> skip with "No plan file detected -- skipping."
- Plan file found but unreadable -> skip with "Plan file found but unreadable -- skipping."`;
}

// ─── Plan Completion Audit ────────────────────────────────────────────

type PlanCompletionMode = 'ship' | 'review';

/**
 * Plan completion audit — cross-references plan items against the diff.
 * Used by: finishing-a-development-branch (ship mode), requesting-code-review (review mode)
 *
 * Adapted from gstack. Removed gstack-slug/gstack-review-log references.
 * Uses docs/rkstack/plans/ instead of ~/.gstack/projects/ for plan discovery.
 */
function generatePlanCompletionAuditInner(mode: PlanCompletionMode): string {
  const sections: string[] = [];

  sections.push(generatePlanFileDiscovery());

  // ── Item extraction ──
  sections.push(`
### Actionable Item Extraction

Read the plan file. Extract every actionable item -- anything that describes work to be done. Look for:

- **Checkbox items:** \`- [ ] ...\` or \`- [x] ...\`
- **Numbered steps** under implementation headings: "1. Create ...", "2. Add ...", "3. Modify ..."
- **Imperative statements:** "Add X to Y", "Create a Z service", "Modify the W controller"
- **File-level specifications:** "New file: path/to/file.ts", "Modify path/to/existing.rb"
- **Test requirements:** "Test that X", "Add test for Y", "Verify Z"

**Ignore:**
- Context/Background sections
- Questions and open items (marked with ?, "TBD", "TODO: decide")
- Explicitly deferred items ("Future:", "Out of scope:", "P2:", "P3:")

**Cap:** Extract at most 50 items. If the plan has more, note: "Showing top 50 of N plan items."

For each item, note:
- The item text (verbatim or concise summary)
- Its category: CODE | TEST | MIGRATION | CONFIG | DOCS`);

  // ── Cross-reference against diff ──
  sections.push(`
### Cross-Reference Against Diff

Run \`git diff origin/<base>...HEAD\` and \`git log origin/<base>..HEAD --oneline\` to understand what was implemented.

For each extracted plan item, check the diff and classify:

- **DONE** -- Clear evidence in the diff that this item was implemented. Cite the specific file(s) changed.
- **PARTIAL** -- Some work toward this item exists but it's incomplete.
- **NOT DONE** -- No evidence in the diff that this item was addressed.
- **CHANGED** -- Implemented using a different approach than the plan described, but the same goal is achieved.

**Be conservative with DONE** -- require clear evidence in the diff.
**Be generous with CHANGED** -- if the goal is met by different means, that counts.`);

  // ── Output format ──
  sections.push(`
### Output Format

\`\`\`
PLAN COMPLETION AUDIT
===========================
Plan: {plan file path}

## Implementation Items
  [DONE]      Create UserService -- src/services/user_service.rb (+142 lines)
  [PARTIAL]   Add validation -- model validates but missing controller checks
  [NOT DONE]  Add caching layer -- no cache-related changes in diff
  [CHANGED]   "Redis queue" -> implemented with Sidekiq instead

## Test Items
  [DONE]      Unit tests for UserService -- test/services/user_service_test.rb
  [NOT DONE]  E2E test for signup flow

------------------------------
COMPLETION: 4/7 DONE, 1 PARTIAL, 1 NOT DONE, 1 CHANGED
------------------------------
\`\`\``);

  // ── Gate logic (mode-specific) ──
  if (mode === 'ship') {
    sections.push(`
### Gate Logic

After producing the completion checklist:

- **All DONE or CHANGED:** Pass. "Plan completion: PASS -- all items addressed." Continue.
- **Only PARTIAL items (no NOT DONE):** Continue with a note in the PR body. Not blocking.
- **Any NOT DONE items:** Use AskUserQuestion:
  - Show the completion checklist above
  - "{N} items from the plan are NOT DONE. These were part of the original plan but are missing from the implementation."
  - RECOMMENDATION: depends on item count and severity. If 1-2 minor items, recommend B. If core functionality is missing, recommend A.
  - Options:
    A) Stop -- implement the missing items before shipping
    B) Ship anyway -- defer these to a follow-up
    C) These items were intentionally dropped -- remove from scope
  - If A: STOP. List the missing items for the user to implement.
  - If B: Continue. Note deferred items for TODOS.md.
  - If C: Continue. Note in PR body: "Plan items intentionally dropped: {list}."

**No plan file found:** Skip entirely. "No plan file detected -- skipping plan completion audit."

**Include in PR body:** Add a \`## Plan Completion\` section with the checklist summary.`);
  } else {
    sections.push(`
### Integration with Scope Drift Detection

The plan completion results augment the existing Scope Drift Detection. If a plan file is found:

- **NOT DONE items** become additional evidence for **MISSING REQUIREMENTS** in the scope drift report.
- **Items in the diff that don't match any plan item** become evidence for **SCOPE CREEP** detection.

This is **INFORMATIONAL** -- does not block the review.

Update the scope drift output to include plan file context:

\`\`\`
Scope Check: [CLEAN / DRIFT DETECTED / REQUIREMENTS MISSING]
Intent: <from plan file -- 1-line summary>
Plan: <plan file path>
Delivered: <1-line summary of what the diff actually does>
Plan items: N DONE, M PARTIAL, K NOT DONE
[If NOT DONE: list each missing item]
[If scope creep: list each out-of-scope change not in the plan]
\`\`\`

**No plan file found:** Fall back to existing scope drift behavior (check TODOS.md and PR description only).`);
  }

  return sections.join('\n');
}

export function generatePlanCompletionAuditShip(_ctx: TemplateContext): string {
  return generatePlanCompletionAuditInner('ship');
}

export function generatePlanCompletionAuditReview(_ctx: TemplateContext): string {
  return generatePlanCompletionAuditInner('review');
}

// ─── Plan Verification Execution ──────────────────────────────────────

/**
 * Plan verification — auto-run plan's test/verification steps.
 * Used by: finishing-a-development-branch
 *
 * Adapted from gstack. Uses $RKSTACK_BROWSE and /qa-only skill.
 */
export function generatePlanVerificationExec(_ctx: TemplateContext): string {
  return `## Plan Verification

Automatically verify the plan's testing/verification steps using the \`/qa-only\` skill.

### 1. Check for verification section

Using the plan file already discovered in the plan completion audit step, look for a verification section. Match any of these headings: \`## Verification\`, \`## Test plan\`, \`## Testing\`, \`## How to test\`, \`## Manual testing\`, or any section with verification-flavored items (URLs to visit, things to check visually, interactions to test).

**If no verification section found:** Skip with "No verification steps found in plan -- skipping auto-verification."
**If no plan file was found:** Skip (already handled).

### 2. Check for running dev server

Before invoking browse-based verification, check if a dev server is reachable:

\`\`\`bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:8080 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null || \\
curl -s -o /dev/null -w '%{http_code}' http://localhost:4000 2>/dev/null || echo "NO_SERVER"
\`\`\`

**If NO_SERVER:** Skip with "No dev server detected -- skipping plan verification. Run /qa separately after deploying."

### 3. Run verification

Follow the /qa-only workflow with these modifications:
- **Skip the preamble** (already handled)
- **Use the plan's verification section as the primary test input** -- treat each verification item as a test case
- **Use the detected dev server URL** as the base URL
- **Skip the fix loop** -- this is report-only verification
- **Cap at the verification items from the plan** -- do not expand into general site QA

### 4. Gate logic

- **All verification items PASS:** Continue silently. "Plan verification: PASS."
- **Any FAIL:** Use AskUserQuestion:
  - Show the failures with screenshot evidence
  - RECOMMENDATION: Choose A if failures indicate broken functionality. Choose B if cosmetic only.
  - Options:
    A) Fix the failures before shipping (recommended for functional issues)
    B) Ship anyway -- known issues (acceptable for cosmetic issues)
- **No verification section / no server:** Skip (non-blocking).

### 5. Include in PR body

Add a \`## Verification Results\` section to the PR body:
- If verification ran: summary of results (N PASS, M FAIL, K SKIPPED)
- If skipped: reason for skipping`;
}

/**
 * Review readiness dashboard — summary of all review passes.
 * Used by: finishing-a-development-branch
 *
 * Adapted from gstack. Removed gstack-review-read binary dependency.
 * Uses conversation context instead of JSONL review log.
 */
export function generateReviewDashboard(_ctx: TemplateContext): string {
  return `## Review Readiness Dashboard

After completing all review steps, display a summary dashboard.

Gather the status of each review pass completed in this session:

\`\`\`
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review              | Status    | Findings | Required |
|---------------------|-----------|----------|----------|
| Code Review         | CLEAR     | 0        | YES      |
| Test Coverage Audit | CLEAR     | 2 gaps   | YES      |
| Plan Completion     | CLEAR     | 0        | if plan  |
| Adversarial Review  | CLEAR     | 1        | auto     |
| Plan Verification   | PASS      | 0        | if plan  |
+--------------------------------------------------------------------+
| VERDICT: CLEARED -- all required reviews passed                     |
+====================================================================+
\`\`\`

**Review tiers:**
- **Code Review (required):** The primary review that gates shipping. Covers architecture, code quality, tests, performance.
- **Test Coverage Audit (required):** Ensures new code paths have test coverage.
- **Plan Completion (if plan exists):** Verifies all plan items are addressed.
- **Adversarial Review (automatic):** Auto-scales by diff size. Small diffs skip.
- **Plan Verification (if plan exists):** Auto-runs plan's test steps via /qa-only.

**Verdict logic:**
- **CLEARED**: Code Review and Test Coverage Audit both passed (or user overrode)
- **NOT CLEARED**: Any required review has unresolved blockers
- Plan Completion, Adversarial, and Plan Verification are shown for context but do not block shipping unless they surface critical issues`;
}
