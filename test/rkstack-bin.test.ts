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
