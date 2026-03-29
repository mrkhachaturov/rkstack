import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface LangInfo {
  files: number;
  code: number;
  complexity: number;
}

export interface DetectionResult {
  projectType: string;
  langs: Record<string, LangInfo>;
  tools: Record<string, boolean>;
  services: Record<string, boolean>;
  repoMode: string;
  totalFiles: number;
  totalCode: number;
  detectedAt: string;
}

const LANG_MAP: Record<string, string | null> = {
  'TypeScript': 'ts',
  'JavaScript': 'js',
  'Python': 'py',
  'Go': 'go',
  'Rust': 'rs',
  'Java': 'java',
  'C#': 'cs',
  'Ruby': 'rb',
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
  'HCL': 'hcl',
  'Terraform': 'hcl',
  'Markdown': null,
  'JSON': null,
  'YAML': null,
  'TOML': null,
  'XML': null,
  'License': null,
  'Plain Text': null,
  'Go Template': null,
  'gitignore': null,
  'Docker ignore': null,
};

export function parseSccOutput(output: string): Pick<DetectionResult, 'langs' | 'totalFiles' | 'totalCode'> {
  const langs: Record<string, LangInfo> = {};
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

    if (langs[key]) {
      langs[key].files += files;
      langs[key].code += code;
      langs[key].complexity += complexity;
    } else {
      langs[key] = { files, code, complexity };
    }
  }

  return { langs, totalFiles, totalCode };
}

/** Classify project type from parsed language data. */
export function classifyProjectType(
  langs: Record<string, LangInfo>,
  hasWebConfig: boolean,
): string {
  const hasTs = 'ts' in langs;
  const hasJs = 'js' in langs;
  const hasCss = 'css' in langs || 'html' in langs;
  const hasPy = 'py' in langs;
  const hasGo = 'go' in langs;
  const hasHcl = 'hcl' in langs;
  const hasShell = 'shell' in langs;

  if (hasTs || hasJs) {
    return (hasCss || hasWebConfig) ? 'web' : 'node';
  }
  if (hasPy) return 'python';
  if (hasGo) return 'go';
  if (hasHcl) return 'infra';
  if (hasShell) return 'devops';
  return 'general';
}

/** Detect tooling by checking for marker files. */
export function detectTools(fileExists: (path: string) => boolean): Record<string, boolean> {
  return {
    docker: fileExists('Dockerfile'),
    terraform: fileExists('main.tf') || fileExists('terraform'),
    ansible: fileExists('ansible') || fileExists('ansible.cfg'),
    compose: fileExists('docker-compose.yml') || fileExists('docker-compose.yaml') ||
             fileExists('compose.yml') || fileExists('compose.yaml'),
    just: fileExists('justfile') || fileExists('Justfile'),
    mise: fileExists('.mise.toml') || fileExists('mise.toml'),
  };
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

export function getEffectiveProjectType(projectRoot: string): string {
  const settingsFile = join(projectRoot, SETTINGS_PATH);
  try {
    const content = JSON.parse(readFileSync(settingsFile, 'utf8'));
    return content.overrides?.projectType ?? content.detection?.projectType ?? 'general';
  } catch {
    return 'general';
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
  const langSummary = Object.entries(d.langs)
    .sort(([, a], [, b]) => b.code - a.code)
    .map(([k, v]) => `${k}(${v.files} files, ${v.code >= 1000 ? (v.code / 1000).toFixed(1) + 'k' : v.code} loc)`)
    .join(' ');
  const total = d.totalCode >= 1000 ? (d.totalCode / 1000).toFixed(1) + 'k' : String(d.totalCode);
  console.log(`PROJECT_TYPE=${d.projectType}`);
  console.log(`REPO_MODE=${d.repoMode}`);
  if (d.services.supabase) console.log('HAS_SUPABASE=yes');
  console.log(`STACK: ${langSummary} | ${total} total`);
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
  const { langs, totalFiles, totalCode } = parseSccOutput(sccOutput);

  const fe = (p: string) => existsSync(join(projectRoot, p));
  const fc = (p: string, pattern: string) => {
    try { return readFileSync(join(projectRoot, p), 'utf8').toLowerCase().includes(pattern.toLowerCase()); }
    catch { return false; }
  };

  const tools = detectTools(fe);
  const services = detectServices(fe, fc);
  const webConfig = hasWebFrameworkConfig(fe);
  const projectType = classifyProjectType(langs, webConfig);
  const repoMode = detectRepoMode();

  const detection: DetectionResult = {
    projectType,
    langs,
    tools,
    services,
    repoMode,
    totalFiles,
    totalCode,
    detectedAt: new Date().toISOString(),
  };

  writeDetectionCache(projectRoot, detection);
  printSummary(detection);
}
