#!/usr/bin/env bun
/**
 * dev:skill — Watch mode for SKILL.md template development.
 *
 * Watches .tmpl files and resolver source files.
 * On change: regenerates SKILL.md files and validates.
 */

import { discoverTemplates } from './discover-skills';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function regenerate() {
  console.log(`  [${timestamp()}] [gen] Regenerating...`);
  try {
    const output = execSync('bun scripts/gen-skill-docs.ts', { cwd: ROOT, stdio: 'pipe' });
    const lines = output.toString().trim().split('\n');
    for (const line of lines) {
      console.log(`  [${timestamp()}] [gen] ${line}`);
    }
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() || err.message;
    console.log(`  [${timestamp()}] [gen] ERROR: ${stderr}`);
    return;
  }

  // Validate freshness
  try {
    execSync('bun scripts/gen-skill-docs.ts --dry-run', { cwd: ROOT, stdio: 'pipe' });
    console.log(`  [${timestamp()}] [check] \u2705 All fresh`);
  } catch (err: any) {
    const stdout = err.stdout?.toString().trim() || '';
    console.log(`  [${timestamp()}] [check] \u274c Stale: ${stdout}`);
  }
}

// Initial run
console.log('  [watch] Watching *.md.tmpl files and resolvers...');
regenerate();

// Watch template files
const templates = discoverTemplates(ROOT);
for (const { tmpl } of templates) {
  const fullPath = path.join(ROOT, tmpl);
  if (!fs.existsSync(fullPath)) continue;
  fs.watch(fullPath, () => {
    console.log(`\n  [${timestamp()}] [watch] ${tmpl} changed`);
    regenerate();
  });
}

// Watch resolver source files
const RESOLVER_DIR = path.join(ROOT, 'scripts', 'resolvers');
if (fs.existsSync(RESOLVER_DIR)) {
  for (const entry of fs.readdirSync(RESOLVER_DIR)) {
    if (!entry.endsWith('.ts')) continue;
    const fullPath = path.join(RESOLVER_DIR, entry);
    fs.watch(fullPath, () => {
      console.log(`\n  [${timestamp()}] [watch] scripts/resolvers/${entry} changed`);
      regenerate();
    });
  }
}

console.log('  [watch] Press Ctrl+C to stop\n');
