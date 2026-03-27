#!/usr/bin/env bun
/**
 * Generate SKILL.md files from .tmpl templates.
 *
 * Pipeline:
 *   discover .tmpl → parse frontmatter → build TemplateContext → resolve {{PLACEHOLDERS}} → write .md
 *
 * Supports --dry-run: generate to memory, exit 1 if different from committed file.
 * Supports --host: generate for claude (default), codex, or gemini.
 *
 * Usage:
 *   bun scripts/gen-skill-docs.ts              # generate all
 *   bun scripts/gen-skill-docs.ts --dry-run    # check freshness
 *   bun scripts/gen-skill-docs.ts --host codex # generate for Codex
 */

import * as fs from 'fs';
import * as path from 'path';
import { RESOLVERS } from './resolvers/index';
import { HOST_PATHS } from './resolvers/types';
import type { Host, TemplateContext } from './resolvers/types';
import { discoverTemplates } from './discover-skills';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const GENERATED_HEADER = '<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n<!-- Regenerate: just build -->';

// Host detection
const HOST: Host = (() => {
  const hostArg = process.argv.find(a => a.startsWith('--host'));
  if (!hostArg) return 'claude';
  const val = hostArg.includes('=')
    ? hostArg.split('=')[1]
    : process.argv[process.argv.indexOf(hostArg) + 1];
  if (val === 'codex' || val === 'gemini' || val === 'claude') return val as Host;
  throw new Error(`Unknown host: ${val}. Use claude, codex, or gemini.`);
})();

// ─── Frontmatter Parsing ──────────────────────────────────

const PLACEHOLDER_RE = /\{\{([A-Z_]+)\}\}/g;

/** Extract `name:` from YAML frontmatter */
function extractName(content: string): string {
  const match = content.match(/^name:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

/** Extract `preamble-tier:` from YAML frontmatter (1-4) */
function extractPreambleTier(content: string): number | undefined {
  const match = content.match(/^preamble-tier:\s*(\d+)$/m);
  return match ? parseInt(match[1], 10) : undefined;
}

/** Extract `benefits-from:` list from YAML frontmatter */
function extractBenefitsFrom(content: string): string[] | undefined {
  // Inline: benefits-from: [a, b, c]
  const inlineMatch = content.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  // Block:
  // benefits-from:
  //   - a
  //   - b
  const blockMatch = content.match(/^benefits-from:\s*\n((?:\s+-\s+.+\n?)*)/m);
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s+-\s+/, '').trim())
      .filter(Boolean);
  }
  return undefined;
}

// ─── Template Processing ──────────────────────────────────

function processTemplate(tmplRel: string, _outputRel: string): string {
  const tmplPath = path.join(ROOT, tmplRel);
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');

  // Extract metadata from frontmatter
  const extractedName = extractName(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));
  const preambleTier = extractPreambleTier(tmplContent);
  const benefitsFrom = extractBenefitsFrom(tmplContent);

  const ctx: TemplateContext = {
    skillName,
    tmplPath,
    benefitsFrom,
    host: HOST,
    paths: HOST_PATHS[HOST],
    preambleTier,
  };

  // Resolve placeholders — fail on unknown
  let content = tmplContent.replace(PLACEHOLDER_RE, (match: string, name: string) => {
    const resolver = RESOLVERS[name];
    if (!resolver) {
      throw new Error(`Unresolved placeholder ${match} in ${tmplRel}`);
    }
    return resolver(ctx);
  });

  // Validate no remaining placeholders
  const remaining = [...content.matchAll(PLACEHOLDER_RE)].map(m => m[0]);
  if (remaining.length > 0) {
    throw new Error(`Unresolved placeholders in ${tmplRel}: ${remaining.join(', ')}`);
  }

  // Inject AUTO-GENERATED header after frontmatter
  const header = GENERATED_HEADER.replace('{{SOURCE}}', path.basename(tmplPath));
  const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
  if (fmEnd !== -1) {
    const insertPos = fmEnd + 3;
    content = content.slice(0, insertPos) + '\n' + header + content.slice(insertPos);
  }

  return content;
}

// ─── Main ──────────────────────────────────────────────────

function main() {
  const templates = discoverTemplates(ROOT);

  if (templates.length === 0) {
    console.error('No .tmpl files found');
    process.exit(1);
  }

  let staleCount = 0;
  let errorCount = 0;

  for (const { tmpl, output } of templates) {
    const outputPath = path.join(ROOT, output);

    let generated: string;
    try {
      generated = processTemplate(tmpl, output);
    } catch (err: any) {
      console.error(`ERROR: ${err.message}`);
      errorCount++;
      continue;
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
      fs.writeFileSync(outputPath, generated);
      console.log(`Generated: ${output}`);
    }
  }

  if (errorCount > 0) {
    console.error(`\n${errorCount} template(s) had errors`);
    process.exit(1);
  }

  if (DRY_RUN) {
    if (staleCount > 0) {
      console.error(`\n${staleCount} file(s) out of date. Run: just build`);
      process.exit(1);
    } else {
      console.log('OK: all generated files up to date');
    }
  }
}

main();
