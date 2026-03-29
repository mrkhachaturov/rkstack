import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

/** Check if scc is available on this machine. */
const HAS_SCC = spawnSync('command', ['-v', 'scc'], { shell: true, encoding: 'utf8' }).status === 0;

/** Extract the fallback flow type detection logic from session-start hook. */
function extractDetectionBlock(): string {
  const hookPath = path.join(ROOT, 'hooks', 'session-start');
  const content = fs.readFileSync(hookPath, 'utf8');
  const start = content.indexOf('# === Fallback: inline flow type detection');
  const end = content.indexOf('# Read using-rkstack content');
  if (start === -1 || end === -1) throw new Error('Fallback detection block not found in session-start');
  // The block is indented inside an if — dedent and set DETECT_RESULT for standalone execution
  let block = content.substring(start, end);
  // Remove the enclosing if/fi since we run standalone
  block = block.replace(/^\s*fi\s*$/m, '');
  return block;
}

describe.skipIf(!HAS_SCC)('flow type detection (fallback)', () => {
  let tmpDir: string;
  let detectionScript: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rkstack-flow-'));
    detectionScript = extractDetectionBlock();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function detectInDir(files: Record<string, string>): string {
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tmpDir, name);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content);
    }
    const wrapper = `set -euo pipefail\ncd "${tmpDir}"\n${detectionScript}\necho "$DETECT_RESULT"`;
    const r = spawnSync('bash', ['-c', wrapper], { encoding: 'utf8' });
    return r.stdout.trim().split('\n')[0]; // first line is FLOW_TYPE=
  }

  test('TypeScript + CSS = web', () => {
    const result = detectInDir({
      'src/app.ts': 'export const x = 1;',
      'src/style.css': 'body { margin: 0; }',
    });
    expect(result).toBe('FLOW_TYPE=web');
  });

  test('TypeScript + next.config.ts = web', () => {
    const result = detectInDir({
      'src/app.ts': 'export const x = 1;',
      'next.config.ts': 'export default {};',
    });
    expect(result).toBe('FLOW_TYPE=web');
  });

  test('TypeScript only (no CSS, no web config) = default', () => {
    const result = detectInDir({
      'src/index.ts': 'console.log("hello");',
    });
    expect(result).toBe('FLOW_TYPE=default');
  });

  test('Python files = default', () => {
    const result = detectInDir({
      'main.py': 'print("hello")',
      'lib/util.py': 'def foo(): pass',
    });
    expect(result).toBe('FLOW_TYPE=default');
  });

  test('Go files = default', () => {
    const result = detectInDir({
      'main.go': 'package main\nfunc main() {}',
    });
    expect(result).toBe('FLOW_TYPE=default');
  });

  test('Terraform files = default', () => {
    const result = detectInDir({
      'main.tf': 'resource "aws_instance" "web" {}',
    });
    expect(result).toBe('FLOW_TYPE=default');
  });

  test('YAML + Shell only = default', () => {
    const result = detectInDir({
      'deploy.yml': 'services:\n  web:\n    image: nginx',
      'setup.sh': '#!/bin/bash\necho hello',
    });
    expect(result).toBe('FLOW_TYPE=default');
  });

  test('empty dir = default', () => {
    const result = detectInDir({});
    expect(result).toBe('FLOW_TYPE=default');
  });
});
