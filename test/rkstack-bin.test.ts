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
