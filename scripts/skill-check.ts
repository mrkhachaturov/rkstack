#!/usr/bin/env bun
/**
 * skill:check — Health summary for all SKILL.md files.
 *
 * Reports:
 *   - Template coverage (which SKILL.md files have .tmpl sources)
 *   - Frontmatter validation (required fields present)
 *   - Freshness check (generated files match committed files)
 */

import { discoverTemplates, discoverSkillFiles } from './discover-skills';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(import.meta.dir, '..');

const SKILL_FILES = discoverSkillFiles(ROOT);
const TEMPLATES = discoverTemplates(ROOT);

let hasErrors = false;

// ─── Frontmatter Validation ────────────────────────────────

console.log('  Skills:');
for (const file of SKILL_FILES) {
  const fullPath = path.join(ROOT, file);
  const content = fs.readFileSync(fullPath, 'utf-8');

  const issues: string[] = [];

  // Check frontmatter exists
  if (!content.startsWith('---')) {
    issues.push('missing frontmatter');
  } else {
    const fmEnd = content.indexOf('---', 4);
    if (fmEnd === -1) {
      issues.push('unclosed frontmatter');
    } else {
      const fm = content.slice(4, fmEnd);
      if (!fm.match(/^name:\s*.+$/m)) issues.push('missing name:');
      if (!fm.match(/^description:\s*/m)) issues.push('missing description:');
      if (!fm.match(/^preamble-tier:\s*\d+$/m)) issues.push('missing preamble-tier:');
    }
  }

  if (issues.length > 0) {
    hasErrors = true;
    console.log(`  \u274c ${file.padEnd(40)} — ${issues.join(', ')}`);
  } else {
    console.log(`  \u2705 ${file.padEnd(40)} — OK`);
  }
}

// ─── Templates ──────────────────────────────────────────────

console.log('\n  Templates:');
for (const { tmpl, output } of TEMPLATES) {
  const tmplPath = path.join(ROOT, tmpl);
  const outPath = path.join(ROOT, output);
  if (!fs.existsSync(tmplPath)) {
    console.log(`  \u26a0\ufe0f  ${output.padEnd(40)} — no template`);
    continue;
  }
  if (!fs.existsSync(outPath)) {
    hasErrors = true;
    console.log(`  \u274c ${output.padEnd(40)} — generated file missing! Run: just build`);
    continue;
  }
  console.log(`  \u2705 ${tmpl.padEnd(40)} \u2192 ${output}`);
}

// Skills without templates
for (const file of SKILL_FILES) {
  const tmplPath = path.join(ROOT, file + '.tmpl');
  if (!fs.existsSync(tmplPath) && !TEMPLATES.some(t => t.output === file)) {
    console.log(`  \u26a0\ufe0f  ${file.padEnd(40)} — no template (hand-authored)`);
  }
}

// ─── Freshness ──────────────────────────────────────────────

console.log('\n  Freshness:');
try {
  execSync('bun scripts/gen-skill-docs.ts --dry-run', { cwd: ROOT, stdio: 'pipe' });
  console.log('  \u2705 All generated files are fresh');
} catch (err: any) {
  hasErrors = true;
  const output = err.stdout?.toString() || '';
  console.log('  \u274c Generated files are stale:');
  for (const line of output.split('\n').filter((l: string) => l.startsWith('STALE') || l.startsWith('MISSING'))) {
    console.log(`      ${line}`);
  }
  console.log('      Run: just build');
}

console.log('');
process.exit(hasErrors ? 1 : 0);
