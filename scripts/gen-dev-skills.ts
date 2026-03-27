#!/usr/bin/env bun
/**
 * Generate project-local skills from dev/skills/ to .claude/skills/.
 *
 * Pipeline:
 *   1. Pull latest claude-code-docs upstream (git submodule update)
 *   2. Copy relevant docs to output refs/ directories
 *   3. Copy SKILL.md.tmpl → SKILL.md with AUTO-GENERATED header (no placeholder resolution)
 *   4. Copy companion files recursively
 *
 * Dev skills document the template system and contain literal {{...}}
 * syntax as examples — they cannot go through the template engine.
 *
 * Usage:
 *   bun scripts/gen-dev-skills.ts              # generate all
 *   bun scripts/gen-dev-skills.ts --dry-run    # check freshness (skip upstream pull)
 *   bun scripts/gen-dev-skills.ts --no-pull    # generate without pulling upstream
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { discoverDevTemplates } from './discover-skills';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const NO_PULL = process.argv.includes('--no-pull');

// Docs from claude-code-docs to copy into refs/ for each dev skill that needs them
const CLAUDE_CODE_REFS = [
  'skills.md',
  'hooks.md',
  'hooks-guide.md',
  'plugins.md',
  'plugins-reference.md',
  'sub-agents.md',
  'memory.md',
  'permissions.md',
  'settings.md',
  'best-practices.md',
  'common-workflows.md',
  'how-claude-code-works.md',
  'agent-teams.md',
  'mcp.md',
];

const UPSTREAM_DOCS_DIR = path.join(ROOT, '.upstreams', 'claude-code-docs', 'docs');

// ─── Upstream Pull ────────────────────────────────────────

function pullUpstream() {
  if (DRY_RUN || NO_PULL) return;

  console.log('Pulling latest claude-code-docs...');
  try {
    execSync('git submodule update --remote .upstreams/claude-code-docs', {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 30000,
    });
    console.log('  Updated');
  } catch {
    console.log('  Skipped (offline or no changes)');
  }
}

// ─── Recursive Copy ───────────────────────────────────────

function copyDirRecursive(src: string, dest: string, indent: string = '  ') {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'SKILL.md' || entry.name === 'SKILL.md.tmpl') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, indent);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`${indent}Copied: ${entry.name}`);
    }
  }
}

// ─── Refs Copy ────────────────────────────────────────────

function copyRefs(outputDir: string) {
  if (!fs.existsSync(UPSTREAM_DOCS_DIR)) {
    console.log('  WARNING: .upstreams/claude-code-docs/docs/ not found — skipping refs');
    return;
  }

  const refsDir = path.join(outputDir, 'refs');
  fs.mkdirSync(refsDir, { recursive: true });

  let copied = 0;
  for (const doc of CLAUDE_CODE_REFS) {
    const src = path.join(UPSTREAM_DOCS_DIR, doc);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(refsDir, doc));
      copied++;
    } else {
      console.log(`  WARNING: refs/${doc} not found in upstream`);
    }
  }
  console.log(`  Refs: ${copied}/${CLAUDE_CODE_REFS.length} docs copied`);
}

// ─── Main ─────────────────────────────────────────────────

function main() {
  const templates = discoverDevTemplates(ROOT);

  if (templates.length === 0) {
    console.log('No dev skill templates found');
    return;
  }

  // Pull latest upstream docs
  pullUpstream();

  let staleCount = 0;

  for (const { tmpl, output } of templates) {
    const tmplPath = path.join(ROOT, tmpl);
    const outputPath = path.join(ROOT, output);
    const content = fs.readFileSync(tmplPath, 'utf-8');

    // Inject AUTO-GENERATED header after frontmatter
    const header = `<!-- AUTO-GENERATED from ${path.basename(tmplPath)} — do not edit directly -->\n<!-- Regenerate: just dev-build -->`;
    let generated = content;
    const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
    if (fmEnd !== -1) {
      const insertPos = fmEnd + 3;
      generated = content.slice(0, insertPos) + '\n' + header + content.slice(insertPos);
    }

    if (DRY_RUN) {
      if (fs.existsSync(outputPath)) {
        const existing = fs.readFileSync(outputPath, 'utf-8');
        if (existing !== generated) {
          console.log(`STALE: ${output}`);
          staleCount++;
        }
      } else {
        console.log(`MISSING: ${output}`);
        staleCount++;
      }
    } else {
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputPath, generated);
      console.log(`Generated: ${output}`);

      // Copy companion files recursively (excludes SKILL.md/SKILL.md.tmpl)
      copyDirRecursive(path.dirname(tmplPath), outputDir);

      // Copy refs from upstream claude-code-docs
      copyRefs(outputDir);
    }
  }

  if (DRY_RUN && staleCount > 0) {
    console.error(`\n${staleCount} dev skill(s) out of date. Run: just dev-build`);
    process.exit(1);
  } else if (DRY_RUN) {
    console.log('OK: all dev skills up to date');
  }
}

main();
