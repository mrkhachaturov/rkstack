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

// ─── slug ─────────────────────────────────────────────────

describe('slug command', () => {
  describe('extractRepoName', () => {
    test('strips .git suffix from https URL', async () => {
      const { extractRepoName } = await import('../bin/src/commands/slug.ts');
      expect(extractRepoName('https://github.com/user/my-repo.git')).toBe('my-repo');
    });

    test('strips .git suffix from ssh URL', async () => {
      const { extractRepoName } = await import('../bin/src/commands/slug.ts');
      expect(extractRepoName('git@github.com:user/my-repo.git')).toBe('my-repo');
    });

    test('handles URL without .git suffix', async () => {
      const { extractRepoName } = await import('../bin/src/commands/slug.ts');
      expect(extractRepoName('https://github.com/user/my-repo')).toBe('my-repo');
    });

    test('uses directory name when remoteUrl is null', async () => {
      const { extractRepoName } = await import('../bin/src/commands/slug.ts');
      // null means no git remote; falls back to last path component of cwd
      const result = extractRepoName(null);
      const expected = path.basename(process.cwd());
      expect(result).toBe(expected);
    });
  });

  describe('toSlug', () => {
    test('lowercases and replaces special chars with hyphens', async () => {
      const { toSlug } = await import('../bin/src/commands/slug.ts');
      expect(toSlug('My Feature/Branch')).toBe('my-feature-branch');
    });

    test('collapses multiple separators', async () => {
      const { toSlug } = await import('../bin/src/commands/slug.ts');
      expect(toSlug('feat--double-dash')).toBe('feat-double-dash');
    });

    test('strips leading and trailing hyphens', async () => {
      const { toSlug } = await import('../bin/src/commands/slug.ts');
      expect(toSlug('/leading-slash/')).toBe('leading-slash');
    });

    test('handles branch with namespace prefix', async () => {
      const { toSlug } = await import('../bin/src/commands/slug.ts');
      expect(toSlug('feature/add-auth')).toBe('feature-add-auth');
    });
  });

  describe('projectSlug and branchSlug (integration)', () => {
    test('projectSlug returns a non-empty slug', async () => {
      const { projectSlug } = await import('../bin/src/commands/slug.ts');
      const slug = projectSlug();
      expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/);
    });

    test('branchSlug returns a non-empty slug', async () => {
      const { branchSlug } = await import('../bin/src/commands/slug.ts');
      const slug = branchSlug();
      expect(slug.length).toBeGreaterThan(0);
      expect(slug).not.toContain('/');
    });
  });

  describe('run (output modes)', () => {
    test('run with no args prints project slug only', async () => {
      const { run, projectSlug } = await import('../bin/src/commands/slug.ts');
      const lines: string[] = [];
      const origLog = console.log;
      console.log = (s: string) => lines.push(s);
      run([]);
      console.log = origLog;
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(projectSlug());
    });

    test('run --branch prints branch slug only', async () => {
      const { run, branchSlug } = await import('../bin/src/commands/slug.ts');
      const lines: string[] = [];
      const origLog = console.log;
      console.log = (s: string) => lines.push(s);
      run(['--branch']);
      console.log = origLog;
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(branchSlug());
    });

    test('run --full prints two lines', async () => {
      const { run } = await import('../bin/src/commands/slug.ts');
      const lines: string[] = [];
      const origLog = console.log;
      console.log = (s: string) => lines.push(s);
      run(['--full']);
      console.log = origLog;
      expect(lines).toHaveLength(2);
    });
  });
});

// ─── config ───────────────────────────────────────────────

describe('config command', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rkstack-config-test-'));
    configPath = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('get returns empty string for missing file', async () => {
    const { configGet } = await import('../bin/src/commands/config.ts');
    expect(configGet(configPath, 'some.key')).toBe('');
  });

  test('set creates config file and get retrieves it', async () => {
    const { configSet, configGet } = await import('../bin/src/commands/config.ts');
    configSet(configPath, 'some.key', 'hello');
    expect(configGet(configPath, 'some.key')).toBe('hello');
  });

  test('set stores value as string even for boolean-like input', async () => {
    const { configSet, configGet } = await import('../bin/src/commands/config.ts');
    configSet(configPath, 'proactive_suggestions', 'false');
    expect(configGet(configPath, 'proactive_suggestions')).toBe('false');
    expect(typeof configGet(configPath, 'proactive_suggestions')).toBe('string');
  });

  test('set handles dotted key as nested object', async () => {
    const { configSet, configGet } = await import('../bin/src/commands/config.ts');
    configSet(configPath, 'dual_review.max_rounds', '3');
    expect(configGet(configPath, 'dual_review.max_rounds')).toBe('3');
    // Verify nested structure in file
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(raw.dual_review.max_rounds).toBe('3');
  });

  test('set preserves existing keys', async () => {
    const { configSet, configGet } = await import('../bin/src/commands/config.ts');
    configSet(configPath, 'key1', 'val1');
    configSet(configPath, 'key2', 'val2');
    expect(configGet(configPath, 'key1')).toBe('val1');
    expect(configGet(configPath, 'key2')).toBe('val2');
  });

  test('list returns empty string for missing file', async () => {
    const { configList } = await import('../bin/src/commands/config.ts');
    expect(configList(configPath)).toBe('');
  });

  test('list returns key=value lines', async () => {
    const { configSet, configList } = await import('../bin/src/commands/config.ts');
    configSet(configPath, 'a', '1');
    configSet(configPath, 'b', '2');
    const output = configList(configPath);
    expect(output).toContain('a = 1');
    expect(output).toContain('b = 2');
  });

  test('list flattens dotted keys', async () => {
    const { configSet, configList } = await import('../bin/src/commands/config.ts');
    configSet(configPath, 'dual_review.max_rounds', '5');
    const output = configList(configPath);
    expect(output).toContain('dual_review.max_rounds = 5');
  });

  test('get returns empty string for missing key in existing file', async () => {
    const { configSet, configGet } = await import('../bin/src/commands/config.ts');
    configSet(configPath, 'existing', 'value');
    expect(configGet(configPath, 'missing')).toBe('');
  });
});

// ─── repo-mode ────────────────────────────────────────────

describe('repo-mode command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rkstack-repomode-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns solo for 1 author', async () => {
    const { detectRepoMode } = await import('../bin/src/commands/repo-mode.ts');
    const result = detectRepoMode({ cacheDir: tmpDir, getAuthorCount: () => 1 });
    expect(result).toBe('solo');
  });

  test('returns collaborative for 2+ authors', async () => {
    const { detectRepoMode } = await import('../bin/src/commands/repo-mode.ts');
    const result = detectRepoMode({ cacheDir: tmpDir, getAuthorCount: () => 3 });
    expect(result).toBe('collaborative');
  });

  test('returns solo for 0 authors (no history)', async () => {
    const { detectRepoMode } = await import('../bin/src/commands/repo-mode.ts');
    // 0 authors = new repo or no commits in 90 days → default to solo
    const result = detectRepoMode({ cacheDir: tmpDir, getAuthorCount: () => 0 });
    expect(result).toBe('solo');
  });

  test('writes result to cache file', async () => {
    const { detectRepoMode } = await import('../bin/src/commands/repo-mode.ts');
    detectRepoMode({ cacheDir: tmpDir, getAuthorCount: () => 1 });
    const cacheFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith('repo-mode-'));
    expect(cacheFiles.length).toBe(1);
    const cache = JSON.parse(fs.readFileSync(path.join(tmpDir, cacheFiles[0]), 'utf8'));
    expect(cache.result).toBe('solo');
    expect(typeof cache.timestamp).toBe('number');
  });

  test('reads from cache when fresh (avoids calling getAuthorCount)', async () => {
    const { detectRepoMode } = await import('../bin/src/commands/repo-mode.ts');
    let callCount = 0;
    const getAuthorCount = () => { callCount++; return 1; };
    // First call writes cache
    detectRepoMode({ cacheDir: tmpDir, getAuthorCount });
    expect(callCount).toBe(1);
    // Second call should read from cache (within 7 days)
    detectRepoMode({ cacheDir: tmpDir, getAuthorCount });
    expect(callCount).toBe(1); // not called again
  });

  test('recomputes when cache is expired (> 7 days)', async () => {
    const { detectRepoMode, cacheFileName } = await import('../bin/src/commands/repo-mode.ts');
    let callCount = 0;
    const getAuthorCount = () => { callCount++; return 1; };
    const repoRoot = process.cwd();
    // Write a stale cache manually using the same hash function as the implementation
    const staleTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    fs.writeFileSync(
      path.join(tmpDir, cacheFileName(repoRoot)),
      JSON.stringify({ result: 'solo', timestamp: staleTimestamp }),
      'utf8'
    );
    // Should recompute despite cache existing
    detectRepoMode({ cacheDir: tmpDir, getAuthorCount, repoRoot });
    expect(callCount).toBe(1);
  });

  test('config override short-circuits detection and caching', async () => {
    const { detectRepoMode } = await import('../bin/src/commands/repo-mode.ts');
    let callCount = 0;
    const result = detectRepoMode({
      cacheDir: tmpDir,
      getAuthorCount: () => { callCount++; return 5; },
      override: 'solo',
    });
    expect(result).toBe('solo');
    expect(callCount).toBe(0);
  });
});

// ─── main router ──────────────────────────────────────────

describe('main router', () => {
  test('resolveConfigPath uses CLAUDE_PLUGIN_DATA env var when set', async () => {
    const { resolveConfigPath } = await import('../bin/src/main.ts');
    const orig = process.env.CLAUDE_PLUGIN_DATA;
    process.env.CLAUDE_PLUGIN_DATA = '/tmp/test-plugin-data';
    expect(resolveConfigPath()).toBe('/tmp/test-plugin-data/config.json');
    if (orig !== undefined) process.env.CLAUDE_PLUGIN_DATA = orig;
    else delete process.env.CLAUDE_PLUGIN_DATA;
  });

  test('resolveConfigPath uses nested path under CLAUDE_PLUGIN_DATA', async () => {
    const { resolveConfigPath } = await import('../bin/src/main.ts');
    const orig = process.env.CLAUDE_PLUGIN_DATA;
    process.env.CLAUDE_PLUGIN_DATA = '/tmp/test-plugin-data-2';
    expect(resolveConfigPath()).toBe('/tmp/test-plugin-data-2/config.json');
    if (orig !== undefined) process.env.CLAUDE_PLUGIN_DATA = orig;
    else delete process.env.CLAUDE_PLUGIN_DATA;
  });

  test('resolveCacheDir uses CLAUDE_PLUGIN_DATA env var when set', async () => {
    const { resolveCacheDir } = await import('../bin/src/main.ts');
    const orig = process.env.CLAUDE_PLUGIN_DATA;
    process.env.CLAUDE_PLUGIN_DATA = '/tmp/test-plugin-data';
    expect(resolveCacheDir()).toBe('/tmp/test-plugin-data/cache');
    if (orig !== undefined) process.env.CLAUDE_PLUGIN_DATA = orig;
    else delete process.env.CLAUDE_PLUGIN_DATA;
  });
});

// ─── bootstrap script (integration) ─────────────────────

import { generatePreamble } from '../scripts/resolvers/preamble';
import { HOST_PATHS } from '../scripts/resolvers/types';
import type { TemplateContext } from '../scripts/resolvers/types';

/** Extract the second ```bash...``` block (the bootstrap) from generated preamble. */
function extractBootstrapBlock(preamble: string): string {
  const blocks = [...preamble.matchAll(/```bash\n([\s\S]*?)```/g)];
  if (blocks.length < 2) throw new Error('No bootstrap block found in preamble');
  return blocks[1][1]; // Second bash block = bootstrap
}

describe('bootstrap script (real generated)', () => {
  let tmpDir: string;
  let bootstrapScript: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rkstack-bootstrap-test-'));
    // Generate the real preamble for Claude host T1
    const ctx: TemplateContext = {
      skillName: 'test-bootstrap',
      tmplPath: '/fake/SKILL.md.tmpl',
      host: 'claude',
      paths: HOST_PATHS['claude'],
      preambleTier: 1,
    };
    const preamble = generatePreamble(ctx);
    bootstrapScript = extractBootstrapBlock(preamble);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('prints RKSTACK_BIN_UNAVAILABLE on download failure', () => {
    const binDir = path.join(tmpDir, 'bin');
    const versionFile = path.join(tmpDir, 'VERSION');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(versionFile, '0.4.0', 'utf8');

    // Mock curl that always fails
    const mockCurl = path.join(tmpDir, 'curl');
    fs.writeFileSync(mockCurl, '#!/bin/bash\nexit 1\n', { mode: 0o755 });

    const wrapper = `
      export PATH="${tmpDir}:$PATH"
      export CLAUDE_PLUGIN_DATA="${tmpDir}"
      export CLAUDE_PLUGIN_ROOT="${tmpDir}"
      ${bootstrapScript}
    `;
    const r = spawnSync('bash', ['-c', wrapper], { encoding: 'utf8' });
    expect(r.stdout).toContain('RKSTACK_BIN_UNAVAILABLE');
    // Verify no partial file left behind
    expect(fs.existsSync(path.join(binDir, 'rkstack'))).toBe(false);
    // Verify fail marker was created
    expect(fs.existsSync(path.join(binDir, '.download-failed'))).toBe(true);
  });

  test('skips download when fail marker exists (session-level dedup)', () => {
    const binDir = path.join(tmpDir, 'bin');
    const versionFile = path.join(tmpDir, 'VERSION');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(versionFile, '0.4.0', 'utf8');
    // Pre-create fail marker (simulates prior failure in this session)
    fs.writeFileSync(path.join(binDir, '.download-failed'), '', 'utf8');

    const wrapper = `
      export CLAUDE_PLUGIN_DATA="${tmpDir}"
      export CLAUDE_PLUGIN_ROOT="${tmpDir}"
      ${bootstrapScript}
    `;
    const r = spawnSync('bash', ['-c', wrapper], { encoding: 'utf8' });
    expect(r.stdout).toContain('RKSTACK_BIN_UNAVAILABLE');
    expect(r.stdout).toContain('will retry next session');
  });
});
