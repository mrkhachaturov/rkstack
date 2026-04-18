---
name: codex-help
preamble-tier: 2
version: 1.0.0
description: |
  User-invocable skill for when Claude is stuck mid-task. Claude narrates its
  own blocker to Codex, gets back a structured diagnosis + concrete next steps,
  applies them, verifies, and loops up to N rounds until the problem is resolved
  or the loop detects it's spinning. Read-only — Codex advises, Claude edits.
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Edit
  - Write
  - AskUserQuestion
announce-action: ask Codex for help and loop until the blocker is resolved
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (codex-help) ===

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

# Codex Help

User invokes `/codex-help` when they see Claude struggling. Claude narrates
its own situation to Codex, receives a structured diagnosis + next steps,
applies them, verifies whether the problem is resolved, and loops up to
MAX_ROUNDS times. Codex runs read-only — Claude is the one applying changes.

This is **help for Claude**, not delegation. If the user wants Codex to
take over and fix something hands-on, direct them to `/rescue` instead.
If they want to adjudicate a multiple-choice design question, direct them
to the inline `Ask Codex` option in brainstorming or writing-plans.

**Announce at start:** "I'm using the codex-help skill to ask Codex for help and loop until the blocker is resolved."

## Parse arguments

User invokes `/codex-help [--rounds N] [optional framing]`.

- **`--rounds N`** — optional, default `3`. Upper bound on loop iterations.
- **Framing text** — anything after flags. Treated as the user's angle on
  the problem (e.g. `/codex-help --rounds 5 focus on the async test`).
  Don't mutate the user's phrasing; include it in the prompt's
  `claude_status` block under "User's framing."

If `$ARGUMENTS` is empty AND Claude has no recent task context from the
conversation (cold start), use `AskUserQuestion` once: `"What are you
stuck on? I'll summarize and ask Codex."` Then proceed.

## Step 0: Verify Codex is ready

The helper gates on this and returns exit code `3` if Codex is missing or
not authenticated. No separate check needed from the skill — handle exit
`3` in step 4 below with `"Codex CLI not found or not logged in. Run `!codex login` to authenticate."`

## The loop

Rounds share a **persistent Codex thread** — the same mechanism `/rescue --resume`
uses. Round 1 creates the thread (`--persist-thread`), rounds 2+ resume it
(`--resume <thread-id>`). Codex's own reasoning carries across rounds, so follow-up
prompts are **deltas**, not re-statements. You only need to track the diagnosis
text from each round (for stuck-loop detection).

Initialize:

- `MAX_ROUNDS` ← from `--rounds N` flag, default `3`
- `THREAD_ID` ← `null` (will be filled from round 1's response)
- `PRIOR_DIAGNOSES` ← empty list, one string per completed round (for stuck-loop detection)
- `HISTORY_NOTES` ← empty list, one short entry per round for the final summary
- `STATUS` ← `"in-progress"`

For each round `R` from 1 to `MAX_ROUNDS`:

### 1. Assemble the prompt

**Round 1 — full context.** In first person, describe the blocker
concretely:

```xml
<task>
Claude Code is working with a user and has hit a blocker. Help Claude
unblock — advise, do not take over. Claude stays at the wheel and applies
the advice. Read the situation below and inspect any referenced files,
then return a structured diagnosis with concrete next steps Claude can
apply directly. We may iterate — I'll resume this thread on round 2+
if your advice doesn't resolve the blocker the first time.
</task>

<claude_status>
I'm trying to: <core task>
What I've tried: <attempts in order, terse>
What's breaking: <exact symptom, error verbatim if any>
My current hypothesis: <flagged as inference, not fact>
User's framing: <$ARGUMENTS text, or "none">
</claude_status>

<references>
- path/to/file.ts (what I'm working in)
- path/to/test.ts (the failing test)
- path/to/error.log (the error output)
- CLAUDE.md (project conventions)
</references>

<grounding_rules>
Do not invent files, APIs, or error messages not in the references.
If a claim depends on inference, say so.
</grounding_rules>

<missing_context_gating>
If you cannot make a confident diagnosis from the provided context, do not
guess. List what you need in `missing_context`, and give a best-effort
diagnosis flagged as preliminary in the `analysis` block.
</missing_context_gating>

<default_follow_through_policy>
If the next_steps you propose depend on each other (step 2 only makes sense
after step 1 surfaces a specific fact), order them explicitly and note the
dependency in each step's `why`.
</default_follow_through_policy>

<structured_output_contract>
Return only valid JSON matching the provided schema. Action steps must be
specific and imperative (e.g. "Read lib/foo.ts:42-67 to see how X handles Y",
not "investigate lib/foo.ts"). Reasons stay terse.
</structured_output_contract>
```

**Round 2+ — delta only.** Because the Codex thread is resumed, Codex
already remembers its own prior analysis, diagnosis, and next_steps. Send a
short update — what Claude applied, how it was verified, what changed:

```xml
<round_update>
This is round R of MAX_ROUNDS. I applied your previous next_steps:
<one-line summary of each step Claude actually executed>

I verified by running: <exact command or check>
Result: <brief — "still fails with the same error", "fails with a new
error: ...", "passes but ...", etc.>

<if_new_files_or_errors_became_relevant>
New references (not in the initial set):
- path/new-file.ts (why it's now relevant)
</if_new_files_or_errors_became_relevant>

Help me pick the next move. If you think we're going in circles, say so
directly — I'll escalate to hands-on iteration via /rescue.
</round_update>

<structured_output_contract>
Same as round 1 — return only valid JSON matching the schema.
</structured_output_contract>
```

No `<claude_status>` re-dump, no `<references>` re-list, no re-stating
`<grounding_rules>`. Codex has all of that from the resumed thread.

### 2. Call Codex

**Round 1** — create a persistent thread:

```bash
HELP=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/codex/consult.mjs" \
  --schema "${CLAUDE_PLUGIN_ROOT}/skills/codex-help/codex-help-schema.json" \
  --cwd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" \
  --effort high \
  --persist-thread \
  <<'CODEX_PROMPT'
<the round 1 prompt from step 1>
CODEX_PROMPT
) ; EXIT=$?
```

**Round 2+** — resume the same thread:

```bash
HELP=$(node "${CLAUDE_PLUGIN_ROOT}/scripts/codex/consult.mjs" \
  --schema "${CLAUDE_PLUGIN_ROOT}/skills/codex-help/codex-help-schema.json" \
  --cwd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" \
  --effort high \
  --resume "$THREAD_ID" \
  <<'CODEX_PROMPT'
<the round R delta prompt from step 1>
CODEX_PROMPT
) ; EXIT=$?
```

Use `timeout: 300000` (5 min). Effort `high` is the default because this
is a diagnosis task — Codex benefits from deep reasoning. User may bump to
`xhigh` by invoking `/codex-help --effort xhigh ...` — if so, pass that
through. Valid effort values: `none`, `minimal`, `low`, `medium`, `high`,
`xhigh`.

Exit codes:

- `0` → `$HELP` is a parsed JSON envelope, continue to step 3
- `1` → Codex turn failed or unparseable output. Read stderr, report
  actionable lines, stop the loop and report.
- `2` → usage error in the invocation. Fix it.
- `3` → Codex CLI not installed/authenticated. Stop with
  `"Codex CLI not found or not logged in. Run `!codex login` to authenticate."`

**Fallback for lost threads.** If round 2+ fails because the broker evicted
the thread (rare, but possible if the session-lifecycle hook ran between
rounds or the broker restarted), `runAppServerTurn` throws. Detect this by
the Codex error message mentioning the thread ID. On that specific failure,
fall back cleanly: start a fresh persistent thread (drop `--resume`, add
`--persist-thread`) and **include a one-paragraph recap** of the blocker
and prior diagnoses in the prompt, since we've lost Codex's thread memory.
Continue the loop from there.

### 3. Parse the JSON envelope

Because `/codex-help` always uses `--persist-thread` or `--resume`,
`consult.mjs` emits an envelope:

```json
{
  "thread_id": "thread-abc123",
  "data": {
    "analysis": "one-paragraph reading of the situation",
    "diagnosis": "the key finding",
    "next_steps": [{"action": "imperative", "why": "terse"}],
    "missing_context": ["things to gather first — empty if none"],
    "open_questions": ["things for the user to clarify — empty if none"]
  }
}
```

On round 1, store `THREAD_ID ← envelope.thread_id` for use in round 2+.
On rounds 2+, verify `envelope.thread_id == THREAD_ID` (sanity check).
Work with `envelope.data` as the structured response.

### 4. Present this round to the user

Compact, scannable:

```markdown
**Round R of MAX_ROUNDS — Codex's read:** <analysis>

**Diagnosis:** <diagnosis>

**Next steps:**
1. <action> — <why>
2. <action> — <why>
...

**Codex wants Claude to check first:** (only if missing_context is non-empty)
- <item>

**Codex wants the user to clarify:** (only if open_questions is non-empty)
- <item>
```

If `missing_context` is non-empty, **handle those first** before applying
`next_steps` — gather the missing context (Read the file, run the command),
fold what you learn back into your understanding, then proceed.

If `open_questions` is non-empty and the answers would materially change the
next steps, surface them to the user with `AskUserQuestion` before applying.
Otherwise note them as context but proceed.

### 5. Apply next_steps

Work through them in order using your normal tools: Read, Grep, Bash, Edit,
Write. Each tool call is visible to the user. Destructive operations are
still gated by the existing `careful` / `guard` mechanisms — they don't
get bypassed just because Codex recommended them.

Announce each step as you go: `"Applying step N: <one-line summary>"`.

### 6. Verify

Before deciding whether the problem is resolved, **actively verify** by
re-running whatever originally surfaced the blocker. Examples:

- Failing test → re-run that exact test
- Failing build → re-run the build
- Wrong output → re-run the command that produced it
- Runtime bug → re-trigger the scenario

State the verification command and its result before classifying the outcome.

If there's no reproducible symptom (e.g. the user described a subjective
issue), use `AskUserQuestion`: `"Codex proposed steps — I applied them.
Should I apply blind and ask you to check, or do you have a way to
verify?"`

### 7. Record + decide

Append this round's diagnosis to `PRIOR_DIAGNOSES` for stuck-loop detection.
Append a short one-line entry to `HISTORY_NOTES` for the final summary
(what was applied, how verified, outcome).

Decide the loop state:

- **resolved** → `STATUS = "resolved"`, break out of the loop.
- **still blocked, current diagnosis semantically matches any earlier
  diagnosis in `PRIOR_DIAGNOSES`** → `STATUS = "stuck_loop"`, break.
  Use judgment: exact wording need not match; "same root cause, rephrased"
  counts as repeat.
- **still blocked, new symptom or diagnosis** → continue to round `R+1`.
- **`R == MAX_ROUNDS` and not resolved** → `STATUS = "max_rounds"`, break.

## Final output

After the loop exits, present a compact summary based on `STATUS`:

### STATUS = "resolved"

```markdown
**Codex-help: resolved in round R of MAX_ROUNDS.** ✅

- Round 1 — Codex: <one-line diagnosis>. Applied: <one-line>. Verified: <result>.
- Round 2 — Codex: <one-line diagnosis>. Applied: <one-line>. Verified: <result>. Resolved.
...
```

Return to whatever the user and Claude were doing before the blocker.

### STATUS = "stuck_loop"

```markdown
**Codex-help: stopped early at round R — stuck loop.**

Codex's diagnosis converged on "<repeated diagnosis>" across rounds. This usually means:
- The root cause is outside what Codex can see from our references, OR
- We need hands-on iteration rather than advisory rounds.

Recommendations:
- `/rescue --background <focused problem statement>` — let Codex take over and iterate directly
- Or: gather the context Codex kept asking for and re-invoke `/codex-help` with that
- Or: take a break and come back with fresh eyes
```

### STATUS = "max_rounds"

```markdown
**Codex-help: max rounds reached (R of MAX_ROUNDS). Still blocked.**

Current symptom: <one-line>
Codex's final diagnosis: "<diagnosis from last round>"

Recommendations:
- Invoke `/rescue --background <focused problem>` to let Codex take over hands-on
- Or `/codex-help --rounds N <fresh framing>` with a different angle
- Or break the problem smaller and retry
```

### STATUS = "error" (from exit codes 1/2/3)

Report the actionable stderr, stop. Don't invent next steps.

## Key rules

1. **Codex runs read-only** — `consult.mjs` enforces `sandbox: "read-only"`.
   Codex advises; Claude applies. For write-capable delegation, user wants `/rescue`.
2. **First-person Claude narration.** Do not describe the situation from a
   third-person narrator's perspective. "I'm trying to..." / "What I tried..."
3. **Actively verify every round.** Don't assume resolved. Run the check.
4. **One Codex thread across rounds.** Round 1 uses `--persist-thread`,
   rounds 2+ use `--resume <thread-id>`. Codex keeps its own memory; Claude
   sends deltas, not re-statements. This is what replaces a history block.
5. **Stuck-loop detection on Claude's side.** Compare this round's
   `diagnosis` text against earlier rounds' diagnoses. If it repeats (same
   root cause, rephrased), stop and escalate — don't burn budget on the
   same wrong theory.
6. **Missing-context first, next_steps second.** If Codex says it needs
   something it couldn't see, gather that before applying anything.
7. **One `/codex-help` invocation = one loop, one Codex thread.** Don't
   auto-invoke again after max rounds. User re-invokes (new thread) with
   fresh framing if they want to keep pushing.
8. **User agency preserved.** No per-round approval gating (creates friction),
   but all tool use is visible and `careful` / `guard` still warn on
   destructive operations.
9. **Thread-loss fallback.** If the resumed thread is unavailable (broker
   evicted it, session changed), fall back to a fresh `--persist-thread`
   call and include a one-paragraph recap in the prompt. Don't fail the loop.
