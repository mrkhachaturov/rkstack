# Pre-Landing Review Checklist

## Instructions

Review the `git diff origin/<base>` output for the issues listed below. Be specific -- cite `file:line` and suggest fixes. Skip anything that's fine. Only flag real problems.

**Two-pass review:**
- **Pass 1 (CRITICAL):** Run SQL & Data Safety, Race Conditions, Auth & Security, and Enum Completeness first. Highest severity.
- **Pass 2 (INFORMATIONAL):** Run all remaining categories. Lower severity but still actioned.

All findings get action via Fix-First Review: obvious mechanical fixes are applied automatically, genuinely ambiguous issues are batched into a single user question.

**Output format:**

```
Pre-Landing Review: N issues (X critical, Y informational)

**AUTO-FIXED:**
- [file:line] Problem -> fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix
```

If no issues found: `Pre-Landing Review: No issues found.`

Be terse. For each issue: one line describing the problem, one line with the fix. No preamble, no summaries, no "looks good overall."

---

## Review Categories

### Pass 1 -- CRITICAL

#### SQL & Data Safety
- String interpolation in SQL -- use parameterized queries regardless of language/framework
- TOCTOU races: check-then-set patterns that should be atomic `WHERE` + update
- Bypassing model validations for direct DB writes (ORM escape hatches like `update_column`, raw queries)
- N+1 queries: missing eager loading for associations used in loops/views
- Missing transactions around multi-step mutations
- Schema changes without migration strategy
- Unbounded queries (missing LIMIT, no pagination)

#### Race Conditions & Concurrency
- Read-check-write without uniqueness constraint or duplicate key handling
- find-or-create without unique DB index -- concurrent calls can create duplicates
- Status transitions without atomic `WHERE old_status = ? UPDATE SET new_status` -- concurrent updates can skip or double-apply
- Shared mutable state without synchronization
- Non-idempotent operations in retry paths
- Unsafe HTML rendering on user-controlled data (XSS)

#### Auth & Security
- Authentication bypass paths
- Missing authorization checks on new endpoints
- Secrets in code or config (API keys, tokens, passwords)
- LLM output trusted without validation (trust boundary violations)
- LLM-generated values (emails, URLs, names) written to DB without format validation
- Structured tool output accepted without type/shape checks before database writes

#### Enum & Value Completeness
When the diff introduces a new enum value, status string, tier name, or type constant:
- **Trace it through every consumer.** Read (don't just grep -- READ) each file that switches on, filters by, or displays that value. If any consumer doesn't handle the new value, flag it.
- **Check allowlists/filter arrays.** Search for arrays or lists containing sibling values and verify the new value is included where needed.
- **Check case/switch/if-else chains.** If existing code branches on the enum, does the new value fall through to a wrong default?

To do this: use Grep to find all references to the sibling values. Read each match. This step requires reading code OUTSIDE the diff.

### Pass 2 -- INFORMATIONAL

#### Conditional Side Effects
- Code paths that branch on a condition but forget to apply a side effect on one branch
- Log messages that claim an action happened but the action was conditionally skipped

#### Error Handling Boundaries
- Missing error context (bare `throw` or `raise` without message)
- Catch-all handlers that swallow errors silently
- Error recovery paths that leave state partially modified
- Missing cleanup in failure paths (open handles, temporary files, locks)

#### Magic Numbers & String Coupling
- Bare numeric literals used in multiple files -- should be named constants
- Error message strings used as query filters elsewhere (grep for the string -- is anything matching on it?)

#### Dead Code & Consistency
- Variables assigned but never read
- Unreachable branches, unused imports, commented-out blocks
- Comments/docstrings that describe old behavior after the code changed
- Naming that misleads (function name doesn't match behavior)

#### Test Gaps
- New code paths without corresponding tests
- Error handlers without tests that trigger them
- Edge cases mentioned in comments but not tested
- Security enforcement features (blocking, rate limiting, auth) without tests verifying the enforcement path

#### Crypto & Entropy
- Truncation of data instead of hashing (last N chars instead of SHA-256) -- less entropy, easier collisions
- `rand()` / `Math.random()` for security-sensitive values -- use cryptographic random instead
- Non-constant-time comparisons (`==`) on secrets or tokens -- vulnerable to timing attacks

#### Time Window Safety
- Date-key lookups that assume "today" covers 24h -- reports generated partway through the day only see partial data
- Mismatched time windows between related features -- one uses hourly buckets, another uses daily keys

#### Type Coercion at Boundaries
- Values crossing serialization boundaries where type could change (numeric vs string)
- Hash/digest inputs that don't normalize types before serialization

#### Performance
- N+1 queries in loops
- Unnecessary allocations in hot paths
- Missing indexes for new query patterns
- O(n*m) lookups that could be O(n) with a hash/map

#### Bundle & Dependency Impact
- New dependencies that are known-heavy (moment.js, lodash full, jquery) -- suggest lighter alternatives
- Significant lockfile growth from a single addition
- Large static assets committed to repo (>500KB per file)
- Images without `loading="lazy"` or explicit width/height

---

## Severity Classification

```
CRITICAL (highest severity):      INFORMATIONAL (lower severity):
|-- SQL & Data Safety              |-- Conditional Side Effects
|-- Race Conditions & Concurrency  |-- Error Handling Boundaries
|-- Auth & Security                |-- Magic Numbers & String Coupling
|-- Enum & Value Completeness      |-- Dead Code & Consistency
                                   |-- Test Gaps
                                   |-- Crypto & Entropy
                                   |-- Time Window Safety
                                   |-- Type Coercion at Boundaries
                                   |-- Performance
                                   |-- Bundle & Dependency Impact

All findings are actioned via Fix-First Review. Severity determines
presentation order and classification of AUTO-FIX vs ASK -- critical
findings lean toward ASK (they're riskier), informational findings
lean toward AUTO-FIX (they're more mechanical).
```

---

## Fix-First Heuristic

This heuristic determines whether the agent auto-fixes a finding or asks the user.

```
AUTO-FIX (agent fixes without asking):     ASK (needs human judgment):
|-- Dead code / unused variables            |-- Security (auth, XSS, injection)
|-- N+1 queries (missing eager loading)     |-- Race conditions
|-- Stale comments contradicting code       |-- Design decisions
|-- Magic numbers -> named constants        |-- Large fixes (>20 lines)
|-- Missing input validation                |-- Enum completeness
|-- Variables assigned but never read       |-- Removing functionality
|-- Obvious typos and formatting            |-- Anything changing user-visible
                                               behavior
```

**Rule of thumb:** If the fix is mechanical and a senior engineer would apply it without discussion, it's AUTO-FIX. If reasonable engineers could disagree about the fix, it's ASK.

**Critical findings default toward ASK** (they're inherently riskier).
**Informational findings default toward AUTO-FIX** (they're more mechanical).

---

## Suppressions -- DO NOT flag these

- "X is redundant with Y" when the redundancy is harmless and aids readability
- "Add a comment explaining why this threshold/constant was chosen" -- thresholds change during tuning, comments rot
- "This assertion could be tighter" when the assertion already covers the behavior
- Suggesting consistency-only changes (wrapping a value in a conditional to match how another constant is guarded)
- "Regex doesn't handle edge case X" when the input is constrained and X never occurs in practice
- "Test exercises multiple guards simultaneously" -- that's fine, tests don't need to isolate every guard
- Harmless no-ops (e.g., `.filter()` on an element that's never in the array)
- ANYTHING already addressed in the diff you're reviewing -- read the FULL diff before commenting
