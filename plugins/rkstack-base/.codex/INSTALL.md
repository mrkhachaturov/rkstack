# Installing rkstack-base for Codex

Enable `rkstack-base` skills in Codex via native skill discovery.

## Prerequisites

- Git

## Installation

1. **Clone the rkstack repository:**
   ```bash
   git clone https://github.com/mrkhachaturov/rkstack.git ~/.codex/rkstack
   ```

2. **Create the skills symlink for `rkstack-base`:**
   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/rkstack/plugins/rkstack-base/skills ~/.agents/skills/rkstack-base
   ```

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\rkstack-base" "$env:USERPROFILE\.codex\rkstack\plugins\rkstack-base\skills"
   ```

3. **Restart Codex** to discover the skills.

## Verify

```bash
ls -la ~/.agents/skills/rkstack-base
```

You should see a symlink (or junction on Windows) pointing to:

```text
~/.codex/rkstack/plugins/rkstack-base/skills
```

## Updating

```bash
cd ~/.codex/rkstack && git pull
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/rkstack-base
```

Optionally delete the clone:

```bash
rm -rf ~/.codex/rkstack
```
