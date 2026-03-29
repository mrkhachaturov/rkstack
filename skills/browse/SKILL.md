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

> **Credential safety:** Use environment variables for test credentials.
> Set them before running: `export TEST_EMAIL="..." TEST_PASSWORD="..."`

```bash
$B goto https://app.com/login
$B snapshot -i                   # see all interactive elements
$B fill @e3 "$TEST_EMAIL"
$B fill @e4 "$TEST_PASSWORD"
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
