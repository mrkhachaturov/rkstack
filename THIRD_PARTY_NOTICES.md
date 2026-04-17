# Third Party Notices

This project incorporates material from the following sources:

## superpowers
- **Source:** https://github.com/obra/superpowers
- **License:** MIT
- **Version tracked:** v5.0.6
- **Skills derived from:** brainstorming, writing-plans, executing-plans, test-driven-development, systematic-debugging, verification-before-completion, finishing-a-development-branch, using-git-worktrees, dispatching-parallel-agents

## gstack
- **Source:** https://github.com/garrytan/gstack
- **License:** MIT
- **Version tracked:** v0.11.17.0
- **Skills derived from:** /review, /qa, /cso, /ship, /investigate, /retro, /land-and-deploy, /canary, /browse, /plan-eng-review, /plan-ceo-review, /design-review

## Anthropic Skills
- **Source:** https://github.com/anthropics/skills
- **License:** Apache 2.0 (example skills), Source-available (document skills)
- **Skills referenced:** webapp-testing, frontend-design, skill-creator

## codex-plugin-cc (OpenAI)
- **Source:** https://github.com/openai/codex-plugin-cc
- **License:** Apache 2.0
- **Version tracked:** 6a5c2ba53b734f3cdd8daacbd49f68f3e6c8c167
- **Vendored runtime at:** `scripts/codex/` (companion + lib, schemas, session hooks — unmodified). `LICENSE` and `NOTICE` preserved alongside the code.
- **Skills derived from:** codex-cli-runtime, codex-result-handling, gpt-5-4-prompting (internal), rescue (user-facing wrapper), codex-rescue subagent. Dual-review's spec/plan prompt structure is adapted from upstream `prompts/adversarial-review.md`; `schemas/review-output.schema.json` is vendored verbatim at `skills/dual-review/review-schema.json`.
