#!/usr/bin/env bun
/**
 * upstream-check — show what's new in upstream submodules
 *
 * Usage:
 *   bun scripts/upstream-check.ts              # summary of all upstreams
 *   bun scripts/upstream-check.ts gstack       # commits + diffstat for gstack
 *   bun scripts/upstream-check.ts gstack --diff '*.tmpl'  # filtered diff
 *   bun scripts/upstream-check.ts gstack --diff resolvers/  # diff a directory
 */
import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const UPSTREAMS_DIR = path.join(ROOT, '.upstreams');

const SUBMODULES: Record<string, { repo: string; relevantPaths: string[] }> = {
  gstack: {
    repo: '.upstreams/gstack',
    relevantPaths: [
      '*.tmpl',
      'scripts/resolvers/',
      'scripts/gen-skill-docs.ts',
      'scripts/discover-skills.ts',
      'CLAUDE.md',
      'ETHOS.md',
      'lib/',
      'review/checklist.md',
    ],
  },
  superpowers: {
    repo: '.upstreams/superpowers',
    relevantPaths: ['skills/', 'CLAUDE.md'],
  },
  'claude-code-docs': {
    repo: '.upstreams/claude-code-docs',
    relevantPaths: ['docs/'],
  },
};

function run(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd: cwd ?? ROOT, encoding: 'utf-8', timeout: 60_000 }).trim();
  } catch {
    return '';
  }
}

function ensureInitialized(subDir: string): boolean {
  const fullPath = path.join(ROOT, subDir);
  // Check if submodule has content
  const status = run(`git submodule status ${subDir}`);
  if (status.startsWith('-')) {
    console.log(`  Initializing ${subDir}...`);
    run(`git submodule update --init ${subDir}`);
    // Check again
    const after = run(`git submodule status ${subDir}`);
    if (after.startsWith('-')) {
      console.log(`  Failed to initialize ${subDir}`);
      return false;
    }
  }
  return true;
}

function getDefaultBranch(cwd: string): string {
  // Check what origin/HEAD points to, fallback to main
  const ref = run('git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null', cwd);
  if (ref) return ref.replace('refs/remotes/origin/', '');
  // Fallback: check if origin/main exists
  const mainExists = run('git rev-parse --verify origin/main 2>/dev/null', cwd);
  if (mainExists) return 'main';
  return 'master';
}

function showSummary() {
  console.log('Upstream Status');
  console.log('═'.repeat(60));
  console.log();

  for (const [name, config] of Object.entries(SUBMODULES)) {
    if (!ensureInitialized(config.repo)) {
      console.log(`${name}: not initialized\n`);
      continue;
    }

    const cwd = path.join(ROOT, config.repo);
    run('git fetch origin', cwd);
    const branch = getDefaultBranch(cwd);

    const pinned = run('git log --oneline -1 HEAD', cwd);
    const latest = run(`git log --oneline -1 origin/${branch}`, cwd);
    const newCommits = run(`git log --oneline HEAD..origin/${branch}`, cwd);
    const count = newCommits ? newCommits.split('\n').length : 0;

    console.log(`${name} (${count} new commits)`);
    console.log(`  pinned:  ${pinned}`);
    console.log(`  latest:  ${latest}`);

    if (count > 0) {
      console.log(`  commits:`);
      for (const line of newCommits.split('\n').slice(0, 10)) {
        console.log(`    ${line}`);
      }
      if (count > 10) console.log(`    ... and ${count - 10} more`);

      // Show relevant file changes
      const stat = run(`git diff --stat HEAD..origin/${branch}`, cwd);
      const statLines = stat.split('\n');
      const relevant = statLines.filter((line) =>
        config.relevantPaths.some((p) => {
          const file = line.split('|')[0]?.trim();
          if (!file) return false;
          if (p.endsWith('/')) return file.startsWith(p);
          if (p.startsWith('*')) return file.endsWith(p.slice(1));
          return file === p;
        }),
      );

      if (relevant.length > 0) {
        console.log(`  relevant changes:`);
        for (const line of relevant) {
          console.log(`    ${line}`);
        }
      }
    }
    console.log();
  }
}

function showUpstream(name: string, diffFilter?: string) {
  const config = SUBMODULES[name];
  if (!config) {
    console.error(`Unknown upstream: ${name}. Available: ${Object.keys(SUBMODULES).join(', ')}`);
    process.exit(1);
  }

  if (!ensureInitialized(config.repo)) {
    console.error(`Failed to initialize ${config.repo}`);
    process.exit(1);
  }

  const cwd = path.join(ROOT, config.repo);
  run('git fetch origin', cwd);
  const branch = getDefaultBranch(cwd);

  const newCommits = run(`git log --oneline HEAD..origin/${branch}`, cwd);
  const count = newCommits ? newCommits.split('\n').length : 0;

  if (count === 0) {
    console.log(`${name}: already at latest`);
    return;
  }

  console.log(`${name}: ${count} new commits`);
  console.log();

  // Full commit list
  console.log('Commits:');
  for (const line of newCommits.split('\n')) {
    console.log(`  ${line}`);
  }
  console.log();

  if (diffFilter) {
    // Show filtered diff
    console.log(`Diff (filter: ${diffFilter}):`);
    console.log('─'.repeat(60));
    const diff = run(`git diff HEAD..origin/${branch} -- '${diffFilter}'`, cwd);
    if (diff) {
      console.log(diff);
    } else {
      console.log('(no changes matching filter)');
    }
  } else {
    // Show diffstat
    console.log('Changed files:');
    const stat = run(`git diff --stat HEAD..origin/${branch}`, cwd);
    console.log(stat);
  }
}

// Parse args
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  if (args[0] === '--help') {
    console.log(`Usage:
  bun scripts/upstream-check.ts              # summary of all upstreams
  bun scripts/upstream-check.ts <name>       # commits + diffstat for one upstream
  bun scripts/upstream-check.ts <name> --diff <filter>  # filtered diff

Upstreams: ${Object.keys(SUBMODULES).join(', ')}

Examples:
  bun scripts/upstream-check.ts gstack
  bun scripts/upstream-check.ts gstack --diff '*.tmpl'
  bun scripts/upstream-check.ts gstack --diff 'scripts/resolvers/'
  bun scripts/upstream-check.ts gstack --diff 'ETHOS.md'`);
    process.exit(0);
  }
  showSummary();
} else {
  const name = args[0];
  const diffIdx = args.indexOf('--diff');
  const diffFilter = diffIdx >= 0 ? args[diffIdx + 1] : undefined;
  showUpstream(name, diffFilter);
}
