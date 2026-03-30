---
name: writing-skills
preamble-tier: 2
version: 1.0.0
description: |
  Create new skills for your project. Use when creating a skill from scratch,
  editing existing skills, or testing skill behavior. TDD applied to process
  documentation: write failing test, write skill, close loopholes.
announce-action: create/edit a skill
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (writing-skills) ===

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

# Writing Skills

This skill teaches how to create skills for YOUR project. It combines:

1. **This file** — skill design patterns, TDD for documentation, CSO
2. **refs/** — official Claude Code documentation (auto-updated)
3. **Companion files** — testing methodology and persuasion research

**Announce at start:** "I'm using the writing-skills skill to create/edit a skill."

---

## What is a Skill?

A **skill** is a SKILL.md file with instructions that Claude follows when relevant. Skills live in directories with optional supporting files:

```
my-skill/
  SKILL.md           # Main instructions (required)
  reference.md       # Detailed docs (loaded when needed)
  scripts/
    helper.sh        # Scripts Claude can execute
```

### Where Skills Live

| Location | Path | Applies to |
|----------|------|-----------|
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin is enabled |

Project skills are shared with the team (committed to git). Personal skills are yours only.

> **Full discovery rules and monorepo support:** Read `refs/skills.md` — section "Where skills live".

### Skill Types

| Type | Examples | What It Contains |
|------|----------|-----------------|
| **Technique** | TDD, debugging | Concrete method with steps |
| **Pattern** | brainstorming, planning | Way of thinking about problems |
| **Reference** | API docs, tool guides | Syntax, commands, configuration |

### When to Create

**Create when:** technique wasn't obvious, you'd reference it again, pattern applies broadly, others would benefit.

**Don't create for:** one-off solutions, standard practices, project-specific conventions (put in CLAUDE.md instead), constraints enforceable with automation (use hooks instead).

---

## SKILL.md Structure

Every skill starts with YAML frontmatter between `---` markers, followed by markdown instructions.

### Frontmatter

```yaml
---
name: my-skill
description: Use when [triggering conditions]. Use when [symptoms].
allowed-tools: Bash, Read, Edit
---
```

Key fields:
- `name` — letters, numbers, hyphens (max 64 chars). Becomes the `/slash-command`.
- `description` — tells Claude WHEN to use the skill. Start with "Use when..." Describe triggering conditions, NOT the workflow.
- `allowed-tools` — tools Claude can use without permission prompts when this skill is active.

Additional fields for controlling behavior:
- `disable-model-invocation: true` — user-only invocation (prevents Claude auto-triggering). Use for skills with side effects like deploy, commit, send-message.
- `user-invocable: false` — hide from `/` menu. Use for background knowledge Claude should load automatically but users shouldn't invoke directly.
- `context: fork` — run in an isolated subagent. The skill content becomes the prompt. Use for self-contained research or analysis tasks.
- `agent` — which subagent to use with `context: fork` (`Explore`, `Plan`, or custom agent name).
- `argument-hint` — autocomplete hint shown in `/` menu (e.g., `[issue-number]`).
- `paths` — glob patterns to auto-activate only when working with matching files.

> **Complete field reference with defaults:** Read `refs/skills.md` — section "Frontmatter reference".

### Dynamic Context

Skills support runtime substitution:
- `$ARGUMENTS` / `$0`, `$1` — arguments passed when invoking. `/my-skill hello` → `$ARGUMENTS` = `hello`.
- `${CLAUDE_SKILL_DIR}` — path to the skill's directory. Use in hook commands.
- `` !`command` `` — shell preprocessing. Runs BEFORE Claude sees the skill. Output replaces the placeholder.

```yaml
---
name: pr-review
context: fork
agent: Explore
---
## PR Context
- Diff: !`gh pr diff`
- Comments: !`gh pr view --comments`

Summarize this pull request...
```

> **Full substitution reference:** Read `refs/skills.md` — section "Available string substitutions" and "Inject dynamic context".

### Supporting Files

Keep SKILL.md under 500 lines. Move detailed reference to supporting files and reference them from SKILL.md:

```markdown
For complete API details, see [reference.md](reference.md)
For usage examples, see [examples.md](examples.md)
```

Claude loads supporting files on demand — they don't cost context until needed.

> **File organization patterns:** Read `refs/skills.md` — section "Add supporting files".

---

## Hooks in Skills

Skills can declare hooks that fire during the skill's lifecycle. Hooks are pre/post-execution checks — they enforce rules programmatically, not through instructions.

```yaml
---
name: safe-editor
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/scripts/check-allowed.sh"
          statusMessage: "Checking edit permissions..."
---
```

Hook scripts read JSON from stdin, return JSON to stdout:
- `{}` — allow
- `{"permissionDecision": "ask", "message": "..."}` — warn (user overrides)
- `{"permissionDecision": "deny", "message": "..."}` — block

**Rule of thumb:** If something MUST happen → use a hook. If it's guidance → put it in skill content.

> **Full hook event list and schemas:** Read `refs/hooks.md`.
> **Practical hook patterns:** Read `refs/hooks-guide.md`.

---

## Subagents

Skills can delegate work to subagents — isolated contexts with their own tools and instructions. Create agents as markdown files in `.claude/agents/`:

```yaml
---
name: code-reviewer
description: Review code for quality issues
model: sonnet
tools: Read, Grep, Glob
---

You are a code reviewer. Analyze the code and report issues...
```

Built-in agents: `Explore` (read-only research), `Plan` (analysis without changes), `general-purpose` (full tools).

> **Agent configuration and patterns:** Read `refs/sub-agents.md`.

---

## Memory Integration

Skills work alongside CLAUDE.md — the persistent instruction system. Don't duplicate what's in CLAUDE.md. Instead, read it:

- Project commands (test, build, lint) → in CLAUDE.md
- Project conventions → in CLAUDE.md
- Skill-specific process → in SKILL.md

If your skill needs project config that's not in CLAUDE.md, ask the user with AskUserQuestion and suggest they persist it to CLAUDE.md.

> **CLAUDE.md hierarchy and import syntax:** Read `refs/memory.md`.

---

## Permissions

Skills grant tool access via `allowed-tools`. This works within the user's permission system — deny rules still override. Permission precedence: deny > ask > allow.

> **Permission rules and tool-specific syntax:** Read `refs/permissions.md`.

---

## CSO: Claude Search Optimization

Claude reads descriptions to decide which skills to load. Optimize for discovery.

**Description = WHEN to use, NOT WHAT it does.** Testing showed that workflow summaries in descriptions cause Claude to skip the full skill body — it treats the description as a shortcut.

```yaml
# BAD: workflow summary — Claude shortcuts the full skill
description: Dispatches subagent per task with code review between tasks

# GOOD: triggering conditions only
description: Use when executing implementation plans with independent tasks
```

**Keywords:** Use error messages, symptoms, synonyms, tool names.

**Token budget:** Skill descriptions share ~16K chars of context. Many skills = some get excluded. Keep descriptions concise.

---

## Testing: TDD for Skills

**Iron Law: No skill without a failing test first.**

Same discipline as TDD for code. Applies to new skills AND edits.

### RED → GREEN → REFACTOR

1. **RED:** Run a pressure scenario with a subagent WITHOUT the skill. Document what it does wrong and the exact rationalizations it uses.
2. **GREEN:** Write a minimal skill that addresses those specific failures. Run the same scenario WITH the skill — the agent should now comply.
3. **REFACTOR:** Agent found a new rationalization? Add an explicit counter. Re-test until bulletproof.

**Full testing methodology:** See `testing-skills-with-subagents.md` — pressure types, plugging holes, meta-testing.

---

## Bulletproofing Discipline Skills

Skills that enforce rules (like TDD, verification) need to resist rationalization. Agents are smart — they find loopholes under pressure.

**Close every loophole explicitly:** Don't just state the rule — forbid specific workarounds.

**Build a rationalization table** from baseline testing — every excuse goes in:

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |

**Create a red flags list** for self-checking:
- Code before test → delete, start over
- "I already tested it manually" → not TDD
- "This is different because..." → it's not

**Persuasion principles:** See `persuasion-principles.md` — research-backed techniques for discipline enforcement.

---

## Skill Creation Checklist

**RED Phase:**
- [ ] Create pressure scenarios (3+ combined pressures for discipline skills)
- [ ] Run WITHOUT skill — document baseline failures verbatim
- [ ] Identify rationalization patterns

**GREEN Phase:**
- [ ] Name: letters, numbers, hyphens only
- [ ] Description: "Use when..." — triggering conditions only
- [ ] SKILL.md under 500 lines (reference material in supporting files)
- [ ] Address specific baseline failures from RED
- [ ] Run WITH skill — agent complies

**REFACTOR Phase:**
- [ ] Find new rationalizations → add counters
- [ ] Build rationalization table
- [ ] Create red flags list
- [ ] Re-test until bulletproof

**Best practices:**
> Read `refs/best-practices.md` for context management, verification patterns, and workflow structure.
