#!/usr/bin/env bun
/**
 * Generate project-local skills from dev/skills/ to .claude/skills/.
 *
 * Unlike gen-skill-docs.ts, this does NOT resolve {{PLACEHOLDERS}}.
 * Dev skills document the template system and contain literal {{...}}
 * syntax as examples. They are plain-copied with an AUTO-GENERATED header.
 *
 * Usage:
 *   bun scripts/gen-dev-skills.ts              # generate all
 *   bun scripts/gen-dev-skills.ts --dry-run    # check freshness
 */

import * as fs from 'fs';
import * as path from 'path';
import { discoverDevTemplates } from './discover-skills';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');

function main() {
  const templates = discoverDevTemplates(ROOT);

  if (templates.length === 0) {
    console.log('No dev skill templates found');
    return;
  }

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
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputPath, generated);
      console.log(`Generated: ${output}`);

      // Copy companion files (*.md except SKILL.md and SKILL.md.tmpl)
      const tmplDir = path.dirname(tmplPath);
      for (const entry of fs.readdirSync(tmplDir)) {
        if (entry === 'SKILL.md' || entry === 'SKILL.md.tmpl') continue;
        const src = path.join(tmplDir, entry);
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, path.join(outputDir, entry));
          console.log(`  Copied: ${entry}`);
        }
      }
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
