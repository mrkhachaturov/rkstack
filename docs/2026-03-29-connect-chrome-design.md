# connect-chrome: Headed Browser with Chrome Extension

**Date:** 2026-03-29
**Status:** Design approved, pending implementation
**Scope:** Full headed browser mode, Chrome side panel extension (activity feed + sidebar chat), browse binary gap closure vs gstack upstream

## What This Adds

When you run `rkstack-browse connect`, a real Chrome window opens under Playwright's control. A side panel extension shows every browse command in real time and gives you a chat interface to send natural language instructions to a child Claude session. You can watch everything the AI does, take over manually, and hand control back.

This also closes gaps in the browse binary that were missed during the original adaptation from gstack (activity streaming, cookie picker UI, Windows support).

## Architecture

Three processes, clean isolation:

```
Extension (side panel)  <-->  Browse server (Bun.serve, port 34567)  <-->  sidebar-agent.ts (child process)
        |                              |                                          |
  Activity feed               /health /refs /command                    polls JSONL queue
  Chat tab                    /sidebar-* routes                         spawns claude -p
                              /activity/stream (SSE)                    relays events back
```

- **Browse server** -- same process as today, adds headed launch mode + sidebar HTTP routes + activity streaming
- **Sidebar agent** -- separate Bun process, polls a JSONL queue, spawns `claude -p` for each user chat message
- **Chrome** -- Playwright-controlled headed Chromium with the rkstack extension auto-loaded

The CLI `rkstack-browse connect` orchestrates startup. `rkstack-browse disconnect` tears it all down and the next command restarts in headless mode automatically.

## BrowserManager Changes

Additive changes to `browse/src/browser-manager.ts`. No existing methods change behavior.

### New state

```
connectionMode: 'launched' | 'headed'    (replaces hardcoded 'launched' return)
isHeaded: boolean
intentionalDisconnect: boolean           (suppresses crash handler during planned disconnect)
watching: boolean                        (watch mode active)
watchInterval, watchSnapshots, watchStartTime  (watch mode tracking)
```

### New methods

**`launchHeaded()`** -- uses `chromium.launchPersistentContext()` (only Playwright API that supports extensions). Loads extension from `findExtensionPath()`. Injects amber shimmer line visual indicator via `addInitScript`. Sets `dialogAutoAccept = false` (user controls dialogs in visible browser). Adopts the default page Playwright opens. User data dir at `~/.rkstack/chromium-profile/`. Browser disconnect exits with code 2 (distinguishes user-closed-window from crash).

**`handoff(message)`** -- transitions headless to headed. Saves state (cookies, storage, URLs) from headless browser. Launches new headed browser with extension. Restores state into it. Closes old headless browser. If the new browser fails to launch, the old headless one stays running (safe fallback). Returns status message for the AI.

**`resume()`** -- called after user finishes manual interaction. Clears refs, resets failure counter, clears frame context. The AI re-snapshots to see what the user changed.

**`findExtensionPath()`** -- checks 3 locations in order: repo root `extension/`, plugin install `~/.claude/plugins/rkstack/extension/`, home `~/.rkstack/extension/`. Returns first that exists, or null.

**Watch methods** -- `startWatch()`, `stopWatch()`, `addWatchSnapshot()`, `isWatching()`. Observation mode that accumulates snapshots during user browsing. AI can review what happened while the user had control.

**`close()` update** -- headed mode closes the persistent context (which closes the browser). Headless mode closes the browser directly (existing behavior).

**`recreateContext()` guard** -- throws in headed mode. Persistent context can't be recreated without losing the extension. User must disconnect first.

**Failure hint update** -- when in headless mode, suggests "Consider handoff to let the user help" after 3 consecutive failures (currently suggests "snapshot -i").

### Headed vs headless differences

| Behavior | Headless (current) | Headed (new) |
|----------|-------------------|-------------|
| Launch API | `chromium.launch()` | `chromium.launchPersistentContext()` |
| Viewport | 1280x720 forced | null (real window size) |
| Extensions | Not possible | Auto-loaded via `--load-extension` |
| Dialog handling | Auto-accept | User controls |
| Disconnect handler | Exit code 1 (crash) | Exit code 2 (user closed) |
| Failure hint | "Try snapshot -i" | "Consider handoff" |
| User data | Ephemeral context | Persistent at `~/.rkstack/chromium-profile/` |

## Server Changes

Changes to `browse/src/server.ts`.

### Headed mode startup

In `start()`, check `BROWSE_HEADED=1` env var. If set, call `browserManager.launchHeaded()` instead of `launch()`. Everything else (port, state file, health endpoint) works the same.

### Activity streaming

New file `browse/src/activity.ts` provides real-time command activity:

- `emitActivity(event)` -- appends to circular buffer, notifies SSE subscribers
- `subscribe()` -- returns async iterator for Server-Sent Events connections
- `getActivityAfter(id)` -- poll-based alternative to SSE
- `getActivityHistory(limit)` -- REST access to recent activity
- Privacy filter: redacts args for `fill`, `cookie`, `header` commands (passwords, tokens, session data)

New server routes:
- `GET /activity/stream?after=ID` -- SSE endpoint, extension connects here
- `GET /activity/history?limit=N` -- REST fallback

Every `handleCommand()` call emits activity events (command start + result/error).

### Sidebar routes

All behind Bearer auth. In-memory state (not persisted across restarts -- headed sessions are ephemeral):

| Route | Method | Purpose |
|-------|--------|---------|
| `/sidebar-chat` | GET | Returns message history as JSON |
| `/sidebar-chat` | POST | Adds user message to queue |
| `/sidebar-chat/clear` | POST | Clears chat history |
| `/sidebar-command` | POST | Direct browse command from sidebar |
| `/sidebar-agent/event` | POST | Agent relays events back to server |
| `/sidebar-agent/kill` | POST | Terminate agent subprocess |
| `/sidebar-agent/stop` | POST | Graceful stop after current task |
| `/sidebar-queue/dismiss` | POST | Dismiss queued unstarted messages |
| `/sidebar-session` | GET | Current session info |
| `/sidebar-session/new` | POST | Create new chat session |
| `/sidebar-session/list` | GET | List saved sessions |

### Health endpoint enrichment

Already returns `mode`. Add: `chatEnabled`, `agent: { status, runningFor, currentMessage, queueLength }`, `session: { id, name }`.

### Cookie picker routes

New files `browse/src/cookie-picker-routes.ts` and `browse/src/cookie-picker-ui.ts`. HTTP route handler for `/cookie-picker/*` endpoints serving an interactive UI during `cookie-import-browser`. Manages the picker lifecycle: start, user selects cookies by domain, import selected. Improves the existing cookie import flow with a polished interface.

## CLI Changes

Changes to `browse/src/cli.ts`.

### `startServer(extraEnv)` parameter

Currently takes no args. Add optional `extraEnv?: Record<string, string>` to pass environment variables to the server subprocess. Needed for `BROWSE_HEADED=1`, `BROWSE_PORT=34567`. Also useful for future features.

### Connect pre-command (before `ensureServer()`)

When `command === 'connect'`:
1. Check if already in headed mode and healthy -- exit with "Already connected"
2. Kill any existing server (SIGTERM, wait 2s, SIGKILL if still alive)
3. Clean Chromium profile locks (`~/.rkstack/chromium-profile/SingletonLock`, `SingletonSocket`, `SingletonCookie`)
4. Delete stale state file
5. Start server with `{ BROWSE_HEADED: '1', BROWSE_PORT: '34567' }`
6. Spawn `sidebar-agent.ts` as separate `Bun.spawn` process (unref'd, detached)
7. Print status and exit

### Disconnect pre-command

When `command === 'disconnect'`:
1. If state says not headed -- "Nothing to disconnect"
2. Try graceful shutdown via `POST /command { command: 'disconnect' }`
3. Fallback: force kill + clean profile locks + clean state file
4. Next command auto-starts headless server normally

### Headed guard in `ensureServer()`

If state file says `mode === 'headed'` and server is alive but not responding to health check, don't silently replace with headless. Print: "Headed server running but not responding. Run `rkstack-browse connect` to restart." and exit.

### ServerState type

Add `mode?: 'launched' | 'headed'` field.

### Windows Node.js fallback

`Bun.spawn` doesn't truly detach on Windows. Add `resolveNodeServerScript()` that looks for `server-node.mjs` bundle. When on Windows and the bundle exists, use `node -e` with `child_process.spawn({ detached: true })` instead of `Bun.spawn`. Fixes browse daemon on Windows.

## Meta-Commands

7 new command handlers in `browse/src/meta-commands.ts`, registered in `browse/src/commands.ts`:

| Command | What it does |
|---------|-------------|
| `connect` | Server-side fallback: if already headed, say so; otherwise tell user to run from CLI |
| `disconnect` | Shutdown server for headless restart |
| `focus` | macOS: `osascript` to activate Chromium window. Optional `@ref` arg scrolls element into view |
| `handoff [message]` | Delegates to `bm.handoff()` -- opens headed browser at current page |
| `resume` | `bm.resume()` + re-snapshot with `-i` flag. Returns "RESUMED" + snapshot |
| `watch` / `watch stop` | Start/stop observation mode. Requires headed mode. Periodic snapshots every 5s |
| `inbox` | List sidebar inbox messages from `.context/sidebar-inbox`. Supports `--clear` |

## New Files Summary

| File | Lines (est.) | Source | Adaptation level |
|------|-------------|--------|-----------------|
| `browse/src/sidebar-agent.ts` | 280 | gstack | Copy and adapt (paths, binary names) |
| `browse/src/activity.ts` | 150 | gstack | Copy and adapt (paths, branding) |
| `browse/src/cookie-picker-routes.ts` | 80 | gstack | Copy and adapt (route paths) |
| `browse/src/cookie-picker-ui.ts` | 120 | gstack | Copy and adapt (branding) |
| `browse/src/find-browse.ts` | 50 | gstack | Copy and adapt (binary name, paths) |
| `extension/manifest.json` | 30 | gstack | Copy and adapt (name, description) |
| `extension/background.js` | 120 | gstack | Copy and adapt (default port, branding) |
| `extension/content.js` | 40 | gstack | Copy and adapt (pill text "rkstack") |
| `extension/content.css` | 30 | gstack | Copy as-is (neutral styling) |
| `extension/popup.html` | 30 | gstack | Copy and adapt (title, branding) |
| `extension/popup.js` | 50 | gstack | Copy and adapt (branding) |
| `extension/sidepanel.html` | 40 | gstack | Copy and adapt (title, branding) |
| `extension/sidepanel.js` | 660 | gstack | Copy and adapt (branding, session paths) |
| `extension/sidepanel.css` | 80 | gstack | Copy as-is (neutral styling) |
| `extension/icons/` | -- | User provides | 16x16, 48x48, 128x128 PNGs |
| `skills/connect-chrome/SKILL.md.tmpl` | 100 | gstack | Copy and adapt (rkstack patterns, RKSTACK_BROWSE) |

## Skill Template

New skill at `skills/connect-chrome/SKILL.md.tmpl`:
- **Tier:** T1 (same as browse -- lightweight, operational)
- **User-invocable:** yes
- **Allowed tools:** Bash, Read, AskUserQuestion
- Steps: connect, verify status, guide user to side panel, demo activity feed, explain chat, suggest next actions
- Uses `RKSTACK_BROWSE` from session-start hook (same as all browse-dependent skills)
- After connecting, `/qa`, `/design-review`, and all browse commands work in the visible Chrome window

Skill count: 33 to 34.

## Testing

### Unit tests (new files)

| Test file | Coverage |
|-----------|----------|
| `browse/test/browser-manager-headed.test.ts` | `getConnectionMode()` values, `findExtensionPath()` resolution, watch mode state transitions, `resume()` state clearing, `handoff()` error paths |
| `browse/test/meta-commands-headed.test.ts` | All 7 new command handlers -- correct responses for headed vs headless state, error messages |
| `browse/test/activity.test.ts` | `emitActivity()`, `getActivityAfter()`, `getActivityHistory()`, privacy filtering redacts fill/cookie/header args |
| `browse/test/sidebar-agent.test.ts` | Queue polling, message parsing, event relay format |

### Existing tests

All 551 existing tests must pass unchanged. Headless behavior is not modified.

### Integration testing

Manual verification:
1. `rkstack-browse connect` launches visible Chrome with amber shimmer line
2. Extension loads, side panel shows activity feed
3. `rkstack-browse goto https://example.com` appears in activity feed
4. Chat tab sends message, sidebar agent spawns `claude -p`, response appears
5. `rkstack-browse disconnect` returns to headless mode
6. Next `rkstack-browse` command auto-starts headless server

Headed Chrome in CI requires a display server (Xvfb) -- not added in this iteration.

## Execution Order

1. Commands registry -- add 7 entries (unblocks everything)
2. BrowserManager -- headed mode, handoff, watch, resume, findExtensionPath
3. activity.ts -- new file, activity streaming
4. cookie-picker-routes.ts + cookie-picker-ui.ts -- new files
5. find-browse.ts -- new file
6. Meta-commands -- 7 new handlers
7. Server -- BROWSE_HEADED + sidebar routes + activity routes + cookie picker routes
8. CLI -- startServer(extraEnv), connect/disconnect, headed guard, Windows fallback
9. Sidebar agent -- new file
10. Extension -- all files + icons placeholder
11. Skill template -- connect-chrome
12. Tests
13. Build -- `just build`, verify with `just check` + `bun test` + `just skill-check`

## Not In Scope

- CI integration tests for headed mode (needs Xvfb)
- Cross-platform extension testing (Chrome-only for now)
- Extension marketplace publishing
- Sidebar agent session persistence across server restarts
