---
name: setup-project
preamble-tier: 2
version: 1.0.0
description: |
  Configure project-level safety guards and working rules. Reads the detection
  cache from .rkstack/settings.json, installs .claude/settings.json hooks,
  .claude/hooks/ scripts, and .claude/rules/ files. Guards protect against
  destructive commands (rm -rf, force-push, drop table). Rules are curated
  best-practice documents copied as-is from templates.
  Run once per project, update when rkstack ships new templates.
  Use when asked to "setup project", "configure guards", "protect this project",
  or "add safety hooks".
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (setup-project) ===

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
- **TypeScript/JavaScript** — see `detection.projectType` (web or node). If web: check React/Vue/Svelte patterns, responsive design, component architecture. If node: CLI tools, MCP servers, backend scripts.
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
- Read `detection.langs` for project scale (files, lines of code, complexity per language).
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

# /setup-project — Project-Level Safety Configuration

Configure this project with always-on safety guards and stack-specific working rules.

## User-invocable
When the user types `/setup-project`, run this skill.

## Arguments
- `/setup-project` — full setup (guards + rules)
- `/setup-project --update` — update existing setup with new templates

## Step 0: Read detection cache

Read the detection cache written by `rkstack detect` (called automatically during session-start):

```bash
if [ -f .rkstack/settings.json ]; then
  cat .rkstack/settings.json
else
  echo "MISSING: .rkstack/settings.json — detection cache not found"
fi
```

If `.rkstack/settings.json` does not exist, tell the user: "Detection cache not found. Please start a new session so rkstack can detect your project stack, then run `/setup-project` again." and stop.

Parse the detection cache JSON. The relevant fields are:
- `detection.langs` — map of language keys (e.g., `ts`, `py`, `go`, `hcl`) to stats
- `detection.tools` — map of tool names (e.g., `docker`, `terraform`, `ansible`, `compose`) to booleans
- `detection.projectType` — high-level classification (web, node, python, go, infra, devops, general)

Also check the existing project setup state:

```bash
ls .claude/settings.json 2>/dev/null && echo "HAS_SETTINGS=yes" || echo "HAS_SETTINGS=no"
ls .claude/hooks/ 2>/dev/null && echo "HAS_HOOKS=yes" || echo "HAS_HOOKS=no"
ls .claude/rules/ 2>/dev/null && echo "HAS_RULES=yes" || echo "HAS_RULES=no"
```

If this is an `--update` run and `.rkstack/settings.json` has a `meta.setupVersion` that matches the current rkstack version, tell the user: "Project is already up to date with rkstack vX.Y.Z. No new templates to install." and stop.

## Step 1: Install baseline guard (always)

The baseline guard protects against destructive commands on every session. This is always installed.

1. Create `.claude/hooks/` directory:
```bash
mkdir -p .claude/hooks
```

2. Read the baseline guard template from the skill directory. The template is at:
   `skills/setup-project/templates/guards/baseline.json`
   Use the Read tool to get it. If you can't read from the plugin directory, the guard script content is embedded in this skill (see Step 1.1 below).

3. Copy `guard-destructive.sh` to the project:
   Read `skills/setup-project/templates/scripts/guard-destructive.sh` from the plugin.
   Write it to `.claude/hooks/guard-destructive.sh`.
   Make it executable: `chmod +x .claude/hooks/guard-destructive.sh`

   **If the file already exists:** Compare contents. If identical, skip. If different, use AskUserQuestion:
   > **Re-ground:** Setting up project safety in `<project>` on branch `<branch>`.
   > **Simplify:** You already have a guard-destructive.sh file but it's different from the latest template. You may have customized it.
   > **RECOMMENDATION:** Choose A to keep your version. Completeness: 9/10.
   > A) Keep my customized version
   > B) Replace with latest template
   > C) Show me the diff first

4. Merge the hook entry into `.claude/settings.json`:

   Read `.claude/settings.json` if it exists. If it doesn't, start with `{}`.

   **Merge algorithm:**
   - If no `hooks` key: add `"hooks": { "PreToolUse": [<baseline entry>] }`
   - If `hooks.PreToolUse` exists: check if any entry already has `command` containing `guard-destructive.sh`. If yes, skip (dedupe). If no, append the baseline entry to the array.
   - Preserve all existing keys (permissions, other hooks, etc.)

   Write the merged JSON back to `.claude/settings.json`.

## Step 2: Offer stack-specific guards

Using the detection cache from Step 0, determine which guard templates are relevant:

| Template | Condition (from detection cache) |
|----------|-----------|
| terraform | `detection.tools.terraform` is true OR `hcl` in `detection.langs` |
| secrets | `.env` files or `secrets/` directory exists (check filesystem) |
| docker | `detection.tools.docker` is true OR `detection.tools.compose` is true |
| kubernetes | files matching `*.yaml` with `kind:` content exist (check filesystem) |
| python | `py` in `detection.langs` |
| node | `ts` in `detection.langs` OR `js` in `detection.langs` |
| ansible | `detection.tools.ansible` is true |

For the filesystem checks (secrets, kubernetes), run:

```bash
# Secrets check
(ls .env* 2>/dev/null || ls secrets/ 2>/dev/null) && echo "SECRETS_DETECTED=yes" || echo "SECRETS_DETECTED=no"
# Kubernetes check
grep -rl '^kind:' *.yaml **/*.yaml 2>/dev/null && echo "K8S_DETECTED=yes" || echo "K8S_DETECTED=no"
```

For each detected template, read its JSON from `skills/setup-project/templates/guards/<name>.json` to get the description.

Present via AskUserQuestion (multi-select):

> **Re-ground:** Setting up project safety in `<project>` on branch `<branch>`. Baseline destructive command guard is installed.
> **Simplify:** I detected your project uses [detected stacks]. I have additional guards for each. Pick which ones to install — they'll warn before dangerous operations specific to each tool.
> **RECOMMENDATION:** Install all detected guards. They use "ask" mode — you can always override.
>
> [List each detected template with its description from the JSON]
> Select which to install (multiple allowed).

For each selected guard:
1. Read the guard JSON to get the hook entries and script name
2. Copy the script to `.claude/hooks/` (same overwrite logic as baseline)
3. Merge the hook entries into `.claude/settings.json` (same dedupe logic)
4. If the guard has `permissions` (like node.json has deny rules), merge those too

## Step 3: Install baseline rule

Copy `context-hygiene.md` to `.claude/rules/`:

1. `mkdir -p .claude/rules`
2. Read `skills/setup-project/templates/rules/context-hygiene.tmpl` from the plugin
3. Write to `.claude/rules/context-hygiene.md` (the .tmpl is already final markdown for this one — no generation needed)

**If file exists:** same overwrite logic as guard scripts (compare, ask if different).

## Step 4: Install stack-specific rules

Copy each matched rule template to `.claude/rules/<stack>.md`. The templates are complete best-practice documents — no generation or customization needed.

For each stack detected in Step 2 that also has a rule template:

1. Read the rule template from `skills/setup-project/templates/rules/<stack>.tmpl`
2. Write it to `.claude/rules/<stack>.md` as-is

**If file exists:** same overwrite logic as guard scripts (compare, ask if different).

Present via AskUserQuestion after copying:
> Installed N rules for [stacks]. Each rule is scoped to relevant files only — it won't bloat context when working on other parts of the project.

## Step 5: Write plugin metadata

Read the current rkstack plugin version. Use the rkstack binary (available in session context as `$RKSTACK_BIN`):
```bash
rkstack version 2>/dev/null || echo "unknown"
```

If `.rkstack/settings.json` exists, read it to preserve the `detection` and `overrides` sections.

Write `.rkstack/settings.json`, merging the new `meta` key with the existing content:
```json
{
  "detection": <preserved from existing file>,
  "meta": {
    "setupVersion": "<plugin version>",
    "setupDate": "<YYYY-MM-DD>",
    "baseline": true,
    "guards": ["baseline", "<selected guards>"],
    "rules": ["context-hygiene", "<installed rules>"]
  },
  "overrides": <preserved from existing file, or {}>
}
```

## Step 6: Summary

Output:

```
/setup-project complete

Guards installed:
  ✅ baseline (rm -rf, force-push, drop table, reset --hard, etc.)
  ✅ terraform (blocks direct tofu/terraform commands)
  ✅ secrets (protects .env and secrets/ from full overwrite)
  ...

Rules installed:
  ✅ context-hygiene (global — what belongs in CLAUDE.md vs rules vs memory)
  ✅ terraform (scoped to terraform/** — root ownership, lifecycle rules)
  ...

Files created/updated:
  .claude/settings.json — N hook entries merged
  .claude/hooks/ — N scripts
  .claude/rules/ — N rules
  .rkstack/settings.json — setup metadata (v<version>)

Every session in this project is now protected. Guards warn before
destructive commands. Rules teach Claude your project conventions.
```
