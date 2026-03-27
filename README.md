# RKstack

AI development workflow for Claude Code, Codex, and Gemini.

One plugin. Install once. Adapts to your project.

## Install

**Claude Code:**
```bash
/plugin install rkstack@ccode-personal-plugins
```

**Codex:**
```bash
git clone https://github.com/mrkhachaturov/rkstack.git ~/.codex/rkstack
ln -s ~/.codex/rkstack/skills ~/.agents/skills/rkstack
```

## What it does

- **Brainstorming** — explore the problem before writing code
- **Planning** — design the solution with architecture review
- **TDD** — red-green-refactor, always
- **Debugging** — systematic root-cause investigation
- **Code review** — review with checklists
- **Verification** — verify before claiming done
- **Safety guardrails** — hooks prevent destructive operations

Skills detect your project type (via scc) and adapt behavior automatically.

## License

MIT. Upstream skills retain their original licenses — see THIRD_PARTY_NOTICES.md.
