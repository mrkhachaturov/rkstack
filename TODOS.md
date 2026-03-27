# TODOs

Structured roadmap. Items are ordered by priority within each section.
Mark completed items with `[x]` and the version/date.

## Infrastructure

- [ ] **bin/ utilities** — rkstack-detect (scc wrapper), rkstack-repo-mode (solo/collaborative), rkstack-config (user preferences). Currently these are inline in the preamble bash block; dedicated binaries would be faster and testable.
- [ ] **Codex/Gemini host support** — gen-skill-docs `--host codex` should transform frontmatter (strip to name+description), replace paths, inject hook safety prose. Follow gstack's `codex-helpers.ts` pattern.
- [ ] **CI freshness check** — GitHub Action that runs `just check && just skill-check` on PRs. Prevents stale generated files from being merged.
- [ ] **Debounce dev-skill.ts** — `fs.watch` fires multiple events per save on macOS. Add 200ms debounce to avoid duplicate regeneration.

## Skills

- [ ] **Enrich systematic-debugging AskUserQuestion examples** — current examples skip re-ground/simplify steps. Should follow the full T2 format the preamble injects.
- [ ] **Add opt-out for proactive suggestions** — gstack has `PROACTIVE` config flag. Add equivalent to using-rkstack so users can disable auto-suggestion.
- [ ] **benchmark skill** — performance regression detection. Port from gstack when needed.
- [ ] **office-hours skill** — brainstorming variant focused on product/startup diagnostic. Port from gstack when needed.

## Documentation

- [ ] **README.md enrichment** — current README is functional but minimal. Add architecture diagram, full skill table, and getting-started guide.

## Tech Debt

- [ ] **check-freeze.sh path normalization** — doesn't resolve `..` or symlinks. `realpath` would close this gap.
- [ ] **check-careful.sh grep/Python inconsistency** — grep truncates on escaped quotes, Python fallback handles it. Document or unify.
- [ ] **build:all in package.json** — runs 3 hosts but writes to same output paths. Fix when multi-host support is real.
- [ ] **Consolidate code-reviewer definitions** — `agents/code-reviewer.md` and `skills/requesting-code-review/code-reviewer.md` overlap. Clarify roles or deduplicate.
