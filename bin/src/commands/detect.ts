import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface StackStats {
  files: number;
  code: number;
  complexity: number;
}

export interface DetectionResult {
  flowType: 'web' | 'default';
  stack: Record<string, boolean>;
  stats: Record<string, StackStats>;
  services: Record<string, boolean>;
  repoMode: string;
  totalFiles: number;
  totalCode: number;
  detectedAt: string;
}

/** Map SCC language names to stack keys. Returns null for non-code languages to skip. */
const LANG_MAP: Record<string, string | null> = {
  'TypeScript': 'typescript',
  'JavaScript': 'javascript',
  'Python': 'python',
  'Go': 'go',
  'Rust': 'rust',
  'Java': 'java',
  'C#': 'csharp',
  'Ruby': 'ruby',
  'Shell': 'shell',
  'BASH': 'shell',
  'C': 'c',
  'C++': 'cpp',
  'C Header': 'c',
  'C++ Header': 'cpp',
  'CSS': 'css',
  'SCSS': 'css',
  'SASS': 'css',
  'HTML': 'html',
  'HCL': 'terraform',
  'Terraform': 'terraform',
  'YAML': 'yaml',
  'Markdown': null,
  'JSON': null,
  'TOML': null,
  'XML': null,
  'License': null,
  'Plain Text': null,
  'Go Template': null,
  'gitignore': null,
  'Docker ignore': null,
};

/** Parse SCC wide-format output into stack stats. */
export function parseSccOutput(output: string): { stats: Record<string, StackStats>; totalFiles: number; totalCode: number } {
  const stats: Record<string, StackStats> = {};
  let totalFiles = 0;
  let totalCode = 0;

  for (const line of output.split('\n')) {
    if (line.startsWith('─') || line.includes('Language') || !line.trim()) continue;

    const match = line.match(/^(.+?)\s{2,}(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (!match) continue;

    const [, rawName, filesStr, , , , codeStr, complexityStr] = match;
    const name = rawName.trim();
    const files = parseInt(filesStr, 10);
    const code = parseInt(codeStr, 10);
    const complexity = parseInt(complexityStr, 10);

    if (name === 'Total') {
      totalFiles = files;
      totalCode = code;
      continue;
    }

    const key = LANG_MAP[name];
    if (key === null || key === undefined) continue;

    if (stats[key]) {
      stats[key].files += files;
      stats[key].code += code;
      stats[key].complexity += complexity;
    } else {
      stats[key] = { files, code, complexity };
    }
  }

  return { stats, totalFiles, totalCode };
}

/** Determine flow type: web or default. */
export function classifyFlowType(
  stack: Record<string, boolean>,
  hasWebConfig: boolean,
): 'web' | 'default' {
  const hasTs = stack.typescript;
  const hasJs = stack.javascript;
  const hasCss = stack.css;
  return (hasTs || hasJs) && (hasCss || hasWebConfig) ? 'web' : 'default';
}

/** Detect stack items from filesystem (things SCC doesn't detect). */
export function detectFileStack(fileExists: (path: string) => boolean): Record<string, boolean> {
  const stack: Record<string, boolean> = {};
  if (fileExists('Dockerfile')) stack.docker = true;
  if (fileExists('docker-compose.yml') || fileExists('docker-compose.yaml') ||
      fileExists('compose.yml') || fileExists('compose.yaml')) stack.compose = true;
  if (fileExists('ansible') || fileExists('ansible.cfg')) stack.ansible = true;
  if (fileExists('justfile') || fileExists('Justfile')) stack.just = true;
  if (fileExists('.mise.toml') || fileExists('mise.toml')) stack.mise = true;
  return stack;
}

/** Detect services (Supabase, etc.). */
export function detectServices(
  fileExists: (path: string) => boolean,
  fileContains: (path: string, pattern: string) => boolean,
): Record<string, boolean> {
  const supabase = fileExists('supabase') ||
    (fileExists('.mcp.json') && fileContains('.mcp.json', 'supabase'));
  return { supabase };
}

/** Check for web framework config files. */
export function hasWebFrameworkConfig(fileExists: (path: string) => boolean): boolean {
  const configs = [
    'next.config.js', 'next.config.ts', 'next.config.mjs',
    'vite.config.js', 'vite.config.ts', 'vite.config.mjs',
    'nuxt.config.js', 'nuxt.config.ts',
    'svelte.config.js', 'svelte.config.ts',
    'angular.json',
  ];
  return configs.some(f => fileExists(f));
}

const SETTINGS_PATH = '.rkstack/settings.json';

export function writeDetectionCache(projectRoot: string, detection: DetectionResult): void {
  const settingsFile = join(projectRoot, SETTINGS_PATH);
  const rkstackDir = join(projectRoot, '.rkstack');

  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(readFileSync(settingsFile, 'utf8'));
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  mkdirSync(rkstackDir, { recursive: true });
  const merged = { ...existing, detection };
  writeFileSync(settingsFile, JSON.stringify(merged, null, 2) + '\n', 'utf8');
}

export function readDetectionCache(projectRoot: string): DetectionResult | null {
  const settingsFile = join(projectRoot, SETTINGS_PATH);
  try {
    const content = JSON.parse(readFileSync(settingsFile, 'utf8'));
    return content.detection ?? null;
  } catch {
    return null;
  }
}

export function getEffectiveFlowType(projectRoot: string): 'web' | 'default' {
  const settingsFile = join(projectRoot, SETTINGS_PATH);
  try {
    const content = JSON.parse(readFileSync(settingsFile, 'utf8'));
    return content.overrides?.flowType ?? content.detection?.flowType ?? 'default';
  } catch {
    return 'default';
  }
}

function runScc(): string {
  const r = spawnSync('scc', ['--format', 'wide', '--no-cocomo', '--exclude-dir', 'node_modules,.git,vendor,3rdparty-src', '.'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.status !== 0) {
    if (r.error || (r.stderr && r.stderr.includes('not found'))) {
      process.stderr.write('scc not found. Install via: mise install, or brew install scc\n');
      process.exit(1);
    }
    process.stderr.write(`scc exited with status ${r.status}: ${r.stderr || 'no output'}\n`);
    return '';
  }
  return r.stdout;
}

function detectRepoMode(): string {
  const r = spawnSync('git', ['shortlog', '-sn', '--no-merges', '--since=90 days ago'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (r.status !== 0 || !r.stdout.trim()) return 'solo';
  return r.stdout.trim().split('\n').length >= 2 ? 'collaborative' : 'solo';
}

function printSummary(d: DetectionResult): void {
  const stackItems = Object.keys(d.stack).sort().join(', ');
  const statsSummary = Object.entries(d.stats)
    .sort(([, a], [, b]) => b.code - a.code)
    .map(([k, v]) => `${k}(${v.files}, ${v.code >= 1000 ? (v.code / 1000).toFixed(1) + 'k' : v.code})`)
    .join(' ');
  console.log(`FLOW_TYPE=${d.flowType}`);
  console.log(`REPO_MODE=${d.repoMode}`);
  console.log(`STACK: ${stackItems}`);
  if (d.services.supabase) console.log('HAS_SUPABASE=yes');
  if (statsSummary) console.log(`STATS: ${statsSummary} | ${d.totalCode >= 1000 ? (d.totalCode / 1000).toFixed(1) + 'k' : d.totalCode} total`);
}

export function run(args: string[]): void {
  const projectRoot = process.cwd();

  if (args.includes('--cached')) {
    const cached = readDetectionCache(projectRoot);
    if (cached) {
      printSummary(cached);
    } else {
      process.stderr.write('No detection cache found. Run rkstack detect first.\n');
      process.exit(1);
    }
    return;
  }

  const sccOutput = runScc();
  const { stats, totalFiles, totalCode } = parseSccOutput(sccOutput);

  // Build stack: SCC-detected languages + filesystem-detected items
  const stack: Record<string, boolean> = {};
  for (const key of Object.keys(stats)) {
    stack[key] = true;
  }

  const fe = (p: string) => existsSync(join(projectRoot, p));
  const fc = (p: string, pattern: string) => {
    try { return readFileSync(join(projectRoot, p), 'utf8').toLowerCase().includes(pattern.toLowerCase()); }
    catch { return false; }
  };

  const fileStack = detectFileStack(fe);
  Object.assign(stack, fileStack);

  const services = detectServices(fe, fc);
  const webConfig = hasWebFrameworkConfig(fe);
  const flowType = classifyFlowType(stack, webConfig);
  const repoMode = detectRepoMode();

  const detection: DetectionResult = {
    flowType,
    stack,
    stats,
    services,
    repoMode,
    totalFiles,
    totalCode,
    detectedAt: new Date().toISOString(),
  };

  writeDetectionCache(projectRoot, detection);
  printSummary(detection);
}
