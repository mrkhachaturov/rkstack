import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { parseSccOutput, classifyProjectType, detectTools, detectServices, hasWebFrameworkConfig, writeDetectionCache, readDetectionCache, type LangInfo, type DetectionResult } from '../bin/src/commands/detect';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const SAMPLE_SCC = `─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Language                              Files     Lines   Blanks  Comments     Code Complexity Complexity/Lines
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Markdown                                 85     33243     8475         0    24768          0             0.00
TypeScript                               44     11503     1495      1139     8869       1093           625.49
Go Template                              42     11040     3020         0     8020          0             0.00
HTML                                     16       828       64         4      760          0             0.00
JSON                                     14       186        0         0      186          0             0.00
Shell                                    14       738      115       144      479        146           437.40
YAML                                      3       264       46        10      208          0             0.00
JavaScript                                2       442       70        20      352         70            44.60
BASH                                      1       212       17        39      156         60            38.46
License                                   1        21        4         0       17          0             0.00
Plain Text                                1         3        0         0        3          0             0.00
TOML                                      1         4        0         0        4          0             0.00
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Total                                   224     58484    13306      1356    43822       1369          1145.95
─────────────────────────────────────────────────────────────────────────────────────────────────────────────`;

describe('parseSccOutput', () => {
  test('parses language rows into structured data', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect(result.langs.ts).toEqual({ files: 44, code: 8869, complexity: 1093 });
    expect(result.langs.js).toEqual({ files: 2, code: 352, complexity: 70 });
    expect(result.langs.shell).toEqual({ files: 15, code: 635, complexity: 206 });
  });

  test('maps language names to short keys', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect('ts' in result.langs).toBe(true);
    expect('js' in result.langs).toBe(true);
    expect('shell' in result.langs).toBe(true);
    expect('TypeScript' in result.langs).toBe(false);
  });

  test('extracts totalFiles and totalCode from Total row', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect(result.totalFiles).toBe(224);
    expect(result.totalCode).toBe(43822);
  });

  test('handles empty SCC output', () => {
    const result = parseSccOutput('scc not available');
    expect(Object.keys(result.langs)).toHaveLength(0);
    expect(result.totalFiles).toBe(0);
    expect(result.totalCode).toBe(0);
  });

  test('ignores non-code languages (Markdown, JSON, License, Plain Text, TOML)', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect('markdown' in result.langs).toBe(false);
    expect('json' in result.langs).toBe(false);
    expect('license' in result.langs).toBe(false);
  });
});

describe('classifyProjectType', () => {
  test('TS + CSS = web', () => {
    const langs = { ts: { files: 10, code: 1000, complexity: 50 }, css: { files: 3, code: 200, complexity: 0 } };
    expect(classifyProjectType(langs, false)).toBe('web');
  });

  test('TS + web config = web', () => {
    const langs = { ts: { files: 10, code: 1000, complexity: 50 } };
    expect(classifyProjectType(langs, true)).toBe('web');
  });

  test('TS only = node', () => {
    const langs = { ts: { files: 10, code: 1000, complexity: 50 } };
    expect(classifyProjectType(langs, false)).toBe('node');
  });

  test('JS only = node', () => {
    const langs = { js: { files: 5, code: 500, complexity: 20 } };
    expect(classifyProjectType(langs, false)).toBe('node');
  });

  test('Python = python', () => {
    const langs = { py: { files: 10, code: 2000, complexity: 100 } };
    expect(classifyProjectType(langs, false)).toBe('python');
  });

  test('Go = go', () => {
    const langs = { go: { files: 5, code: 1000, complexity: 50 } };
    expect(classifyProjectType(langs, false)).toBe('go');
  });

  test('HCL = infra', () => {
    const langs = { hcl: { files: 10, code: 500, complexity: 0 } };
    expect(classifyProjectType(langs, false)).toBe('infra');
  });

  test('Shell only = devops', () => {
    const langs = { shell: { files: 5, code: 200, complexity: 30 } };
    expect(classifyProjectType(langs, false)).toBe('devops');
  });

  test('empty = general', () => {
    expect(classifyProjectType({}, false)).toBe('general');
  });
});

describe('detectTools', () => {
  test('detects docker when Dockerfile exists', () => {
    const tools = detectTools((p) => p === 'Dockerfile');
    expect(tools.docker).toBe(true);
    expect(tools.terraform).toBe(false);
  });

  test('detects compose variants', () => {
    const tools = detectTools((p) => p === 'compose.yaml');
    expect(tools.compose).toBe(true);
  });

  test('detects just and mise', () => {
    const tools = detectTools((p) => p === 'justfile' || p === '.mise.toml');
    expect(tools.just).toBe(true);
    expect(tools.mise).toBe(true);
  });
});

describe('detectServices', () => {
  test('detects supabase directory', () => {
    const services = detectServices((p) => p === 'supabase', () => false);
    expect(services.supabase).toBe(true);
  });

  test('detects supabase in .mcp.json', () => {
    const services = detectServices(
      (p) => p === '.mcp.json',
      (p, pattern) => p === '.mcp.json' && pattern === 'supabase',
    );
    expect(services.supabase).toBe(true);
  });

  test('no supabase when nothing matches', () => {
    const services = detectServices(() => false, () => false);
    expect(services.supabase).toBe(false);
  });
});

describe('hasWebFrameworkConfig', () => {
  test('detects next.config.ts', () => {
    expect(hasWebFrameworkConfig((p) => p === 'next.config.ts')).toBe(true);
  });

  test('detects vite.config.js', () => {
    expect(hasWebFrameworkConfig((p) => p === 'vite.config.js')).toBe(true);
  });

  test('no web config when nothing matches', () => {
    expect(hasWebFrameworkConfig(() => false)).toBe(false);
  });
});

describe('detection cache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rkstack-detect-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('writeDetectionCache creates .rkstack/settings.json', () => {
    const detection: DetectionResult = {
      projectType: 'node',
      langs: { ts: { files: 10, code: 1000, complexity: 50 } },
      tools: { docker: false, terraform: false, ansible: false, compose: false, just: true, mise: true },
      services: { supabase: false },
      repoMode: 'solo',
      totalFiles: 10,
      totalCode: 1000,
      detectedAt: '2026-03-29T19:00:00Z',
    };
    writeDetectionCache(tmpDir, detection);
    const settingsPath = path.join(tmpDir, '.rkstack', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    expect(content.detection.projectType).toBe('node');
  });

  test('writeDetectionCache preserves existing meta and overrides', () => {
    const rkstackDir = path.join(tmpDir, '.rkstack');
    fs.mkdirSync(rkstackDir, { recursive: true });
    fs.writeFileSync(path.join(rkstackDir, 'settings.json'), JSON.stringify({
      meta: { setupVersion: '0.7.0', guards: ['baseline'] },
      overrides: { projectType: 'infra' },
    }));

    const detection: DetectionResult = {
      projectType: 'web',
      langs: { ts: { files: 10, code: 1000, complexity: 50 } },
      tools: { docker: false, terraform: false, ansible: false, compose: false, just: true, mise: true },
      services: { supabase: false },
      repoMode: 'solo',
      totalFiles: 10,
      totalCode: 1000,
      detectedAt: '2026-03-29T19:00:00Z',
    };
    writeDetectionCache(tmpDir, detection);
    const content = JSON.parse(fs.readFileSync(path.join(rkstackDir, 'settings.json'), 'utf8'));
    expect(content.detection.projectType).toBe('web');
    expect(content.meta.setupVersion).toBe('0.7.0');
    expect(content.overrides.projectType).toBe('infra');
  });

  test('readDetectionCache returns null if file missing', () => {
    expect(readDetectionCache(tmpDir)).toBeNull();
  });

  test('readDetectionCache returns detection section', () => {
    const rkstackDir = path.join(tmpDir, '.rkstack');
    fs.mkdirSync(rkstackDir, { recursive: true });
    fs.writeFileSync(path.join(rkstackDir, 'settings.json'), JSON.stringify({
      detection: { projectType: 'web', langs: {}, tools: {}, services: {}, repoMode: 'solo', totalFiles: 0, totalCode: 0, detectedAt: '' },
    }));
    const result = readDetectionCache(tmpDir);
    expect(result?.projectType).toBe('web');
  });
});
