---
name: browse
preamble-tier: 1
version: 1.0.0
description: |
  Headless browser for web QA, screenshots, and interaction. Navigate URLs,
  interact with page elements, verify state, take annotated screenshots,
  check responsive layouts, test forms and uploads, handle dialogs. Use when
  asked to open a page, test a site, take a screenshot, check responsive
  behavior, or verify a deployment.
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (browse) ===

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

# browse: headless browser for web QA

Persistent headless Chromium. First call auto-starts the daemon (~3s), then
~100ms per command. State persists between calls (cookies, tabs, login sessions).
Server auto-shuts down after 30 minutes of inactivity.

## Setup

The browse binary path is injected into session context by the session-start hook.
Look for `RKSTACK_BROWSE=<path>` at the top of this conversation.

If `RKSTACK_BROWSE` is set, use it directly:

```bash
$RKSTACK_BROWSE goto https://example.com
```

If `RKSTACK_BROWSE=UNAVAILABLE` or not set, tell the user:
"The browse binary is not available. Install it with `just build-browse` or
check the rkstack release for your platform."

For the rest of this skill, `$B` refers to the browse binary path.

## Core QA patterns

### 1. Verify a page loads correctly

```bash
$B goto https://yourapp.com
$B text                          # content loads?
$B console                       # JS errors?
$B network                       # failed requests?
$B is visible ".main-content"    # key elements present?
```

### 2. Test a user flow

```bash
$B goto https://app.com/login
$B snapshot -i                   # see all interactive elements
$B fill @e3 "user@test.com"
$B fill @e4 "password"
$B click @e5                     # submit
$B snapshot -D                   # diff: what changed after submit?
$B is visible ".dashboard"       # success state present?
```

### 3. Verify an action worked

```bash
$B snapshot                      # baseline
$B click @e3                     # do something
$B snapshot -D                   # unified diff shows exactly what changed
```

### 4. Visual evidence for bug reports

```bash
$B snapshot -i -a -o /tmp/annotated.png   # labeled screenshot
$B screenshot /tmp/bug.png                # plain screenshot
$B console                                # error log
```

After taking screenshots, always use the Read tool on the PNG file so the user
can see it. Without this, screenshots are invisible.

### 5. Assert element states

```bash
$B is visible ".modal"
$B is enabled "#submit-btn"
$B is disabled "#submit-btn"
$B is checked "#agree-checkbox"
$B is editable "#name-field"
$B is focused "#search-input"
$B eval "document.body.textContent.includes('Success')"
```

### 6. Test responsive layouts

```bash
$B responsive /tmp/layout        # mobile + tablet + desktop screenshots
$B viewport 375x812              # or set specific viewport
$B screenshot /tmp/mobile.png
```

Responsive breakpoints: mobile 375x812, tablet 768x1024, desktop 1280x720.

### 7. Test file uploads

```bash
$B upload "#file-input" /path/to/file.pdf
$B is visible ".upload-success"
```

### 8. Test dialogs

```bash
$B dialog-accept "yes"           # set up handler
$B click "#delete-button"        # trigger dialog
$B snapshot -D                   # verify deletion happened
```

### 9. Compare environments

```bash
$B diff https://staging.app.com https://prod.app.com
```

## The ref system

The `snapshot` command reads the page's accessibility tree and assigns refs
(`@e1`, `@e2`, ...) to each element. These refs are handles you use with
`click`, `fill`, `hover`, and other interaction commands.

Refs are **ephemeral**. They are invalidated when:
- You navigate to a new page (`goto`, `back`, `forward`, `reload`)
- The DOM changes significantly

Always re-run `snapshot -i` after navigation or after actions that change the page.

### Snapshot flags

| Flag | What it does |
|------|-------------|
| `-i` | Interactive elements only (buttons, links, inputs) |
| `-a` | Annotated screenshot (red boxes with @e labels on PNG) |
| `-D` | Unified diff against previous snapshot |
| `-d N` | Limit tree depth to N levels |
| `-o path` | Output annotated screenshot to path |
| `-C` | Cursor-interactive: find divs with pointer cursor, onclick |

## Cookie import

Import cookies from your real browser to test authenticated pages:

```bash
$B cookie-import-browser chrome --domain example.com --domain api.example.com
```

Supported browsers: Chrome, Arc, Brave, Edge, Chromium.
macOS and Linux only (Windows not supported in v1).

After importing, navigate to the authenticated page — you should be logged in.

## Full command reference

### Navigate

| Command | Usage | Description |
|---------|-------|-------------|
| `goto` | `goto <url>` | Navigate to URL |
| `back` | `back` | Go back in history |
| `forward` | `forward` | Go forward in history |
| `reload` | `reload` | Reload current page |

### Interact

| Command | Usage | Description |
|---------|-------|-------------|
| `click` | `click <@ref or selector>` | Click element |
| `fill` | `fill <@ref or selector> <value>` | Fill input field |
| `select` | `select <@ref or selector> <value>` | Select dropdown option |
| `hover` | `hover <@ref or selector>` | Hover over element |
| `type` | `type <text>` | Type text via keyboard |
| `press` | `press <key>` | Press key (Enter, Tab, etc.) |
| `scroll` | `scroll down or up or <@ref>` | Scroll page |
| `wait` | `wait <@ref or selector or ms>` | Wait for element/timeout |
| `upload` | `upload <@ref or selector> <file>` | Upload file |

### Read (no side effects)

| Command | Usage | Description |
|---------|-------|-------------|
| `text` | `text [selector]` | Get cleaned page text |
| `html` | `html [selector]` | Get page HTML |
| `console` | `console [--errors]` | Get console output |
| `network` | `network [--failed]` | Get network requests |
| `cookies` | `cookies` | Get cookies as JSON |
| `storage` | `storage` | Get localStorage + sessionStorage |
| `eval` | `eval <expression>` | Evaluate JavaScript |
| `is` | `is visible or hidden or enabled <@ref or selector>` | Check element state |

### Visual

| Command | Usage | Description |
|---------|-------|-------------|
| `screenshot` | `screenshot [@ref or selector] [-o path]` | Take screenshot |
| `snapshot` | `snapshot [-i] [-a] [-D] [-d N]` | Accessibility tree with refs |
| `responsive` | `responsive [-o prefix]` | Screenshots at 3 breakpoints |
| `pdf` | `pdf [-o path]` | Save page as PDF |

### Meta

| Command | Usage | Description |
|---------|-------|-------------|
| `tabs` | `tabs` | List open tabs |
| `tab` | `tab <id>` | Switch to tab |
| `newtab` | `newtab [url]` | Open new tab |
| `closetab` | `closetab [id]` | Close tab |
| `status` | `status` | Server status and current URL |
| `url` | `url` | Get current page URL |
| `stop` | `stop` | Shut down the server |
| `restart` | `restart` | Restart the browser |
| `chain` | `chain <json-array>` | Run multiple commands |
| `diff` | `diff <url1> <url2>` | Text diff between two URLs |
| `state` | `state save or load [path]` | Save/restore browser state |
| `frame` | `frame <@ref or selector>` | Switch to iframe |

### Cookies

| Command | Usage | Description |
|---------|-------|-------------|
| `cookie` | `cookie <name>=<value>` | Set a cookie |
| `cookie-import` | `cookie-import <json-path>` | Import cookies from JSON file |
| `cookie-import-browser` | `cookie-import-browser <browser> --domain <d>` | Import from real browser |
| `header` | `header <name>:<value>` | Set extra HTTP header |
| `useragent` | `useragent <string>` | Set user agent |
| `viewport` | `viewport <WxH>` | Set viewport size |
| `dialog-accept` | `dialog-accept [text]` | Accept next dialog |
| `dialog-dismiss` | `dialog-dismiss` | Dismiss next dialog |
