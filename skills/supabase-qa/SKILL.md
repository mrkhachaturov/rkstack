---
name: supabase-qa
preamble-tier: 3
version: 1.0.0
user-invocable: true
description: |
  Deep Supabase testing — auth flows, RLS policies, data consistency between
  browser and database, migration validation. Use when working on a project
  with Supabase backend.
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
announce-action: run deep Supabase testing
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (supabase-qa) ===

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

# /supabase-qa: Deep Supabase Testing

You are a Supabase QA engineer. Test auth flows, RLS policies, data consistency between browser and database, migration hygiene, realtime subscriptions, and storage. Produce a structured report with pass/fail per category.

**Announce at start:** "I'm using the supabase-qa skill to run deep Supabase testing."

---

## Prerequisites Check

Verify the project uses Supabase and the MCP server is available.

1. Check session context for `HAS_SUPABASE=yes`. If not present, stop: "This project doesn't appear to use Supabase. The session-start hook did not detect a Supabase configuration. If you do use Supabase, check that `.mcp.json` includes a Supabase server or that a `supabase/` directory exists."

2. Verify the Supabase MCP server is reachable by listing tables or running a simple query via the MCP tools. If the MCP tools are not available or the server does not respond, stop: "The Supabase MCP server isn't configured or isn't responding. Add it to `.mcp.json` and restart your session."

3. Check CLAUDE.md for Supabase-specific documentation (schema descriptions, access patterns, known RLS rules). Note anything found for reference throughout testing.

4. Find the browse binary path from session context (`RKSTACK_BROWSE`). If available, it will be used for browser-side testing in the data consistency section. If unavailable, data consistency testing will rely on CLI/API operations only.

---

## Phase 1: Auth Flow Testing

Test authentication flows end-to-end, verifying both the user-facing behavior and the database state.

### 1a. Signup flow

- If a signup form exists, submit it with test credentials via `$RKSTACK_BROWSE` (if available) or via Supabase MCP `auth.signUp`
- Query `auth.users` via MCP to verify the user was created
- Check that the user's metadata matches what was submitted
- Verify email confirmation status (if email confirmation is enabled)

### 1b. Login flow

- Sign in with the test credentials
- Verify a session was created — query via MCP or check the JWT returned
- Verify the JWT token claims include the correct `role` and any custom claims

### 1c. Password reset flow

- Trigger a password reset via the API
- Verify the reset token was generated (check `auth.users` for updated `recovery_token` or related fields)
- Note: full email delivery testing is out of scope, but verify the API call succeeds

### 1d. OAuth flows (if configured)

- Check Supabase auth configuration for enabled OAuth providers
- If OAuth providers are configured, note them in the report
- OAuth flows require browser interaction that may not be fully automatable — flag as "manual verification recommended" if present

### 1e. Session cleanup

- Sign out via the API
- Verify the session is invalidated

Record pass/fail for each sub-step.

---

## Phase 2: RLS Policy Audit

Audit Row Level Security across all tables.

### 2a. Enumerate tables

List all tables in the `public` schema via Supabase MCP.

### 2b. Check RLS status

For each table, check whether RLS is enabled. Query `pg_tables` or use Supabase MCP to determine RLS status.

Flag any table with RLS **disabled** as a finding. Tables that intentionally have no RLS (e.g., public reference data) should be noted but not treated as critical.

### 2c. List policies

For each table with RLS enabled, list all policies. Note the policy name, command (SELECT/INSERT/UPDATE/DELETE), and the roles it applies to.

### 2d. Test access patterns

For each table, test three access patterns:

1. **Anonymous access (anon key):** Attempt to SELECT, INSERT, UPDATE, DELETE. Record what is allowed vs blocked.
2. **Authenticated access:** Sign in as a test user, then attempt the same operations. Record results.
3. **Service role access:** If the service role key is available via MCP, verify it bypasses RLS as expected.

### 2e. Flag issues

- Tables with RLS disabled (critical unless intentionally public)
- Overly permissive policies (e.g., `true` as the policy expression for non-public tables)
- Missing policies for specific operations (e.g., SELECT allowed but no INSERT policy exists)
- Policies that reference columns or functions that don't exist

### 2f. Compute RLS coverage

```
RLS coverage = (tables with RLS enabled and policies defined) / (total tables) * 100
```

Record the coverage percentage for the final report.

---

## Phase 3: Data Consistency Testing

Verify that user-facing actions produce correct database state.

### 3a. Identify testable actions

Read the project source to identify user actions that write data. Common examples:
- Form submissions (contact, signup, profile update)
- Cart operations (add to cart, update quantity, remove)
- Account changes (update email, change password, update preferences)
- Content creation (new post, comment, upload)

If `$RKSTACK_BROWSE` is available, use it to perform these actions through the browser. Otherwise, use API calls or Supabase MCP directly.

### 3b. Test each action

For each testable action:

1. Perform the action (via browser or API)
2. Immediately query the database via Supabase MCP
3. Verify the data matches what the UI showed or the API returned
4. Check for:
   - Missing records (action appeared to succeed but no row was written)
   - Incorrect values (data transformed incorrectly)
   - Orphaned records (related records not created or foreign keys missing)
   - Stale data (cached or outdated values)

### 3c. Record findings

For each action tested, record: action performed, expected database state, actual database state, pass/fail.

---

## Phase 4: Migration Validation

Check the health of database migrations.

### 4a. Find migrations

```bash
ls supabase/migrations/ 2>/dev/null || echo "NO_MIGRATIONS_DIR"
```

If no `supabase/migrations/` directory exists, skip this phase and note it in the report.

### 4b. Check migration files

For each migration file:

1. Read the migration SQL
2. Verify it includes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for any new tables
3. Check that indexes exist for columns used in WHERE clauses or JOINs (based on the schema)
4. Look for destructive operations (DROP TABLE, DROP COLUMN) without corresponding safeguards

### 4c. Check for pending migrations

```bash
# List local migrations not yet applied (if supabase CLI is available)
npx supabase migration list 2>/dev/null || echo "SUPABASE_CLI_UNAVAILABLE"
```

If the Supabase CLI is available, check for migrations that exist locally but have not been applied to the linked project.

### 4d. Down migration check

For each up migration, check if a corresponding down/revert migration exists. If the project uses a migration pattern that supports rollbacks, verify rollback files are present.

---

## Phase 5: Realtime Subscription Testing

If the project uses Supabase Realtime features, test them.

### 5a. Detect realtime usage

```bash
# Search for realtime subscription patterns in source code
```

Search the codebase for `.channel(`, `.on('postgres_changes'`, `supabase.realtime`, or similar patterns.

If no realtime usage is detected, skip this phase and note "Realtime not used" in the report.

### 5b. Test subscriptions

If realtime is used:

1. Identify which tables have realtime subscriptions
2. Subscribe to a channel via Supabase MCP (if supported) or note the subscription pattern
3. Trigger a change to the subscribed table (INSERT, UPDATE, or DELETE)
4. Verify the change event fires — check via MCP or browser console logs

If realtime testing is not fully automatable, document the subscription patterns found and mark as "manual verification recommended."

---

## Phase 6: Storage Testing

If the project uses Supabase Storage, test it.

### 6a. Detect storage usage

Search the codebase for `.storage.from(`, `supabase.storage`, or bucket references.

If no storage usage is detected, skip this phase and note "Storage not used" in the report.

### 6b. List buckets

Use Supabase MCP to list all storage buckets. Note which are public vs private.

### 6c. Test upload and access

1. If `$RKSTACK_BROWSE` is available and the app has a file upload UI, upload a test file through the browser
2. Verify the file exists in the correct bucket via Supabase MCP
3. Test access control:
   - Public buckets: verify the file is accessible via public URL
   - Private buckets: verify the file requires authentication to access

### 6d. Check storage policies

Review storage policies (RLS on the `storage.objects` table) to verify they match the intended access patterns.

---

## Phase 7: Report

Write the report to `.rkstack/supabase-qa-reports/supabase-qa-{date}.md`.

```bash
mkdir -p .rkstack/supabase-qa-reports
```

Report template:

```markdown
# Supabase QA Report -- [project] -- [YYYY-MM-DD]

## Summary
- **RLS Coverage:** [X]%
- **Categories Tested:** [N] of 6
- **Findings:** [total count]
- **Critical:** [count]

## Auth Flows
| Flow | Status | Notes |
|------|--------|-------|
| Signup | PASS/FAIL | [details] |
| Login | PASS/FAIL | [details] |
| Password reset | PASS/FAIL | [details] |
| OAuth | PASS/FAIL/SKIPPED | [details] |
| Session cleanup | PASS/FAIL | [details] |

## RLS Policy Audit
- **Tables scanned:** [N]
- **RLS enabled:** [N] of [total]
- **Coverage:** [X]%

| Table | RLS | Policies | Issues |
|-------|-----|----------|--------|
| [name] | yes/no | [count] | [none / description] |

## Data Consistency
| Action | Expected | Actual | Status |
|--------|----------|--------|--------|
| [action] | [state] | [state] | PASS/FAIL |

## Migrations
- **Migration files:** [N]
- **Pending:** [N]
- **RLS on new tables:** [yes/no/N/A]
- **Down migrations:** [present/missing/N/A]

## Realtime
[Results or "Not used"]

## Storage
[Results or "Not used"]

## Recommendations
[Bulleted list of actionable improvements, ordered by severity]
```

---

## Rules

1. **Never skip the prerequisites check.** If Supabase is not detected or MCP is not available, stop immediately.
2. **Never hardcode credentials.** Use the MCP tools for all database access. Do not embed connection strings or API keys.
3. **Read CLAUDE.md first.** The project may document its schema, access patterns, or known Supabase configuration.
4. **Be conservative with writes.** When testing data consistency, use test data that can be easily identified and cleaned up. Prefix test records with `_test_` or use a recognizable pattern.
5. **Clean up test data.** After testing, delete any test records created during the QA run.
6. **Report everything.** Even if a phase is skipped (no realtime, no storage), note it in the report so the reader knows it was considered.
7. **RLS disabled is always a finding.** Even if intentional, it should be documented. Let the developer decide if it is acceptable.
