---
name: rescue
preamble-tier: 2
version: 1.0.0
description: |
  Delegate a substantial investigation, diagnosis, or implementation task
  to Codex via the codex-rescue subagent. Use when Claude is stuck, wants
  a second implementation pass, needs deeper root-cause investigation, or
  should offload long-running work. Supports background execution, model
  selection, and thread resume.
user-invocable: true
allowed-tools:
  - Agent
  - Bash
  - AskUserQuestion
announce-action: delegate `<task>` to Codex via rescue
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (rescue) ===

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

# Rescue: Delegate To Codex

Hand a task to Codex through the `codex-rescue` subagent. Codex reads or
writes code depending on the task, and the agent returns its output verbatim.

**Announce at start:** "I'm using the rescue skill to delegate `<task>` to Codex via rescue."

## When to use this skill

- You're stuck on a bug and want a second set of eyes that can actually edit.
- The task is long-running or open-ended and would block the main thread.
- You want a cheaper/faster pass with a smaller model (`--model spark`).
- You want to continue a previous Codex rescue thread (`--resume`).

Do **not** use this for small, clearly-bounded tasks the main thread can
finish quickly on its own.

## Parse the user's request

The user invokes `/rescue [flags] <task description>`.

Recognized routing flags (strip from the task text before forwarding):

| Flag | Meaning |
|---|---|
| `--background` | Run in a detached worker; returns a job ID. Use for long or open-ended work. |
| `--wait` | Foreground run; block until Codex finishes. |
| `--resume` | Continue the latest Codex rescue thread for this repo. Appends `--resume-last`. |
| `--fresh` | Start a new Codex thread even if the phrasing sounds like a follow-up. |
| `--model <name>` | Override Codex model. `spark` maps to `gpt-5.3-codex-spark`. |
| `--effort <level>` | Reasoning effort: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`. |

Default: foreground for small/bounded requests, background for open-ended ones,
write-capable (`--write`) unless the user explicitly wants read-only.

## Step 0: Verify Codex is ready

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex/codex-companion.mjs" setup --json
```

If `ready: false`:

- Codex not installed → `"Codex CLI not found. Run `npm install -g @openai/codex`, then `!codex login` to authenticate."`
- Codex installed but not logged in → `"Codex is installed but not authenticated. Run `!codex login` (ChatGPT account or API key)."`

Stop with the appropriate message.

## Step 1: Resolve resume-vs-fresh

If the user passed `--resume` or `--fresh`, honor it.

Otherwise, check for a resumable rescue thread from this Claude session:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex/codex-companion.mjs" task-resume-candidate --json
```

If the helper reports `"available": true`, use `AskUserQuestion` exactly once:

- **Re-ground:** name the repo, the current branch (from preamble `_BRANCH`),
  and the user's task in one sentence.
- **Options:**
  - `Continue current Codex thread` — add `--resume`
  - `Start a new Codex thread` — add `--fresh`
- **Recommendation:** If the user's phrasing is clearly a follow-up
  ("continue", "keep going", "apply the top fix", "dig deeper"), put
  `Continue current Codex thread (Recommended)` first. Otherwise put
  `Start a new Codex thread (Recommended)` first.

If the helper reports `"available": false`, skip the question and proceed.

## Step 2: Dispatch to the codex-rescue subagent

Use the `Agent` tool with `subagent_type: "codex-rescue"`.

Brief the subagent with:

- The user's task text (with routing flags stripped)
- The resolved execution flags (`--background` or `--wait`)
- The resolved resume flag (`--resume` or `--fresh`)
- Any model/effort flags

The subagent makes one Bash call to the companion's `task` subcommand and
returns stdout verbatim. Do not add commentary before or after the
subagent's output.

## Step 3: Apply the codex-result-handling contract

When rendering the subagent's output, follow the `codex-result-handling`
skill rules:

- Preserve verdict, findings, touched files, and next steps exactly.
- Preserve file paths and line numbers verbatim. Format as `path:line` so
  they render as clickable links.
- If Codex failed or was never invoked, report the failure and stop. Do not
  substitute a Claude-side answer.
- If Codex wrote code, say so explicitly and list the touched files.

## Background flow

If `--background` was used (or inferred), the subagent returns a job ID
instead of completed output. Tell the user:

```
Codex rescue started in the background. Job ID: <id>

Check progress:
  node "${CLAUDE_PLUGIN_ROOT}/scripts/codex/codex-companion.mjs" status <id>

Fetch result when done:
  node "${CLAUDE_PLUGIN_ROOT}/scripts/codex/codex-companion.mjs" result <id>

Cancel if needed:
  node "${CLAUDE_PLUGIN_ROOT}/scripts/codex/codex-companion.mjs" cancel <id>
```

The session-lifecycle hook will clean up orphaned jobs at session end.

## Error handling

| Error | Action |
|---|---|
| Setup check reports not ready | Stop with install / `!codex login` message |
| Subagent returns empty stdout | Report that Codex invocation failed, stop |
| User passed both `--resume` and `--fresh` | Ask which one they meant via AskUserQuestion |
| User passed no task text | Ask what Codex should investigate or fix |

## Key rules

1. **One `task` invocation per rescue.** The subagent is not an orchestrator.
2. **Preserve task text.** Strip routing flags, do not rewrite the intent.
3. **Return stdout verbatim.** The subagent does not summarize. You apply
   the codex-result-handling contract only for formatting, not paraphrasing.
4. **Never substitute a Claude answer** when Codex was not successfully invoked.
5. **Default to write-capable** unless user says read-only.
