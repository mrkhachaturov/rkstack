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
