import { join } from 'path';
import { run as runVersion } from './commands/version.ts';
import { run as runSlug } from './commands/slug.ts';
import { run as runConfig, configGet } from './commands/config.ts';
import { run as runRepoMode } from './commands/repo-mode.ts';
import { run as runDetect } from './commands/detect.ts';

/** Resolve the data directory. Requires CLAUDE_PLUGIN_DATA (set by Claude Code). */
function resolveDataDir(): string {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) {
    process.stderr.write('Error: CLAUDE_PLUGIN_DATA is not set. The rkstack binary must be run from within Claude Code.\n');
    process.exit(1);
  }
  return dataDir;
}

/** Resolve the path to config.json. */
export function resolveConfigPath(): string {
  return join(resolveDataDir(), 'config.json');
}

/** Resolve the path to the cache directory. */
export function resolveCacheDir(): string {
  return join(resolveDataDir(), 'cache');
}

function printUsage(): void {
  process.stderr.write(
    'Usage: rkstack <command> [args]\n\n' +
    'Commands:\n' +
    '  slug [--branch|--full]         Filesystem-safe project/branch slug\n' +
    '  repo-mode                      Detect solo or collaborative repo\n' +
    '  config get <key>               Read a config value\n' +
    '  config set <key> <value>       Write a config value\n' +
    '  config list                    Show all config values\n' +
    '  detect [--cached]              Detect project stack, write cache\n' +
    '  version                        Print rkstack version\n'
  );
}

function main(): void {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  switch (command) {
    case 'version':
      runVersion();
      break;
    case 'slug':
      runSlug(rest);
      break;
    case 'config':
      runConfig(rest, resolveConfigPath());
      break;
    case 'detect':
      runDetect(rest);
      break;
    case 'repo-mode': {
      const override = configGet(resolveConfigPath(), 'repo_mode_override') || undefined;
      runRepoMode(resolveCacheDir(), override);
      break;
    }
    default:
      printUsage();
      process.exit(1);
  }
}

if (import.meta.main) main();
