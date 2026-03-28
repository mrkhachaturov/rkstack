---
name: dispatching-parallel-agents
preamble-tier: 2
version: 1.0.0
description: |
  Dispatch 2+ independent tasks to parallel subagents. Use when facing
  tasks that can be worked on without shared state or sequential
  dependencies. Coordinates results and handles conflicts.
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
# === RKstack Preamble (dispatching-parallel-agents) ===

# Project detection via scc — single source of truth for languages AND frameworks
_SCC_OUT=$(scc --format wide --no-cocomo --exclude-dir 3rdparty-src . 2>/dev/null | head -15 || echo "scc not available")
echo "STACK:"
echo "$_SCC_OUT"

# Derive language frameworks from scc output (recursive, catches subdirs/submodules)
_HAS_TS=$( echo "$_SCC_OUT" | grep -qi "TypeScript"  && echo "yes" || echo "no")
_HAS_JS=$( echo "$_SCC_OUT" | grep -qi "JavaScript"  && echo "yes" || echo "no")
_HAS_PY=$( echo "$_SCC_OUT" | grep -qi "Python"      && echo "yes" || echo "no")
_HAS_GO=$( echo "$_SCC_OUT" | grep -qi "^Go "         && echo "yes" || echo "no")
_HAS_RS=$( echo "$_SCC_OUT" | grep -qi "Rust"         && echo "yes" || echo "no")
_HAS_JAVA=$(echo "$_SCC_OUT" | grep -qi "Java "       && echo "yes" || echo "no")
_HAS_CS=$( echo "$_SCC_OUT" | grep -qi "C#"           && echo "yes" || echo "no")
_HAS_RB=$( echo "$_SCC_OUT" | grep -qi "Ruby"         && echo "yes" || echo "no")
echo "LANGS: ts=$_HAS_TS js=$_HAS_JS py=$_HAS_PY go=$_HAS_GO rs=$_HAS_RS java=$_HAS_JAVA cs=$_HAS_CS rb=$_HAS_RB"

# Tooling hints (non-language markers — scc doesn't detect these)
_HAS_DOCKER=$(  [ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TF=$(      echo "$_SCC_OUT" | grep -qi "Terraform\|HCL" && echo "yes" || echo "no")
_HAS_ANSIBLE=$( echo "$_SCC_OUT" | grep -qi "Ansible\|YAML" && { [ -d ansible ] || [ -f ansible.cfg ] || find . -maxdepth 2 -name "*.yml" -path "*/playbooks/*" -print -quit 2>/dev/null | grep -q .; } && echo "yes" || echo "no")
_HAS_COMPOSE=$( [ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ] || [ -f compose.yaml ] && echo "yes" || echo "no")
_HAS_JUST=$(    [ -f justfile ] || [ -f Justfile ] && echo "yes" || echo "no")
_HAS_MISE=$(    [ -f .mise.toml ] || [ -f mise.toml ] && echo "yes" || echo "no")
echo "TOOLS: docker=$_HAS_DOCKER tf=$_HAS_TF ansible=$_HAS_ANSIBLE compose=$_HAS_COMPOSE just=$_HAS_JUST mise=$_HAS_MISE"

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
- **TypeScript/JavaScript** — web/fullstack project. Check for React/Vue/Svelte patterns.
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

```bash
# === rkstack bootstrap ===
RKSTACK_BIN="${CLAUDE_PLUGIN_DATA}/bin/rkstack"
WANT_VERSION=$(cat "${CLAUDE_PLUGIN_ROOT}/VERSION")
if [ ! -x "$RKSTACK_BIN" ] || [ "$("$RKSTACK_BIN" version 2>/dev/null)" != "$WANT_VERSION" ]; then
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  ASSET="rkstack-${OS}-${ARCH}"
  URL="https://github.com/mrkhachaturov/rkstack/releases/download/v${WANT_VERSION}/${ASSET}"
  mkdir -p "${CLAUDE_PLUGIN_DATA}/bin"
  FAIL_MARKER="${CLAUDE_PLUGIN_DATA}/bin/.download-failed"
  find "${CLAUDE_PLUGIN_DATA}/bin" -name ".download-failed" -mmin +60 -delete 2>/dev/null || true
  if [ -f "$FAIL_MARKER" ]; then
    echo "RKSTACK_BIN_UNAVAILABLE (download failed this session, will retry next session)"
  else
    TMPBIN="${RKSTACK_BIN}.tmp.$$"
    if curl --connect-timeout 5 --max-time 30 -fsSL "$URL" -o "$TMPBIN" 2>/dev/null \
       && chmod +x "$TMPBIN" \
       && [ "$("$TMPBIN" version 2>/dev/null)" = "$WANT_VERSION" ]; then
      mv -f "$TMPBIN" "$RKSTACK_BIN"
      rm -f "$FAIL_MARKER"
    else
      rm -f "$TMPBIN"
      touch "$FAIL_MARKER"
      echo "RKSTACK_BIN_UNAVAILABLE (download failed or platform ${OS}-${ARCH} not supported)"
    fi
  fi
fi
```

If `RKSTACK_BIN_UNAVAILABLE` is printed above, skills fall back to inline bash — no action needed.

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

# Dispatching Parallel Agents

Delegate independent tasks to focused subagents running concurrently. Each agent gets isolated context and a precise scope. You coordinate, they execute.

**Core principle:** One agent per independent problem domain. Complete context in, verified results out.

---

## When to Use

```
Multiple tasks? ──no──► Do them yourself sequentially
      │yes
      ▼
Are they independent? ──no──► Single agent or sequential execution
      │yes
      ▼
Would they touch the same files? ──yes──► Sequential execution
      │no
      ▼
Parallel dispatch
```

**Use when:**
- 2+ tasks with no shared state or file overlap
- Multiple test files failing with different root causes
- Multiple subsystems broken independently
- Each task can be understood without context from others

**Do NOT use when:**
- Failures are related (fixing one might fix others)
- Tasks would edit the same files
- You need to understand full system state first
- You are still in exploratory/diagnostic mode (figure out what is wrong before dispatching)

---

## Safety Rules

1. **Tasks MUST be independent.** No shared files, no shared state. If two tasks might touch the same file, run them sequentially instead.
2. **Each agent gets complete context.** Include everything the agent needs: file paths, error messages, constraints, expected output format. Do not make agents discover things you already know.
3. **Constrain scope explicitly.** Tell each agent what NOT to change. An unconstrained agent will refactor the world.
4. **Review all results before committing.** Agents can make systematic errors. Verify every change yourself.
5. **Never trust self-reports.** An agent saying "fixed" is not evidence. Run tests, read diffs, confirm.

---

## The Dispatch Pattern

### 1. Identify Independent Tasks

Group work by problem domain. Each domain must be fully independent:
- Different files, different subsystems, different concerns
- Fixing one does not affect the others
- No ordering dependency between them

### 2. Craft Complete Agent Prompts

Each agent prompt must be self-contained:

```markdown
[Clear task title]

[What to do — specific scope, specific files]

Context:
- [Error messages, test names, file paths]
- [Relevant background the agent needs]

Constraints:
- Only modify files in [scope]
- Do NOT change [out-of-scope areas]

Return: Summary of root cause and what you changed.
```

Good prompts are **focused** (one problem domain), **self-contained** (all needed context included), and **specific about output** (what the agent should return).

### 3. Dispatch All in a Single Message

Send all Agent tool calls in the same message so they run concurrently:

```
Agent("Fix auth module test failures in src/auth/...")
Agent("Fix payment processing tests in src/payments/...")
Agent("Update API documentation for new endpoints")
```

All agents run in parallel. You wait for all to return.

### 4. Review and Integrate

When agents return:

1. **Read each summary** — understand what changed and why
2. **Check for conflicts** — did any agents unexpectedly touch overlapping files?
3. **Read the diffs** — `git diff` to see actual changes, not just agent claims
4. **Run full test suite** — verify all changes work together
5. **Commit results** — only after verification passes

---

## Conflict Resolution

If agents touched overlapping files (despite your precautions):

1. **Compare the changes** — read both versions, understand intent
2. **Pick the better version** — or manually merge the best parts of each
3. **Re-dispatch if needed** — send one agent the other's changes as context, ask it to redo its work on top

Conflicts mean your task decomposition was wrong. Next time, tighten the boundaries.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Too broad: "Fix all the tests" | Specific: "Fix auth tests in src/auth/login.test.ts" |
| No context: "Fix the race condition" | Context: paste error messages and test names |
| No constraints: agent refactors everything | Constraints: "Only modify files in src/auth/" |
| Vague output: "Fix it" | Specific: "Return summary of root cause and changes" |
| Trusting self-reports | Verify: run tests, read diffs yourself |

---

## Result Verification

After merging all agent results, verify before claiming completion:

1. **Run the full test suite** — not just the tests agents worked on
2. **Run linter/type-checker** — agents may introduce new warnings
3. **Read every changed file** — spot-check for systematic errors
4. **Check for unintended changes** — debug code, commented-out blocks, hardcoded values

Use the verification-before-completion skill if available. No completion claims without fresh evidence.

## Status Report

After all results are collected and verified, report:
- **DONE** — all parallel tasks completed, results merged, tests pass
- **DONE_WITH_CONCERNS** — tasks completed but conflicts found or some results need review
- **BLOCKED** — one or more agents failed and could not be re-dispatched
- **NEEDS_CONTEXT** — insufficient information to craft agent prompts
