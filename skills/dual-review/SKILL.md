---
name: dual-review
preamble-tier: 2
version: 1.0.0
description: |
  Sequential Claude-Codex review loop for specs and plans. Embedded in
  brainstorming and writing-plans for automatic Codex review after self-review.
  Also user-invocable for manual ad-hoc review. Max 3 rounds default, early exit
  if clean.
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Edit
  - AskUserQuestion
announce-action: run a Codex review loop on `<path>`
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (dual-review) ===

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

# Dual-Review: Sequential Claude-Codex Review Loop

You are reviewing a spec or plan with Codex as a second opinion. This skill runs in two modes:

1. **Embedded** — called automatically by brainstorming (after self-review) and writing-plans (after self-review)
2. **Standalone** — user invokes `/dual-review path/to/artifact.md [--rounds N]`

Both modes use the same mechanism: sequential loops where Codex reviews, Claude evaluates findings, and fixes valid ones until Codex returns clean or max rounds are reached.

**Announce at start:** "I'm using the dual-review skill to run a Codex review loop on `<path>`."

**Core principle:** Source code informs context, not intent. Proposed changes in a spec or plan are not defects just because current code does not implement them. Codex should flag conflicts with existing contracts, circular dependencies, or missed documented constraints — not "this doesn't exist yet."

---

## Step 0: Validate Codex CLI

```bash
command -v codex >/dev/null 2>&1 && echo "codex: available" || echo "codex: NOT FOUND"
```

If Codex is not installed, stop with:
> "Codex CLI not found. Install: `npm install -g @openai/codex`. Then run `codex login` to authenticate."

---

## Standalone Mode: Parse Arguments

When user invokes `/dual-review path/to/file.md [--rounds N]`:

1. **File path** — required (first positional argument). Verify it exists.
2. **--rounds N** — optional, default 3.
3. **Determine artifact type** by reading the first 50 lines:
   - Contains `## Problem` and `## Solution` → **spec**
   - Contains `**Spec:**` and `**Goal:**` and task checkboxes (`- [ ]`) → **plan**
   - If ambiguous: ask user "Is this a spec or a plan?"
4. **For plans:** must have `**Spec:** filename.md` in the header. If missing, stop with:
   > "Plan must link its spec in the header. Add: `**Spec:** path/to/spec.md`"
   Resolve spec path relative to the plan's directory. Verify spec file exists.

---

## The Review Loop

Run this loop for both embedded and standalone modes.

**Inputs:**
- `ARTIFACT_PATH` — the spec or plan file
- `ARTIFACT_TYPE` — "spec" or "plan"
- `MAX_ROUNDS` — default 3
- For plans: `SPEC_PATH` — the linked spec file

### Round N (repeat up to MAX_ROUNDS):

**1. Read the document**

Read `ARTIFACT_PATH` fully.

**2. Build the Codex prompt**

Codex runs with `-C <repo-root> -s read-only` and can read all project files. Tell it to read the files itself instead of pasting their contents.

Read the appropriate prompt template for review criteria:
- For specs: `skills/dual-review/spec-review-prompt.md`
- For plans: `skills/dual-review/plan-review-prompt.md`

For specs, construct this prompt:
"Read and review the spec at `<ARTIFACT_PATH>`. Also read CLAUDE.md for project conventions and the first 50 lines of README.md for context. Read any source files the spec references.

<review criteria from spec-review-prompt.md>"

For plans, construct this prompt:
"Read and review the plan at `<ARTIFACT_PATH>`. Also read the linked spec at `<SPEC_PATH>`. Read CLAUDE.md for project conventions. Read any source files the plan references.

<review criteria from plan-review-prompt.md>"

**3. Call Codex**

The prompt is short — no temp file needed:

```bash
STDERR_FILE=$(mktemp /tmp/dual-review-err-XXXXXX.txt)
codex exec "<assembled prompt>" \
  -C "$(git rev-parse --show-toplevel)" \
  -s read-only \
  -c 'model_reasoning_effort="medium"' \
  2>"$STDERR_FILE"
```

Use `timeout: 300000` on the Bash tool call. Codex reads the actual files from disk.

After the call, read stderr:

```bash
cat "$STDERR_FILE" 2>/dev/null; rm -f "$STDERR_FILE"
```

**Error handling:**
- Exit code non-zero + stderr contains "auth" or "token" → "Codex authentication failed. Run `codex login` to authenticate."
- Bash timeout (5 min) → "Codex timed out. The document or context may be too large. Try `/dual-review <path> --rounds 1` with a smaller scope."
- Empty stdout → treat as zero findings (clean)
- Malformed output (only stderr, no structured findings) → report stderr and suggest re-running

**5. Parse findings**

Extract each finding from Codex stdout. Each finding should have:
- A category or title
- The document section it references
- The specific problem
- Severity (High/Medium/Low)

If Codex output doesn't follow the structured format exactly, treat the entire response as findings text and extract individual issues by paragraph or numbered item.

**6. Evaluate each finding**

For each finding, read the document section Codex references. If Codex cites source code, read that too. Then classify:

- **Valid** — The spec/plan has a genuine gap, missing edge case, internal contradiction, or conflicts with an existing documented constraint. **Fix it** by editing the document.
- **Rejected** — The proposed behavior is intentional. The spec reasoning supports it, or the spec deliberately proposes something different from current code. **Skip** with a one-line explanation.
- **Unclear** — Needs human judgment. **Surface to user** with the finding and your analysis.

**7. Fix valid findings**

Edit the document file directly to address each valid finding.

**8. Loop decision**

- If you made fixes AND rounds < MAX_ROUNDS → next round (go to step 1)
- If Codex returned zero findings → exit clean
- If rounds >= MAX_ROUNDS → exit with summary

---

## Output Format

After all rounds complete, output:

```
DUAL-REVIEW: <artifact_path>
Rounds: N of M [early exit — clean | max rounds reached]

ROUND 1:
  Codex review: K findings
  → X valid (fixed)
  → Y rejected: [one-line reason per rejection]
  → Z unclear: [surfaced to user]

ROUND 2:
  Codex review: J findings
  → ...

RESULT: total findings, fixed, rejected, unclear
```

If there are **unclear** findings, present them to the user with an AskUserQuestion before reporting the final result. Include your analysis of each unclear finding and a recommendation.

---

## Error Handling

| Error | Action |
|-------|--------|
| Codex not installed | Stop with install instructions |
| Codex auth failed | "Run `codex login` to authenticate" |
| Codex timeout (5 min) | Report and suggest smaller scope |
| Codex malformed output | Report stderr, suggest re-run |
| Missing CLAUDE.md | Continue without it |
| Missing README.md | Continue without it |
| Source file not found | Skip from context |
| Spec file not found (plan mode) | Stop — plan must link a valid spec |
| Zero findings from Codex | Exit clean immediately |

---

## Key Rules

1. **Source code informs context, not intent** — Proposed changes are not defects just because current code doesn't implement them
2. **Sequential, never parallel** — Review → evaluate → fix → re-review. One round at a time.
3. **Evaluate before accepting** — Read referenced document sections and source code before classifying findings
4. **Early exit on clean** — If Codex returns zero findings, done
5. **Max 3 rounds default** — Prevents infinite loops; user can override with `--rounds N`
6. **Fix the document, not the code** — Dual-review edits specs and plans, never source code
