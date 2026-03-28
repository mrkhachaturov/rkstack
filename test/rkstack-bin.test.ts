import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

// ─── version ──────────────────────────────────────────────

describe('version command', () => {
  test('VERSION_STRING is a valid semver string', async () => {
    const { VERSION_STRING } = await import('../bin/src/commands/version.ts');
    expect(VERSION_STRING).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('VERSION_STRING matches VERSION file', async () => {
    const { VERSION_STRING } = await import('../bin/src/commands/version.ts');
    const fileVersion = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
    expect(VERSION_STRING).toBe(fileVersion);
  });
});
