# TODOs

Structured roadmap. Items are ordered by priority within each section.
Mark completed items with `[x]` and the version/date.

## Infrastructure

- [ ] **rkstack-detect** — scc wrapper subcommand for the rkstack binary. Currently inline in the preamble bash block; a dedicated subcommand would be faster and testable.
- [ ] **Codex/Gemini host support** — gen-skill-docs `--host codex` should transform frontmatter (strip to name+description), replace paths, inject hook safety prose. Follow gstack's `codex-helpers.ts` pattern.
- [x] **CI freshness check** — GitHub Action that runs `just check && just skill-check` on PRs. **Completed:** v0.2.0 (2026-03-27), check.yml workflow
- [ ] **Debounce dev-skill.ts** — `fs.watch` fires multiple events per save on macOS. Add 200ms debounce to avoid duplicate regeneration.

## Skills

- [ ] **Enrich systematic-debugging AskUserQuestion examples** — current examples skip re-ground/simplify steps. Should follow the full T2 format the preamble injects.
- [ ] **Add opt-out for proactive suggestions** — gstack has `PROACTIVE` config flag. Add equivalent to using-rkstack so users can disable auto-suggestion.
- [ ] **dual-review sandbox testing** — verify `codex exec -s read-only` works reliably across project types. Document workarounds if sandbox blocks source file reads.
- [ ] **dual-review for code diffs** — extend dual-review to run Codex on diffs after execution (currently specs/plans only). Use `codex review --base <branch>` with plan context.
- [ ] **Smart plan decomposition** — writing-plans should assess when to split specs into A/B/C plans based on real implementation dependencies, not just size.
- [ ] **Plan ID in commits** — executing-plans and subagent-driven should include plan ID in conventional commit format so diff review can auto-discover the plan.
- [ ] **benchmark skill** — performance regression detection. Port from gstack when needed.
- [ ] **office-hours skill** — brainstorming variant focused on product/startup diagnostic. Port from gstack when needed.

## Documentation

- [x] **README.md enrichment** — architecture diagram, full skill table, dual-review mermaid diagram, getting-started guide. **Completed:** v0.4.0 (2026-03-28)

## Completed

- [x] **rkstack CLI binary** — compiled Bun binary with version, slug, config, repo-mode subcommands. Preamble bootstrap auto-downloads on Claude Code. CI builds for 4 platforms. **Completed:** v0.5.0 (2026-03-28)
- [x] **Cross-skill wiring** — humanizer referenced by 5 prose-producing skills, verification wired to execution skills, TDD named in executing-plans, requesting-code-review chains to finishing-branch. **Completed:** v0.3.2 (2026-03-28)
- [x] **dual-review skill** — sequential Claude-Codex review loop for specs and plans. Embedded in brainstorming and writing-plans, also standalone. **Completed:** v0.4.0 (2026-03-28)
- [x] **Worktree locale fix** — force LANG=C in git helper for non-English systems. **Completed:** v0.3.2 (2026-03-28)
- [x] **ETHOS.md principle #6** — Trust, Then Verify With a Second Mind. **Completed:** v0.4.0 (2026-03-28)

## Tech Debt

- [ ] **check-freeze.sh path normalization** — doesn't resolve `..` or symlinks. `realpath` would close this gap.
- [ ] **check-careful.sh grep/Python inconsistency** — grep truncates on escaped quotes, Python fallback handles it. Document or unify.
- [ ] **build:all in package.json** — runs 3 hosts but writes to same output paths. Fix when multi-host support is real.
- [ ] **Consolidate code-reviewer definitions** — `agents/code-reviewer.md` and `skills/requesting-code-review/code-reviewer.md` overlap. Clarify roles or deduplicate.
