import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';

type RepoMode = 'solo' | 'collaborative';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  result: RepoMode;
  timestamp: number;
}

export interface RepoModeOptions {
  /** Directory for cache files (typically ${CLAUDE_PLUGIN_DATA}/cache) */
  cacheDir: string;
  /** Injectable: returns author count for the past 90 days. Defaults to real git shortlog. */
  getAuthorCount?: () => number;
  /** If set, skip detection entirely and return this value. */
  override?: RepoMode;
  /** Injectable: returns the repo root path. Defaults to git rev-parse --show-toplevel. */
  repoRoot?: string;
}

/** Exported so tests can compute the same cache filename. */
export function cacheFileName(repoRoot: string): string {
  const hash = createHash('sha256').update(repoRoot).digest('hex').slice(0, 8);
  return `repo-mode-${hash}.json`;
}

function getRepoRoot(): string {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return r.status === 0 ? r.stdout.trim() : process.cwd();
}

function readCache(cacheDir: string, repoRoot: string): RepoMode | null {
  const filePath = join(cacheDir, cacheFileName(repoRoot));
  if (!existsSync(filePath)) return null;
  try {
    const entry = JSON.parse(readFileSync(filePath, 'utf8')) as CacheEntry;
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.result;
  } catch {
    // Corrupt cache — ignore
  }
  return null;
}

function writeCache(cacheDir: string, repoRoot: string, result: RepoMode): void {
  mkdirSync(cacheDir, { recursive: true });
  const entry: CacheEntry = { result, timestamp: Date.now() };
  writeFileSync(join(cacheDir, cacheFileName(repoRoot)), JSON.stringify(entry), 'utf8');
}

function gitAuthorCount(): number {
  const r = spawnSync(
    'git',
    ['shortlog', '-sn', '--no-merges', '--since=90 days ago'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  if (r.status !== 0 || !r.stdout.trim()) return 0;
  return r.stdout.trim().split('\n').length;
}

export function detectRepoMode(options: RepoModeOptions): RepoMode {
  if (options.override) return options.override;

  const repoRoot = options.repoRoot ?? getRepoRoot();
  const cached = readCache(options.cacheDir, repoRoot);
  if (cached) return cached;

  const count = options.getAuthorCount ? options.getAuthorCount() : gitAuthorCount();
  const result: RepoMode = count >= 2 ? 'collaborative' : 'solo';
  writeCache(options.cacheDir, repoRoot, result);
  return result;
}

export function run(cacheDir: string, override?: string): void {
  const result = detectRepoMode({
    cacheDir,
    override: override === 'solo' || override === 'collaborative' ? override : undefined,
  });
  console.log(result);
}
