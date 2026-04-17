---
name: codex-result-handling
preamble-tier: 4
version: 1.0.0
description: |
  Internal contract for presenting Codex output back to the user.
  Referenced by dual-review (structured findings) and rescue (task output).
  Not user-invocable.
user-invocable: false
allowed-tools:
  - Read
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (codex-result-handling) ===

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

# Codex Result Handling

Use this contract when returning output produced by
`${CLAUDE_PLUGIN_ROOT}/scripts/codex/codex-companion.mjs` or
`${CLAUDE_PLUGIN_ROOT}/scripts/codex/review-doc.mjs`.

## Rules

- Preserve the companion's verdict, summary, findings, and next-steps structure.
- For review output, present findings first and order them by severity
  (`critical` → `high` → `medium` → `low`).
- Use file paths and line numbers exactly as the companion reports them.
  Format as `path/to/file.ts:42-51` so they render as clickable links.
- Preserve evidence boundaries. If Codex marked a claim as an inference,
  uncertainty, or open question, keep that distinction — do not harden it
  into a definitive statement.
- Preserve output sections when the prompt asked for them: observed facts,
  inferences, open questions, touched files, next steps.
- If there are no findings, say that explicitly and keep any residual-risk
  note brief. Do not invent findings to fill space.
- If Codex made edits (task mode with `--write`), state that explicitly and
  list the touched files when the companion provides them.

## Never do this

- **Never turn a failed or incomplete Codex run into a Claude-side
  implementation attempt.** Report the failure, stop, and let the user decide.
- **Never generate a substitute answer** when Codex was never successfully
  invoked (missing binary, auth failure, broker crash).
- **Never auto-apply fixes from a review.** After presenting findings, STOP.
  You MUST explicitly ask the user which issues (if any) they want fixed
  before touching a single file. Auto-applying review fixes is strictly
  forbidden, even if the fix is obvious.
- **Never invent file paths or line numbers** not present in the companion
  output. If the companion gave a location, use it verbatim; if it did not,
  say so rather than guessing.

## Error surfaces

- If the companion reports malformed output or a failed Codex run, include
  the most actionable stderr lines and stop there instead of guessing.
- If the companion reports that setup or authentication is required, direct
  the user to run `!codex login` or to install Codex — do not improvise
  alternate auth flows.
- If the companion reports a timeout, say so and suggest `--background` or
  a smaller scope.
