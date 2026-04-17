---
name: gpt-5-4-prompting
preamble-tier: 4
version: 1.0.0
description: |
  Internal guidance for composing Codex / GPT-5.4 prompts used by rescue
  and dual-review. Covers XML block structure, grounding, output contracts,
  verification loops. Not user-invocable.
user-invocable: false
allowed-tools:
  - Read
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (gpt-5-4-prompting) ===

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

# GPT-5.4 Prompting

Use this skill when `codex-rescue` or `dual-review` needs to compose a
Codex prompt for coding, review, diagnosis, or research tasks.

Prompt Codex like an operator, not a collaborator. Keep prompts compact and
block-structured with XML tags. State the task, the output contract, the
follow-through defaults, and the small set of extra constraints that matter.

## Core rules

- Prefer one clear task per Codex run. Split unrelated asks into separate runs.
- Tell Codex what *done* looks like. Do not assume it will infer the desired
  end state.
- Add explicit grounding and verification rules for any task where unsupported
  guesses would hurt quality.
- Prefer better prompt contracts over raising reasoning effort or adding long
  natural-language explanations.
- Use XML tags consistently so the prompt has stable internal structure.

## Default prompt recipe

- `<task>`: the concrete job and the relevant repository or failure context.
- `<structured_output_contract>` or `<compact_output_contract>`: exact shape,
  ordering, and brevity requirements.
- `<default_follow_through_policy>`: what Codex should do by default instead
  of asking routine clarifying questions.
- `<verification_loop>` or `<completeness_contract>`: required for debugging,
  implementation, or risky fixes.
- `<grounding_rules>` or `<citation_rules>`: required for review, research,
  or anything that could drift into unsupported claims.

## When to add blocks

- **Coding or debugging:** add `completeness_contract`, `verification_loop`,
  `missing_context_gating`.
- **Review or adversarial review:** add `grounding_rules`,
  `structured_output_contract`, `dig_deeper_nudge`.
- **Research or recommendation:** add `research_mode` and `citation_rules`.
- **Write-capable task:** add `action_safety` so Codex stays narrow and
  avoids unrelated refactors.

## How to choose prompt shape

- Use the vendored `review` or `adversarial-review` companion subcommands
  when reviewing local git changes. Those prompts already carry the review
  contract and should not be rewritten.
- Use `task` when the work is diagnosis, planning, research, or implementation
  and you need to control the prompt directly.
- Use `task --resume-last` for follow-up instructions on the same Codex thread.
  Send only the *delta* instruction instead of restating the whole prompt,
  unless the direction changed materially.

## Working rules

- Prefer explicit prompt contracts over vague nudges.
- Use stable XML tag names that match the block names from the reference file.
- Do not raise reasoning or complexity first. Tighten the prompt and
  verification rules before escalating effort.
- Ask Codex for brief, outcome-based progress updates only when the task is
  long-running or tool-heavy.
- Keep claims anchored to observed evidence. If something is a hypothesis,
  say so.

## Prompt assembly checklist

1. Define the exact task and scope in `<task>`.
2. Choose the smallest output contract that still makes the answer easy to use.
3. Decide whether Codex should keep going by default or stop for missing
   high-risk details.
4. Add verification, grounding, and safety tags only where the task needs them.
5. Remove redundant instructions before sending the prompt.

## References

- Reusable blocks: [references/prompt-blocks.md](references/prompt-blocks.md)
- End-to-end templates: [references/codex-prompt-recipes.md](references/codex-prompt-recipes.md)
- Common failure modes: [references/codex-prompt-antipatterns.md](references/codex-prompt-antipatterns.md)

## Provenance

Adapted from openai/codex-plugin-cc skill `gpt-5-4-prompting` (Apache 2.0).
References are vendored verbatim. See `scripts/codex/LICENSE`.
