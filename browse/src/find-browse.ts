/**
 * find-browse — locate the rkstack-browse binary or wrapper.
 *
 * Outputs the absolute path to the browse binary on stdout, or exits 1 if not found.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Binary Discovery ───────────────────────────────────────────

function getGitRoot(): string | null {
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString().trim();
  } catch {
    return null;
  }
}

export function locateBinary(): string | null {
  // Explicit env override
  if (process.env.BROWSE_BIN) return process.env.BROWSE_BIN;

  const root = getGitRoot();
  const home = homedir();

  // Compiled binary in browse/dist/ (dev mode)
  if (root) {
    const compiled = join(root, 'browse', 'dist', 'rkstack-browse');
    if (existsSync(compiled)) return compiled;
  }

  // Plugin data bin (session-start wrapper)
  const pluginData = join(home, '.claude', 'plugins', 'data', 'rkstack-ccode-personal-plugins', 'bin', 'rkstack-browse');
  if (existsSync(pluginData)) return pluginData;

  // Global install
  const markers = ['.claude', '.codex', '.agents'];
  for (const m of markers) {
    if (root) {
      const local = join(root, m, 'plugins', 'rkstack', 'browse', 'dist', 'rkstack-browse');
      if (existsSync(local)) return local;
    }
    const global = join(home, m, 'plugins', 'rkstack', 'browse', 'dist', 'rkstack-browse');
    if (existsSync(global)) return global;
  }

  return null;
}

// ─── Main ───────────────────────────────────────────────────────

function main() {
  const bin = locateBinary();
  if (!bin) {
    process.stderr.write('ERROR: rkstack-browse binary not found.\n');
    process.exit(1);
  }

  console.log(bin);
}

main();
