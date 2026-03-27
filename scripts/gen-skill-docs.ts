#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   read .tmpl → find {{PLACEHOLDERS}} → resolve via RESOLVERS → write .md
 *
 * Supports --dry-run: generate to memory, exit 1 if different from committed file.
 * Used by `just check` and CI freshness checks.
 *
 * Usage:
 *   bun scripts/gen-skill-docs.ts              # generate all
 *   bun scripts/gen-skill-docs.ts --dry-run    # check freshness
 */

import * as fs from 'fs';
import * as path from 'path';
import { RESOLVERS } from './resolvers/index';
import type { Host, TemplateContext } from './resolvers/types';

const ROOT = path.resolve(import.meta.dir, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const DRY_RUN = process.argv.includes('--dry-run');

// Host detection (for future multi-host support)
const HOST: Host = (() => {
  const hostArg = process.argv.find(a => a.startsWith('--host'));
  if (!hostArg) return 'claude';
  const val = hostArg.includes('=')
    ? hostArg.split('=')[1]
    : process.argv[process.argv.indexOf(hostArg) + 1];
  if (val === 'codex' || val === 'gemini' || val === 'claude') return val as Host;
  throw new Error(`Unknown host: ${val}. Use claude, codex, or gemini.`);
})();

// ─── Template Discovery ────────────────────────────────────

function discoverTemplates(dir: string): string[] {
  const templates: string[] = [];

  function walk(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.tmpl')) {
        templates.push(full);
      }
    }
  }

  if (fs.existsSync(dir)) walk(dir);

  // Also check root SKILL.md.tmpl
  const rootTmpl = path.join(ROOT, 'SKILL.md.tmpl');
  if (fs.existsSync(rootTmpl)) {
    templates.push(rootTmpl);
  }

  return templates.sort();
}

// ─── Placeholder Resolution ────────────────────────────────

const PLACEHOLDER_RE = /\{\{([A-Z_]+)\}\}/g;

function resolveTemplate(templatePath: string, content: string): string {
  // Derive skill name from path
  const relative = path.relative(ROOT, templatePath);
  const parts = relative.split(path.sep);
  // skills/brainstorming/SKILL.md.tmpl → skillName = "brainstorming"
  // SKILL.md.tmpl (root) → skillName = "rkstack"
  const skillName = parts[0] === 'skills' && parts.length >= 2
    ? parts[1]
    : 'rkstack';

  const skillDir = path.dirname(templatePath);

  const ctx: TemplateContext = {
    host: HOST,
    skillName,
    skillDir,
    repoRoot: ROOT,
  };

  // Resolve placeholders
  let result = content.replace(PLACEHOLDER_RE, (match, name: string) => {
    const resolver = RESOLVERS[name];
    if (!resolver) {
      console.error(`WARNING: unknown placeholder ${match} in ${relative}`);
      return match;
    }
    return resolver(ctx);
  });

  // Inject AUTO-GENERATED comment after frontmatter
  const frontmatterEnd = result.indexOf('---', result.indexOf('---') + 3);
  if (frontmatterEnd !== -1) {
    const insertPos = frontmatterEnd + 3;
    const comment = `\n<!-- AUTO-GENERATED from ${path.basename(templatePath)} — do not edit directly -->\n<!-- Regenerate: just build -->`;
    result = result.slice(0, insertPos) + comment + result.slice(insertPos);
  }

  return result;
}

// ─── Main ──────────────────────────────────────────────────

function main() {
  const templates = discoverTemplates(SKILLS_DIR);

  if (templates.length === 0) {
    console.error('No .tmpl files found');
    process.exit(1);
  }

  let staleCount = 0;

  for (const tmpl of templates) {
    const outputPath = tmpl.replace(/\.tmpl$/, '');
    const relative = path.relative(ROOT, outputPath);

    const raw = fs.readFileSync(tmpl, 'utf-8');
    const generated = resolveTemplate(tmpl, raw);

    if (DRY_RUN) {
      // Check mode
      if (fs.existsSync(outputPath)) {
        const existing = fs.readFileSync(outputPath, 'utf-8');
        if (existing !== generated) {
          console.log(`STALE: ${relative}`);
          staleCount++;
        }
      } else {
        console.log(`MISSING: ${relative}`);
        staleCount++;
      }
    } else {
      // Generate mode
      fs.writeFileSync(outputPath, generated);
      console.log(`Generated: ${relative}`);
    }
  }

  if (DRY_RUN) {
    if (staleCount > 0) {
      console.error(`\nERROR: ${staleCount} file(s) out of date. Run: just build`);
      process.exit(1);
    } else {
      console.log('OK: all generated files up to date');
    }
  }
}

main();
