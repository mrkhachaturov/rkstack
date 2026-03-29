---
name: connect-chrome
preamble-tier: 1
version: 1.0.0
description: |
  Launch real Chrome controlled by rkstack with the Side Panel extension auto-loaded.
  One command: connects Claude to a visible Chrome window where you can watch every
  action in real time. The extension shows a live activity feed in the Side Panel.
  Use when asked to "connect chrome", "open chrome", "real browser", "launch chrome",
  "side panel", or "control my browser".
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
# === RKstack Preamble (connect-chrome) ===

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

# /connect-chrome — Launch Real Chrome with Side Panel

Connect Claude to a visible Chrome window with the rkstack extension auto-loaded.
You see every click, every navigation, every action in real time.

## Step 0: Pre-flight cleanup

Before connecting, kill any stale browse servers and clean up lock files that
may have persisted from a crash. This prevents "already connected" false
positives and Chromium profile lock conflicts.

```bash
# Kill any existing browse server
if [ -f "$(git rev-parse --show-toplevel 2>/dev/null)/.rkstack/browse.json" ]; then
  _OLD_PID=$(cat "$(git rev-parse --show-toplevel)/.rkstack/browse.json" 2>/dev/null | grep -o '"pid":[0-9]*' | grep -o '[0-9]*')
  [ -n "$_OLD_PID" ] && kill "$_OLD_PID" 2>/dev/null || true
  sleep 1
  [ -n "$_OLD_PID" ] && kill -9 "$_OLD_PID" 2>/dev/null || true
  rm -f "$(git rev-parse --show-toplevel)/.rkstack/browse.json"
fi
# Clean Chromium profile locks (can persist after crashes)
_PROFILE_DIR="$HOME/.rkstack/chromium-profile"
for _LF in SingletonLock SingletonSocket SingletonCookie; do
  rm -f "$_PROFILE_DIR/$_LF" 2>/dev/null || true
done
echo "Pre-flight cleanup done"
```

## Step 1: Connect

```bash
$RKSTACK_BROWSE connect
```

This launches Playwright's bundled Chromium in headed mode with:
- A visible window you can watch (not your regular Chrome — it stays untouched)
- The rkstack Chrome extension auto-loaded via `launchPersistentContext`
- A golden shimmer line at the top of every page so you know which window is controlled
- A sidebar agent process for chat commands

The `connect` command auto-discovers the extension from the rkstack install
directory. It always uses port **34567** so the extension can auto-connect.

After connecting, print the full output to the user. Confirm you see
`Mode: headed` in the output.

If the output shows an error or the mode is not `headed`, run `$RKSTACK_BROWSE status` and
share the output with the user before proceeding.

## Step 2: Verify

```bash
$RKSTACK_BROWSE status
```

Confirm the output shows `Mode: headed`. The port should be **34567**.

## Step 3: Guide the user to the Side Panel

Use AskUserQuestion:

> Chrome is launched with rkstack control. You should see Playwright's Chromium
> (not your regular Chrome) with a golden shimmer line at the top of the page.
>
> The Side Panel extension should be auto-loaded. To open it:
> 1. Look for the **puzzle piece icon** (Extensions) in the toolbar
> 2. Click the **puzzle piece** → find **rkstack browse** → click the **pin icon**
> 3. Click the pinned **rkstack icon** in the toolbar
> 4. The Side Panel should open on the right showing a live activity feed
>
> **Port:** 34567 (auto-detected — the extension connects automatically).

Options:
- A) I can see the Side Panel — let's go!
- B) I can see Chrome but can't find the extension
- C) Something went wrong

If B: Guide the user to check `chrome://extensions` and load unpacked if needed.

If C: Run `$RKSTACK_BROWSE status`, re-run cleanup + connect if needed, try `$RKSTACK_BROWSE focus`.

## Step 4: Demo

After the user confirms the Side Panel is working:

```bash
$RKSTACK_BROWSE goto https://news.ycombinator.com
```

Wait 2 seconds, then:

```bash
$RKSTACK_BROWSE snapshot -i
```

Tell the user to check the Side Panel activity feed.

## Step 5: Sidebar chat

Tell the user about the chat tab — they can type natural language commands
and a sidebar agent executes them in the browser.

## Step 6: What's next

Tell the user:

> You're all set! Here's what you can do:
>
> **Watch Claude work:** Run any browse-dependent skill (`/qa`, `/design-review`,
> `/benchmark`) and watch every action in the visible Chrome + Side Panel feed.
>
> **Control directly:** Sidebar chat, or `$RKSTACK_BROWSE` commands.
>
> **Window management:** `$RKSTACK_BROWSE focus` (bring to front),
> `$RKSTACK_BROWSE disconnect` (return to headless).
