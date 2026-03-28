import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

/** Check if scc is available on this machine. */
const HAS_SCC = spawnSync('command', ['-v', 'scc'], { shell: true, encoding: 'utf8' }).status === 0;

/** Extract the project type detection section from session-start hook. */
function extractDetectionBlock(): string {
  const hookPath = path.join(ROOT, 'hooks', 'session-start');
  const content = fs.readFileSync(hookPath, 'utf8');
  const start = content.indexOf('# === Project type detection');
  const end = content.indexOf('# Read using-rkstack content');
  if (start === -1 || end === -1) throw new Error('Detection block not found in session-start');
  return content.substring(start, end);
}

describe.skipIf(!HAS_SCC)('project type detection', () => {
  let tmpDir: string;
  let detectionScript: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rkstack-ptype-'));
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
    const wrapper = `set -euo pipefail\ncd "${tmpDir}"\n${detectionScript}\necho "$PROJECT_TYPE_RESULT"`;
    const r = spawnSync('bash', ['-c', wrapper], { encoding: 'utf8' });
    return r.stdout.trim();
  }

  test('TypeScript + CSS = web', () => {
    const result = detectInDir({
      'src/app.ts': 'export const x = 1;',
      'src/style.css': 'body { margin: 0; }',
    });
    expect(result).toBe('PROJECT_TYPE=web');
  });

  test('TypeScript + next.config.ts = web', () => {
    const result = detectInDir({
      'src/app.ts': 'export const x = 1;',
      'next.config.ts': 'export default {};',
    });
    expect(result).toBe('PROJECT_TYPE=web');
  });

  test('TypeScript only (no CSS, no web config) = node', () => {
    const result = detectInDir({
      'src/index.ts': 'console.log("hello");',
    });
    expect(result).toBe('PROJECT_TYPE=node');
  });

  test('Python files = python', () => {
    const result = detectInDir({
      'main.py': 'print("hello")',
      'lib/util.py': 'def foo(): pass',
    });
    expect(result).toBe('PROJECT_TYPE=python');
  });

  test('Go files = go', () => {
    const result = detectInDir({
      'main.go': 'package main\nfunc main() {}',
    });
    expect(result).toBe('PROJECT_TYPE=go');
  });

  test('Terraform files = infra', () => {
    const result = detectInDir({
      'main.tf': 'resource "aws_instance" "web" {}',
    });
    expect(result).toBe('PROJECT_TYPE=infra');
  });

  test('YAML + Shell only = devops', () => {
    const result = detectInDir({
      'deploy.yml': 'services:\n  web:\n    image: nginx',
      'setup.sh': '#!/bin/bash\necho hello',
    });
    expect(result).toBe('PROJECT_TYPE=devops');
  });

  test('empty dir = general', () => {
    const result = detectInDir({});
    expect(result).toBe('PROJECT_TYPE=general');
  });
});
