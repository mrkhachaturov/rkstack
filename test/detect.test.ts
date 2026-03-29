import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { parseSccOutput, classifyFlowType, detectFileStack, detectServices, hasWebFrameworkConfig, writeDetectionCache, readDetectionCache, getEffectiveFlowType, type StackStats, type DetectionResult } from '../bin/src/commands/detect';
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
    expect(result.stats.typescript).toEqual({ files: 44, code: 8869, complexity: 1093 });
    expect(result.stats.javascript).toEqual({ files: 2, code: 352, complexity: 70 });
    expect(result.stats.shell).toEqual({ files: 15, code: 635, complexity: 206 });
  });

  test('maps language names to stack keys', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect('typescript' in result.stats).toBe(true);
    expect('javascript' in result.stats).toBe(true);
    expect('shell' in result.stats).toBe(true);
    expect('TypeScript' in result.stats).toBe(false);
  });

  test('extracts totalFiles and totalCode from Total row', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect(result.totalFiles).toBe(224);
    expect(result.totalCode).toBe(43822);
  });

  test('handles empty SCC output', () => {
    const result = parseSccOutput('scc not available');
    expect(Object.keys(result.stats)).toHaveLength(0);
    expect(result.totalFiles).toBe(0);
    expect(result.totalCode).toBe(0);
  });

  test('ignores non-code languages (Markdown, JSON, License, Plain Text, TOML)', () => {
    const result = parseSccOutput(SAMPLE_SCC);
    expect('markdown' in result.stats).toBe(false);
    expect('json' in result.stats).toBe(false);
    expect('license' in result.stats).toBe(false);
  });

  test('maps HCL/Terraform to terraform key', () => {
    const tfOutput = `─────
Language  Files Lines Blanks Comments Code Complexity Complexity/Lines
─────
HCL          10   500     50       10  400         0             0.00
─────
Total        10   500     50       10  400         0             0.00
─────`;
    const result = parseSccOutput(tfOutput);
    expect('terraform' in result.stats).toBe(true);
  });
});

describe('classifyFlowType', () => {
  test('TS + CSS = web', () => {
    const stack = { typescript: true, css: true };
    expect(classifyFlowType(stack, false)).toBe('web');
  });

  test('TS + web config = web', () => {
    const stack = { typescript: true };
    expect(classifyFlowType(stack, true)).toBe('web');
  });

  test('TS + HTML only (no CSS) = default', () => {
    const stack = { typescript: true, html: true };
    expect(classifyFlowType(stack, false)).toBe('default');
  });

  test('TS only = default', () => {
    const stack = { typescript: true };
    expect(classifyFlowType(stack, false)).toBe('default');
  });

  test('JS + CSS = web', () => {
    const stack = { javascript: true, css: true };
    expect(classifyFlowType(stack, false)).toBe('web');
  });

  test('Python only = default', () => {
    const stack = { python: true };
    expect(classifyFlowType(stack, false)).toBe('default');
  });

  test('empty = default', () => {
    expect(classifyFlowType({}, false)).toBe('default');
  });
});

describe('detectFileStack', () => {
  test('detects docker when Dockerfile exists', () => {
    const stack = detectFileStack((p) => p === 'Dockerfile');
    expect(stack.docker).toBe(true);
    expect(stack.ansible).toBeUndefined();
  });

  test('detects compose variants', () => {
    const stack = detectFileStack((p) => p === 'compose.yaml');
    expect(stack.compose).toBe(true);
  });

  test('detects just and mise', () => {
    const stack = detectFileStack((p) => p === 'justfile' || p === '.mise.toml');
    expect(stack.just).toBe(true);
    expect(stack.mise).toBe(true);
  });

  test('returns empty when nothing matches', () => {
    const stack = detectFileStack(() => false);
    expect(Object.keys(stack)).toHaveLength(0);
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
      flowType: 'default',
      stack: { typescript: true, shell: true },
      stats: { typescript: { files: 10, code: 1000, complexity: 50 } },
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
    expect(content.detection.flowType).toBe('default');
    expect(content.detection.stack.typescript).toBe(true);
  });

  test('writeDetectionCache preserves existing meta and overrides', () => {
    const rkstackDir = path.join(tmpDir, '.rkstack');
    fs.mkdirSync(rkstackDir, { recursive: true });
    fs.writeFileSync(path.join(rkstackDir, 'settings.json'), JSON.stringify({
      meta: { setupVersion: '0.7.0', guards: ['baseline'] },
      overrides: { flowType: 'web' },
    }));

    const detection: DetectionResult = {
      flowType: 'default',
      stack: { typescript: true },
      stats: { typescript: { files: 10, code: 1000, complexity: 50 } },
      services: { supabase: false },
      repoMode: 'solo',
      totalFiles: 10,
      totalCode: 1000,
      detectedAt: '2026-03-29T19:00:00Z',
    };
    writeDetectionCache(tmpDir, detection);
    const content = JSON.parse(fs.readFileSync(path.join(rkstackDir, 'settings.json'), 'utf8'));
    expect(content.detection.flowType).toBe('default');
    expect(content.meta.setupVersion).toBe('0.7.0');
    expect(content.overrides.flowType).toBe('web');
  });

  test('readDetectionCache returns null if file missing', () => {
    expect(readDetectionCache(tmpDir)).toBeNull();
  });

  test('readDetectionCache returns detection section', () => {
    const rkstackDir = path.join(tmpDir, '.rkstack');
    fs.mkdirSync(rkstackDir, { recursive: true });
    fs.writeFileSync(path.join(rkstackDir, 'settings.json'), JSON.stringify({
      detection: { flowType: 'web', stack: { typescript: true, css: true }, stats: {}, services: {}, repoMode: 'solo', totalFiles: 0, totalCode: 0, detectedAt: '' },
    }));
    const result = readDetectionCache(tmpDir);
    expect(result?.flowType).toBe('web');
  });
});

describe('getEffectiveFlowType', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rkstack-detect-eft-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns default when no file exists', () => {
    expect(getEffectiveFlowType(tmpDir)).toBe('default');
  });

  test('returns detection flowType when no overrides', () => {
    const rkstackDir = path.join(tmpDir, '.rkstack');
    fs.mkdirSync(rkstackDir, { recursive: true });
    fs.writeFileSync(path.join(rkstackDir, 'settings.json'), JSON.stringify({
      detection: { flowType: 'web' },
    }));
    expect(getEffectiveFlowType(tmpDir)).toBe('web');
  });

  test('returns override flowType when overrides exist', () => {
    const rkstackDir = path.join(tmpDir, '.rkstack');
    fs.mkdirSync(rkstackDir, { recursive: true });
    fs.writeFileSync(path.join(rkstackDir, 'settings.json'), JSON.stringify({
      detection: { flowType: 'default' },
      overrides: { flowType: 'web' },
    }));
    expect(getEffectiveFlowType(tmpDir)).toBe('web');
  });
});
