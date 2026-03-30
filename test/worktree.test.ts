/**
 * Unit tests for WorktreeManager.
 *
 * Tests worktree lifecycle: create, harvest, dedup, cleanup, prune.
 * Each test creates real git worktrees in a temporary repo.
 */

import { describe, test, expect, afterEach } from 'bun:test';
import { WorktreeManager } from '../lib/worktree';
import type { HarvestResult } from '../lib/worktree';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/** Create a minimal git repo in a tmpdir for testing. */
/** Run a git command in the test repo, throwing on failure. */
function gitSync(args: string[], cwd: string): void {
  const result = spawnSync('git', args, { cwd, stdio: 'pipe', timeout: 10_000 });
  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim() ?? '';
    throw new Error(`git ${args.join(' ')} failed (exit ${result.status}): ${stderr}`);
  }
}

function createTestRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-test-'));
  gitSync(['init'], dir);
  gitSync(['config', 'user.email', 'test@test.com'], dir);
  gitSync(['config', 'user.name', 'Test'], dir);

  // Create initial commit so HEAD exists
  fs.writeFileSync(path.join(dir, 'README.md'), '# Test repo\n');
  // Add .gitignore matching rkstack paths
  fs.writeFileSync(path.join(dir, '.gitignore'), '.rkstack-worktrees/\n');

  gitSync(['add', 'README.md', '.gitignore'], dir);
  gitSync(['commit', '-m', 'Initial commit'], dir);

  // Verify HEAD exists — if this fails, the test would give a confusing error later
  gitSync(['rev-parse', 'HEAD'], dir);

  return dir;
}

/** Clean up a test repo. */
function cleanupRepo(dir: string): void {
  // Prune worktrees first to avoid git lock issues
  spawnSync('git', ['worktree', 'prune'], { cwd: dir, stdio: 'pipe' });
  fs.rmSync(dir, { recursive: true, force: true });
}

// Track repos to clean up
const repos: string[] = [];

// Dedup index path — clear after each test to avoid cross-run contamination
const DEDUP_PATH = path.join(os.homedir(), '.rkstack-dev', 'harvests', 'dedup.json');

afterEach(() => {
  for (const repo of repos) {
    try { cleanupRepo(repo); } catch { /* best effort */ }
  }
  repos.length = 0;
  // Clear dedup index so tests are independent
  try { fs.unlinkSync(DEDUP_PATH); } catch { /* may not exist */ }
});

describe('WorktreeManager', () => {

  describe('create()', () => {

    test('produces a valid worktree at expected path', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-1');

      expect(fs.existsSync(worktreePath)).toBe(true);
      expect(worktreePath).toContain('.rkstack-worktrees');
      expect(worktreePath).toContain('test-1');

      mgr.cleanup('test-1');
    });

    test('worktree contains files from HEAD (README.md)', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-readme');

      expect(fs.existsSync(path.join(worktreePath, 'README.md'))).toBe(true);

      mgr.cleanup('test-readme');
    });

    test('stores correct originalSha', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const expectedSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, stdio: 'pipe' })
        .stdout.toString().trim();

      mgr.create('test-sha');

      const info = mgr.getInfo('test-sha');
      expect(info).toBeDefined();
      expect(info!.originalSha).toBe(expectedSha);

      mgr.cleanup('test-sha');
    });

    test('multiple worktrees can coexist', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const wt1 = mgr.create('multi-1');
      const wt2 = mgr.create('multi-2');

      expect(fs.existsSync(wt1)).toBe(true);
      expect(fs.existsSync(wt2)).toBe(true);
      expect(wt1).not.toBe(wt2);

      mgr.cleanup('multi-1');
      mgr.cleanup('multi-2');
    });

    test('throws on failure (no silent fallback to ROOT)', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      // Create the same worktree twice — second should fail because path exists
      mgr.create('test-fail');
      expect(() => mgr.create('test-fail')).toThrow();

      mgr.cleanup('test-fail');
    });

  });

  describe('harvest()', () => {

    test('returns HarvestResult with correct fields for a modified file', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-harvest-fields');
      fs.writeFileSync(path.join(worktreePath, 'README.md'), '# Modified!\n');

      const result = mgr.harvest('test-harvest-fields');

      expect(result).not.toBeNull();
      expect(result!.testName).toBe('test-harvest-fields');
      expect(typeof result!.diffStat).toBe('string');
      expect(result!.patchPath).toBeTruthy();
      expect(Array.isArray(result!.changedFiles)).toBe(true);
      expect(typeof result!.isDuplicate).toBe('boolean');

      mgr.cleanup('test-harvest-fields');
    });

    test('patch file exists at the reported path', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-harvest-patch');
      fs.writeFileSync(path.join(worktreePath, 'README.md'), '# Changed!\n');

      const result = mgr.harvest('test-harvest-patch');

      expect(result).not.toBeNull();
      expect(result!.isDuplicate).toBe(false);
      expect(fs.existsSync(result!.patchPath)).toBe(true);

      mgr.cleanup('test-harvest-patch');
    });

    test('changedFiles lists the modified file', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-harvest-changedfiles');
      fs.writeFileSync(path.join(worktreePath, 'README.md'), '# Changed!\n');

      const result = mgr.harvest('test-harvest-changedfiles');

      expect(result).not.toBeNull();
      expect(result!.changedFiles).toContain('README.md');

      mgr.cleanup('test-harvest-changedfiles');
    });

    test('captures new untracked files', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-harvest-new');
      fs.writeFileSync(path.join(worktreePath, 'new-file.txt'), 'Hello from agent\n');

      const result = mgr.harvest('test-harvest-new');

      expect(result).not.toBeNull();
      expect(result!.changedFiles).toContain('new-file.txt');

      mgr.cleanup('test-harvest-new');
    });

    test('captures committed changes', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-harvest-commit');
      fs.writeFileSync(path.join(worktreePath, 'committed.txt'), 'Agent committed this\n');
      spawnSync('git', ['add', 'committed.txt'], { cwd: worktreePath, stdio: 'pipe' });
      spawnSync('git', ['commit', '-m', 'Agent commit'], { cwd: worktreePath, stdio: 'pipe' });

      const result = mgr.harvest('test-harvest-commit');

      expect(result).not.toBeNull();
      expect(result!.changedFiles).toContain('committed.txt');

      mgr.cleanup('test-harvest-commit');
    });

    test('unmodified worktree returns null', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      mgr.create('test-harvest-clean');

      // Don't modify anything
      const result = mgr.harvest('test-harvest-clean');

      expect(result).toBeNull();

      mgr.cleanup('test-harvest-clean');
    });

    test('returns null gracefully when worktree dir was deleted', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-deleted');

      // Simulate agent deleting its own worktree directory
      fs.rmSync(worktreePath, { recursive: true, force: true });

      // harvest should return null gracefully, not throw
      const result = mgr.harvest('test-deleted');
      expect(result).toBeNull();

      // cleanup should also be non-fatal
      mgr.cleanup('test-deleted');
    });

  });

  describe('cleanup()', () => {

    test('removes the worktree directory', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const worktreePath = mgr.create('test-cleanup');
      expect(fs.existsSync(worktreePath)).toBe(true);

      mgr.cleanup('test-cleanup');
      expect(fs.existsSync(worktreePath)).toBe(false);
    });

    test('does not affect other worktrees', () => {
      const repo = createTestRepo();
      repos.push(repo);
      const mgr = new WorktreeManager(repo);

      const wt1 = mgr.create('cleanup-keep');
      const wt2 = mgr.create('cleanup-remove');

      mgr.cleanup('cleanup-remove');

      expect(fs.existsSync(wt1)).toBe(true);
      expect(fs.existsSync(wt2)).toBe(false);

      mgr.cleanup('cleanup-keep');
    });

  });

  describe('dedup', () => {

    test('identical changes produce isDuplicate on second harvest', () => {
      const repo = createTestRepo();
      repos.push(repo);

      // First run
      const mgr1 = new WorktreeManager(repo);
      const wt1 = mgr1.create('test-dedup-1');
      fs.writeFileSync(path.join(wt1, 'dedup-test.txt'), 'same content\n');
      const result1 = mgr1.harvest('test-dedup-1');
      mgr1.cleanup('test-dedup-1');

      expect(result1).not.toBeNull();
      expect(result1!.isDuplicate).toBe(false);

      // Second run with same change
      const mgr2 = new WorktreeManager(repo);
      const wt2 = mgr2.create('test-dedup-2');
      fs.writeFileSync(path.join(wt2, 'dedup-test.txt'), 'same content\n');
      const result2 = mgr2.harvest('test-dedup-2');
      mgr2.cleanup('test-dedup-2');

      expect(result2).not.toBeNull();
      expect(result2!.isDuplicate).toBe(true);
    });

    test('different changes are not marked as duplicates', () => {
      const repo = createTestRepo();
      repos.push(repo);

      const mgr1 = new WorktreeManager(repo);
      const wt1 = mgr1.create('test-unique-1');
      fs.writeFileSync(path.join(wt1, 'file-a.txt'), 'content A\n');
      const result1 = mgr1.harvest('test-unique-1');
      mgr1.cleanup('test-unique-1');

      const mgr2 = new WorktreeManager(repo);
      const wt2 = mgr2.create('test-unique-2');
      fs.writeFileSync(path.join(wt2, 'file-b.txt'), 'content B\n');
      const result2 = mgr2.harvest('test-unique-2');
      mgr2.cleanup('test-unique-2');

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1!.isDuplicate).toBe(false);
      expect(result2!.isDuplicate).toBe(false);
    });

  });

});
