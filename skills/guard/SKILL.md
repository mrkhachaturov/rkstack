---
name: guard
preamble-tier: 1
version: 0.1.0
description: |
  Full safety mode: destructive command warnings + directory-scoped edits.
  Combines /careful (warns before rm -rf, DROP TABLE, force-push, etc.) with
  /freeze (blocks edits outside a specified directory). Use for maximum safety
  when touching prod or debugging live systems. Use when asked to "guard mode",
  "full safety", "lock it down", or "maximum safety".
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../careful/bin/check-careful.sh"
          statusMessage: "Checking for destructive commands..."
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (guard) ===

# Project detection via scc (respects .gitignore, also skip 3rdparty-src)
_TOP_LANGS=$(scc --format wide --no-cocomo --exclude-dir 3rdparty-src . 2>/dev/null | head -8 || echo "scc not available")
echo "STACK:"
echo "$_TOP_LANGS"

# Framework hints
_HAS_PACKAGE_JSON=$([ -f package.json ] && echo "yes" || echo "no")
_HAS_CARGO_TOML=$([ -f Cargo.toml ] && echo "yes" || echo "no")
_HAS_GO_MOD=$([ -f go.mod ] && echo "yes" || echo "no")
_HAS_PYPROJECT=$([ -f pyproject.toml ] && echo "yes" || echo "no")
_HAS_DOCKERFILE=$([ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TERRAFORM=$(find . -maxdepth 2 -name "*.tf" -print -quit 2>/dev/null | grep -q . && echo "yes" || echo "no")
_HAS_ANSIBLE=$([ -d ansible ] || [ -f ansible.cfg ] && echo "yes" || echo "no")
_HAS_COMPOSE=$([ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ] || [ -f compose.yaml ] && echo "yes" || echo "no")
_HAS_JUSTFILE=$([ -f justfile ] || [ -f Justfile ] && echo "yes" || echo "no")
_HAS_MISE=$([ -f .mise.toml ] || [ -f mise.toml ] && echo "yes" || echo "no")
echo "FRAMEWORKS: pkg=$_HAS_PACKAGE_JSON cargo=$_HAS_CARGO_TOML go=$_HAS_GO_MOD py=$_HAS_PYPROJECT docker=$_HAS_DOCKERFILE tf=$_HAS_TERRAFORM ansible=$_HAS_ANSIBLE compose=$_HAS_COMPOSE just=$_HAS_JUSTFILE mise=$_HAS_MISE"

# Repo mode (solo vs collaborative)
_AUTHOR_COUNT=$(git shortlog -sn --no-merges --since="90 days ago" 2>/dev/null | wc -l | tr -d ' ')
_REPO_MODE=$([ "$_AUTHOR_COUNT" -le 1 ] && echo "solo" || echo "collaborative")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "REPO_MODE: $_REPO_MODE"
echo "BRANCH: $_BRANCH"

# Project config
_HAS_CLAUDE_MD=$([ -f CLAUDE.md ] && echo "yes" || echo "no")
echo "CLAUDE_MD: $_HAS_CLAUDE_MD"
```

Use the preamble output to adapt your behavior:
- **TypeScript/JavaScript + package.json** — web/fullstack project. Check for React/Vue/Svelte patterns.
- **Python + pyproject.toml** — backend/ML. Check PEP8 conventions.
- **Rust + Cargo.toml** — systems. Check ownership patterns.
- **Go + go.mod** — backend/infra. Check error handling patterns.
- **Dockerfile + Terraform** — infrastructure. Extra caution with state, plan before apply.
- **Ansible** — configuration management. Check inventory structure, role conventions, vault usage.
- **Docker Compose** — multi-container app. Check service dependencies, .env patterns, volume mounts.
- **justfile** — task runner present. Use `just` commands instead of raw shell where available.
- **mise** — tool version manager. Versions are pinned — don't suggest global installs.
- **CLAUDE.md exists** — read it for project-specific commands and conventions.

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

# /guard — Full Safety Mode

Activates both destructive command warnings and directory-scoped edit restrictions.
This is the combination of `/careful` + `/freeze` in a single command.

**Dependency note:** This skill references hook scripts from the sibling `/careful`
and `/freeze` skill directories. Both must be installed (they are part of the
rkstack plugin).

## Setup

Ask the user which directory to restrict edits to. Use AskUserQuestion:

- Question: "Guard mode: which directory should edits be restricted to? Destructive command warnings are always on. Files outside the chosen path will be blocked from editing."
- Text input (not multiple choice) — the user types a path.

Once the user provides a directory path:

1. Resolve it to an absolute path:
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. Ensure trailing slash and save to the freeze state file:
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.rkstack}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "Freeze boundary set: $FREEZE_DIR"
```

Tell the user:
- "**Guard mode active.** Two protections are now running:"
- "1. **Destructive command warnings** — rm -rf, DROP TABLE, force-push, etc. will warn before executing (you can override)"
- "2. **Edit boundary** — file edits restricted to `<path>/`. Edits outside this directory are blocked."
- "To remove the edit boundary, run `/unfreeze`. To deactivate everything, end the session."

## What's protected

See `/careful` for the full list of destructive command patterns and safe exceptions.
See `/freeze` for how edit boundary enforcement works.
