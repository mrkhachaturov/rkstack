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

/** Extract the YAML frontmatter block (between --- delimiters) */
function extractFrontmatter(content: string): string {
  if (!content.startsWith('---')) return '';
  const fmEnd = content.indexOf('\n---', 4);
  if (fmEnd === -1) return '';
  return content.slice(4, fmEnd);
}

/** Extract `name:` from YAML frontmatter */
function extractName(fm: string): string {
  const match = fm.match(/^name:\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

/** Extract `preamble-tier:` from YAML frontmatter (1-4) */
function extractPreambleTier(fm: string): number | undefined {
  const match = fm.match(/^preamble-tier:\s*(\d+)$/m);
  return match ? parseInt(match[1], 10) : undefined;
}

/** Extract `announce-action:` from YAML frontmatter */
function extractAnnounceAction(fm: string): string | undefined {
  const match = fm.match(/^announce-action:\s*(.+)$/m);
  return match ? match[1].trim() : undefined;
}

/** Extract `benefits-from:` list from YAML frontmatter */
function extractBenefitsFrom(fm: string): string[] | undefined {
  // Inline: benefits-from: [a, b, c]
  const inlineMatch = fm.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  // Block:
  // benefits-from:
  //   - a
  //   - b
  const blockMatch = fm.match(/^benefits-from:\s*\n((?:\s+-\s+.+\n?)*)/m);
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s+-\s+/, '').trim())
      .filter(Boolean);
  }
  return undefined;
}

// ─── Template Processing ──────────────────────────────────

function processTemplate(tmplRel: string): string {
  const tmplPath = path.join(ROOT, tmplRel);
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');

  // Extract metadata from frontmatter block only (not the entire file)
  const fm = extractFrontmatter(tmplContent);
  const extractedName = extractName(fm);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));
  const preambleTier = extractPreambleTier(fm);
  const benefitsFrom = extractBenefitsFrom(fm);
  const announceAction = extractAnnounceAction(fm);

  const ctx: TemplateContext = {
    skillName,
    tmplPath,
    benefitsFrom,
    host: HOST,
    paths: HOST_PATHS[HOST],
    preambleTier,
    announceAction,
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

// ─── Refs Copy ────────────────────────────────────────────

const UPSTREAM_DOCS = path.join(ROOT, '.upstreams', 'claude-code-docs', 'docs');

/** Skills that get refs/ copied from upstream claude-code-docs */
const SKILL_REFS: Record<string, string[]> = {
  'writing-skills': [
    'skills.md', 'hooks.md', 'hooks-guide.md', 'sub-agents.md',
    'memory.md', 'permissions.md', 'best-practices.md',
  ],
  'setup-project': [
    'permissions.md', 'hooks.md', 'hooks-guide.md', 'settings.md',
    'permission-modes.md', 'sandboxing.md', 'security.md',
  ],
};

function copyRefs() {
  if (!fs.existsSync(UPSTREAM_DOCS)) {
    console.log('WARNING: .upstreams/claude-code-docs/docs/ not found — skipping refs');
    return;
  }

  for (const [skill, docs] of Object.entries(SKILL_REFS)) {
    const refsDir = path.join(ROOT, 'skills', skill, 'refs');
    fs.mkdirSync(refsDir, { recursive: true });
    let copied = 0;
    for (const doc of docs) {
      const src = path.join(UPSTREAM_DOCS, doc);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(refsDir, doc));
        copied++;
      }
    }
    console.log(`Refs: skills/${skill}/refs/ — ${copied}/${docs.length} docs`);
  }
}

// ─── Main ──────────────────────────────────────────────────

function main() {
  // Copy refs from upstream before generating (skip in dry-run)
  if (!DRY_RUN) {
    copyRefs();
  }

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
      generated = processTemplate(tmpl);
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
