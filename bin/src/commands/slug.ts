import { spawnSync } from 'child_process';
import { basename } from 'path';

/** Extract the repository name from a git remote URL. Returns null fallback to cwd. */
export function extractRepoName(remoteUrl: string | null): string {
  if (!remoteUrl) return basename(process.cwd());
  // Handle both https://.../.../repo.git and git@host:user/repo.git
  const parts = remoteUrl.replace(/\.git$/, '').split(/[/:]/);
  return parts[parts.length - 1] || basename(process.cwd());
}

/** Convert any string to a filesystem-safe slug: lowercase, hyphens only, no leading/trailing hyphens. */
export function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function gitRemoteUrl(): string | null {
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return r.status === 0 ? r.stdout.trim() : null;
}

function gitBranchName(): string {
  const branch = spawnSync('git', ['branch', '--show-current'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (branch.status === 0 && branch.stdout.trim()) return branch.stdout.trim();
  // Detached HEAD
  const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return sha.status === 0 ? `detached-${sha.stdout.trim()}` : 'unknown';
}

export function projectSlug(): string {
  return toSlug(extractRepoName(gitRemoteUrl()));
}

export function branchSlug(): string {
  return toSlug(gitBranchName());
}

export function run(args: string[]): void {
  if (args.includes('--full')) {
    console.log(projectSlug());
    console.log(branchSlug());
  } else if (args.includes('--branch')) {
    console.log(branchSlug());
  } else {
    console.log(projectSlug());
  }
}
