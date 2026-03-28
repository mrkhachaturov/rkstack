## Dev server discovery

Web skills need a running app at a known URL. Check CLAUDE.md for:

- `Dev server: <command>` (e.g., `pnpm dev:web`)
- `Dev URL: <url>` (e.g., `http://localhost:3000`)

If not found in CLAUDE.md, ask the user:

> "What command starts your dev server, and what URL does it serve on?"

Persist the answer to CLAUDE.md so we never ask again.

To check if the server is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" <dev-url> 2>/dev/null
```

If not running, tell the user: "Start your dev server with `<command>` — I need it running to verify visually."
