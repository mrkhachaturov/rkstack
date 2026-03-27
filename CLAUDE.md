# RKstack

## What This Repo Is

RKstack is a single Claude Code plugin containing AI development workflow skills.
It is NOT a collection of packs — it's one plugin that adapts to the project it's
installed in.

Skills are inspired by superpowers and gstack upstreams, but authored independently
using templates, preamble injection, and safety hooks.

## Core Principle

**Root of this repo IS the plugin.** There is no build output directory, no packs,
no intermediate step. Claude Code reads skills/ directly.

- `.upstreams/` = read-only upstream references (for studying diffs, not copying)
- `skills/` = the skills Claude Code loads
- `agents/` = agent definitions
- `hooks/` = SessionStart + PreToolUse guards
- `bin/` = CLI utilities (project detection, config)
- `scripts/` = build tooling (gen-skill-docs)

## Skill Authoring

Skills use templates:

```
skills/{name}/SKILL.md.tmpl   ← human-authored template with {{PLACEHOLDERS}}
scripts/gen-skill-docs         ← reads .tmpl, resolves placeholders
skills/{name}/SKILL.md         ← generated, committed to git
```

Companion files (prompts, reference docs) are NOT templated — they're hand-authored.

### Placeholders

| Placeholder | What it injects |
|-------------|----------------|
| `{{PREAMBLE}}` | Bash block: scc detection, repo-mode, branch, config |
| `{{ASK_FORMAT}}` | AskUserQuestion format: re-ground, simplify, recommend, options |
| `{{ESCALATION}}` | Escalation protocol: 3 attempts → BLOCKED status |
| `{{COMPLETENESS}}` | Completeness framing: score 1-10, effort comparison |

### Rules for writing skills

- Natural language for logic, bash for execution
- Each bash block runs in a separate shell — pass state through prose
- Numbered decision steps, not nested if/else
- One decision per AskUserQuestion
- Never hardcode framework commands — read from CLAUDE.md or ask the user
- Completeness framing: always prefer full implementation

## Commands

```bash
just build       # generate all SKILL.md from templates
just check       # verify generated files are up to date
just detect      # run scc on current directory
just setup       # install tools via mise
```

## How Claude Code Should Work Here

1. Read the relevant SKILL.md.tmpl and companion files
2. Edit the template, not the generated SKILL.md
3. Run `just build` to regenerate
4. Commit both .tmpl and generated .md

### Never do this

- Do not edit generated SKILL.md files directly
- Do not copy from .upstreams/ — study and write your own
- Do not hardcode project-specific commands in skills
- Do not hand-edit .upstreams/

### Preferred workflow

- For skill changes: edit `skills/{name}/SKILL.md.tmpl`
- For shared sections: edit placeholder logic in `scripts/gen-skill-docs`
- For safety rules: edit `hooks/guard/`
- For project detection: edit `bin/rkstack-detect`

## Repository Structure

```text
rkstack/
├── .claude-plugin/plugin.json    # plugin manifest
├── hooks/                        # SessionStart + PreToolUse
│   ├── hooks.json
│   ├── session-start
│   └── guard/
├── skills/                       # all skills
│   ├── using-rkstack/
│   ├── brainstorming/
│   ├── writing-plans/
│   └── ...
├── agents/                       # agent definitions
├── bin/                          # CLI utilities
├── scripts/                      # gen-skill-docs
├── .upstreams/                   # reference only
│   ├── superpowers/
│   └── gstack/
├── docs/
├── justfile
└── .mise.toml
```

## Upstreams

`.upstreams/` are git submodules kept for reference:

- Studying what changed between versions
- Comparing our approach vs upstream approach
- Borrowing patterns (not files)

Do not copy from upstreams. Study and write your own.

## Current Priority

Building the skill system from scratch using gstack patterns:

1. Template system with gen-skill-docs
2. Preamble with scc project detection
3. PreToolUse safety hooks
4. Skills adapted from superpowers content
