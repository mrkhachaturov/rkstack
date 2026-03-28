---
name: setup-browser-cookies
preamble-tier: 1
version: 1.0.0
description: |
  Import cookies from your real Chromium browser into the headless browse session.
  Supports Chrome, Arc, Brave, Edge, and Chromium. Use before QA testing
  authenticated pages. Use when asked to "import cookies", "login to the site",
  or "authenticate the browser".
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (setup-browser-cookies) ===

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
- **TypeScript/JavaScript** — see PROJECT_TYPE in session context (web or node). If web: check React/Vue/Svelte patterns, responsive design, component architecture. If node: CLI tools, MCP servers, backend scripts.
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

# Setup Browser Cookies

Import logged-in sessions from your real Chromium browser into the headless browse session.

## Find the browse binary

The browse binary path is injected into session context by the session-start hook. Look for `RKSTACK_BROWSE=<path>` at the top of this conversation.

If `RKSTACK_BROWSE` is set, use it directly. For the rest of this skill, `$RKSTACK_BROWSE` refers to the browse binary.

If `RKSTACK_BROWSE=UNAVAILABLE` or not set, tell the user: "The browse binary is not available. Install it with the rkstack release for your platform." and stop.

## Steps

### 1. Check if the user specified a browser and domain

If the user provided arguments (e.g., `/setup-browser-cookies chrome github.com`), skip to the direct import step.

If no arguments, proceed to the interactive step.

### 2. Ask which browser to import from

Use AskUserQuestion:

> **Re-ground:** Setting up browser cookie import for authenticated QA testing.
>
> **Simplify:** I need to know which browser has your login sessions.
>
> **RECOMMENDATION:** Choose whichever browser you are logged into.
>
> A) Chrome
> B) Arc
> C) Brave
> D) Edge
> E) Chromium

### 3. Ask which domains to import

After the user picks a browser, use AskUserQuestion:

> **Re-ground:** Importing cookies from [browser].
>
> **Simplify:** Which domains should I import cookies for? These are the sites you need to be logged into.
>
> **RECOMMENDATION:** Import the domains your app needs for authenticated testing.
>
> Enter the domains separated by spaces (e.g., `github.com api.github.com myapp.com`).

### 4. Import cookies

For each domain the user specified:

```bash
$RKSTACK_BROWSE cookie-import-browser <browser> --domain <domain>
```

Replace `<browser>` with the lowercase browser name (chrome, arc, brave, edge, chromium).

### 5. Verify import

After importing, verify the cookies are loaded:

```bash
$RKSTACK_BROWSE cookies
```

Show the user a summary of imported cookies (domain counts). Confirm that the expected domains have cookies.

### 6. Test authentication

Navigate to one of the imported domains to verify the session works:

```bash
$RKSTACK_BROWSE goto https://<domain>
$RKSTACK_BROWSE snapshot -i
```

If the page shows logged-in content, confirm success. If it shows a login page, the cookies may have expired or the import may have failed -- tell the user and suggest re-logging in to their browser first.

## Notes

- On macOS, the first import per browser may trigger a Keychain dialog -- click "Allow" or "Always Allow"
- On Linux, `v11` cookies may require `secret-tool`/libsecret access
- The browse session persists cookies between commands, so imported cookies work immediately
- Only domain names and cookie counts are shown -- no cookie values are exposed
- Cookie import only works with Chromium-based browsers (Chrome, Arc, Brave, Edge, Chromium)
