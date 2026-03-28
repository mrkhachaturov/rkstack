/**
 * Tests for the gen-skill-docs template generation pipeline.
 *
 * Uses dynamic discovery — no hardcoded skill names.
 * All expectations derive from scanning skills/*\/SKILL.md.tmpl.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { discoverTemplates, discoverSkillFiles } from '../scripts/discover-skills';
import { generatePreamble } from '../scripts/resolvers/preamble';
import { HOST_PATHS } from '../scripts/resolvers/types';
import type { TemplateContext } from '../scripts/resolvers/types';

const ROOT = path.resolve(import.meta.dir, '..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

function extractFrontmatter(content: string): string {
  if (!content.startsWith('---')) return '';
  const fmEnd = content.indexOf('\n---', 4);
  if (fmEnd === -1) return '';
  return content.slice(4, fmEnd);
}

function extractField(fm: string, key: string): string | undefined {
  const match = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

function extractPreambleTier(fm: string): number | undefined {
  const val = extractField(fm, 'preamble-tier');
  return val !== undefined ? parseInt(val, 10) : undefined;
}

// ─── Template Discovery ────────────────────────────────────────────────────────

describe('Template Discovery', () => {
  test('discoverTemplates finds all 23 skill templates', () => {
    const templates = discoverTemplates(ROOT);
    expect(templates.length).toBe(23);
  });

  test('discoverSkillFiles finds all 23 shipped SKILL.md files', () => {
    const skillFiles = discoverSkillFiles(ROOT);
    const shippedSkills = skillFiles.filter(f => f.startsWith('skills/'));
    expect(shippedSkills.length).toBe(23);
  });

  test('discoverTemplates returns sorted results', () => {
    const templates = discoverTemplates(ROOT);
    const paths = templates.map(t => t.tmpl);
    const sorted = [...paths].sort((a, b) => a.localeCompare(b));
    expect(paths).toEqual(sorted);
  });

  test('discoverSkillFiles returns sorted results', () => {
    const skillFiles = discoverSkillFiles(ROOT);
    const sorted = [...skillFiles].sort();
    expect(skillFiles).toEqual(sorted);
  });

  test('discoverTemplates returns relative paths (not absolute)', () => {
    const templates = discoverTemplates(ROOT);
    for (const { tmpl, output } of templates) {
      expect(tmpl.startsWith('/')).toBe(false);
      expect(output.startsWith('/')).toBe(false);
    }
  });

  test('discoverSkillFiles returns relative paths (not absolute)', () => {
    const skillFiles = discoverSkillFiles(ROOT);
    for (const rel of skillFiles) {
      expect(rel.startsWith('/')).toBe(false);
    }
  });

  test('every template has a corresponding output path ending in SKILL.md', () => {
    const templates = discoverTemplates(ROOT);
    for (const { output } of templates) {
      expect(output.endsWith('SKILL.md')).toBe(true);
    }
  });
});

// ─── Frontmatter Extraction ────────────────────────────────────────────────────

describe('Frontmatter Extraction', () => {
  const templates = discoverTemplates(ROOT);

  test('every .tmpl has a name: field', () => {
    for (const { tmpl } of templates) {
      const content = readFile(tmpl);
      const fm = extractFrontmatter(content);
      const name = extractField(fm, 'name');
      expect(name, `${tmpl} missing name:`).toBeTruthy();
    }
  });

  test('every .tmpl has a preamble-tier: field', () => {
    for (const { tmpl } of templates) {
      const content = readFile(tmpl);
      const fm = extractFrontmatter(content);
      const tier = extractPreambleTier(fm);
      expect(tier, `${tmpl} missing preamble-tier:`).not.toBeUndefined();
    }
  });

  test('every .tmpl has a description: field', () => {
    for (const { tmpl } of templates) {
      const content = readFile(tmpl);
      const fm = extractFrontmatter(content);
      // description may be a block scalar — check it exists in the raw frontmatter
      expect(fm.includes('description:'), `${tmpl} missing description:`).toBe(true);
    }
  });

  test('preamble-tier values are valid (1, 2, 3, or 4)', () => {
    const validTiers = new Set([1, 2, 3, 4]);
    for (const { tmpl } of templates) {
      const content = readFile(tmpl);
      const fm = extractFrontmatter(content);
      const tier = extractPreambleTier(fm);
      expect(validTiers.has(tier!), `${tmpl} has invalid preamble-tier: ${tier}`).toBe(true);
    }
  });
});

// ─── Placeholder Resolution ────────────────────────────────────────────────────

describe('Placeholder Resolution', () => {
  const templates = discoverTemplates(ROOT);

  test('{{PREAMBLE}} is resolved in every generated file (no literal marker remains)', () => {
    for (const { output } of templates) {
      const content = readFile(output);
      expect(content.includes('{{PREAMBLE}}'), `${output} still contains {{PREAMBLE}}`).toBe(false);
    }
  });

  test('{{BASE_BRANCH_DETECT}} is resolved in files that use it', () => {
    // Find templates that use {{BASE_BRANCH_DETECT}}
    const usingPlaceholder = templates.filter(({ tmpl }) =>
      readFile(tmpl).includes('{{BASE_BRANCH_DETECT}}')
    );

    expect(usingPlaceholder.length).toBeGreaterThan(0);

    for (const { output } of usingPlaceholder) {
      const content = readFile(output);
      expect(
        content.includes('{{BASE_BRANCH_DETECT}}'),
        `${output} still contains {{BASE_BRANCH_DETECT}}`
      ).toBe(false);
    }
  });

  test('{{TEST_FAILURE_TRIAGE}} is resolved in files that use it', () => {
    const usingPlaceholder = templates.filter(({ tmpl }) =>
      readFile(tmpl).includes('{{TEST_FAILURE_TRIAGE}}')
    );

    expect(usingPlaceholder.length).toBeGreaterThan(0);

    for (const { output } of usingPlaceholder) {
      const content = readFile(output);
      expect(
        content.includes('{{TEST_FAILURE_TRIAGE}}'),
        `${output} still contains {{TEST_FAILURE_TRIAGE}}`
      ).toBe(false);
    }
  });

  test('no unresolved {{PLACEHOLDER}} patterns remain in any generated file', () => {
    const placeholderRe = /\{\{[A-Z_]+\}\}/;
    for (const { output } of templates) {
      const content = readFile(output);
      const match = content.match(placeholderRe);
      expect(match, `${output} has unresolved placeholder: ${match?.[0]}`).toBeNull();
    }
  });
});

// ─── Generated Output Quality ──────────────────────────────────────────────────

describe('Generated Output Quality', () => {
  const templates = discoverTemplates(ROOT);

  test('every generated SKILL.md starts with --- (frontmatter)', () => {
    for (const { output } of templates) {
      const content = readFile(output);
      expect(content.startsWith('---'), `${output} does not start with ---`).toBe(true);
    }
  });

  test('every generated SKILL.md contains the AUTO-GENERATED comment', () => {
    for (const { output } of templates) {
      const content = readFile(output);
      expect(
        content.includes('<!-- AUTO-GENERATED'),
        `${output} missing <!-- AUTO-GENERATED comment`
      ).toBe(true);
    }
  });

  test('every generated SKILL.md contains ## Preamble (run first)', () => {
    for (const { output } of templates) {
      const content = readFile(output);
      expect(
        content.includes('## Preamble (run first)'),
        `${output} missing ## Preamble (run first)`
      ).toBe(true);
    }
  });

  test('T1 skills do NOT contain ## AskUserQuestion Format', () => {
    const t1Templates = templates.filter(({ tmpl }) => {
      const fm = extractFrontmatter(readFile(tmpl));
      return extractPreambleTier(fm) === 1;
    });

    expect(t1Templates.length).toBeGreaterThan(0);

    for (const { output } of t1Templates) {
      const content = readFile(output);
      expect(
        content.includes('## AskUserQuestion Format'),
        `T1 skill ${output} should NOT contain ## AskUserQuestion Format`
      ).toBe(false);
    }
  });

  test('T2+ skills DO contain ## AskUserQuestion Format', () => {
    const t2PlusTemplates = templates.filter(({ tmpl }) => {
      const fm = extractFrontmatter(readFile(tmpl));
      const tier = extractPreambleTier(fm);
      return tier !== undefined && tier >= 2;
    });

    expect(t2PlusTemplates.length).toBeGreaterThan(0);

    for (const { output } of t2PlusTemplates) {
      const content = readFile(output);
      expect(
        content.includes('## AskUserQuestion Format'),
        `T2+ skill ${output} should contain ## AskUserQuestion Format`
      ).toBe(true);
    }
  });

  test('T3+ skills DO contain ## Repo Ownership', () => {
    const t3PlusTemplates = templates.filter(({ tmpl }) => {
      const fm = extractFrontmatter(readFile(tmpl));
      const tier = extractPreambleTier(fm);
      return tier !== undefined && tier >= 3;
    });

    expect(t3PlusTemplates.length).toBeGreaterThan(0);

    for (const { output } of t3PlusTemplates) {
      const content = readFile(output);
      expect(
        content.includes('## Repo Ownership'),
        `T3+ skill ${output} should contain ## Repo Ownership`
      ).toBe(true);
    }
  });

  test('T1 skills do NOT contain ## Repo Ownership', () => {
    const t1Templates = templates.filter(({ tmpl }) => {
      const fm = extractFrontmatter(readFile(tmpl));
      return extractPreambleTier(fm) === 1;
    });

    for (const { output } of t1Templates) {
      const content = readFile(output);
      expect(
        content.includes('## Repo Ownership'),
        `T1 skill ${output} should NOT contain ## Repo Ownership`
      ).toBe(false);
    }
  });

  test('T2 skills do NOT contain ## Repo Ownership', () => {
    const t2OnlyTemplates = templates.filter(({ tmpl }) => {
      const fm = extractFrontmatter(readFile(tmpl));
      return extractPreambleTier(fm) === 2;
    });

    expect(t2OnlyTemplates.length).toBeGreaterThan(0);

    for (const { output } of t2OnlyTemplates) {
      const content = readFile(output);
      expect(
        content.includes('## Repo Ownership'),
        `T2 skill ${output} should NOT contain ## Repo Ownership`
      ).toBe(false);
    }
  });

  test('every generated SKILL.md contains ## Completion Status', () => {
    for (const { output } of templates) {
      const content = readFile(output);
      expect(
        content.includes('## Completion Status'),
        `${output} missing ## Completion Status`
      ).toBe(true);
    }
  });

  test('BASE_BRANCH_DETECT resolution produces Base Branch Detection section', () => {
    const usingPlaceholder = templates.filter(({ tmpl }) =>
      readFile(tmpl).includes('{{BASE_BRANCH_DETECT}}')
    );

    for (const { output } of usingPlaceholder) {
      const content = readFile(output);
      expect(
        content.includes('### Base Branch Detection'),
        `${output} missing Base Branch Detection section`
      ).toBe(true);
    }
  });

  test('TEST_FAILURE_TRIAGE resolution produces Test Failure Ownership Triage section', () => {
    const usingPlaceholder = templates.filter(({ tmpl }) =>
      readFile(tmpl).includes('{{TEST_FAILURE_TRIAGE}}')
    );

    for (const { output } of usingPlaceholder) {
      const content = readFile(output);
      expect(
        content.includes('## Test Failure Ownership Triage'),
        `${output} missing Test Failure Ownership Triage section`
      ).toBe(true);
    }
  });
});

// ─── Freshness ────────────────────────────────────────────────────────────────

describe('Freshness', () => {
  // Import processTemplate internals by re-implementing the dry-run check:
  // spawn gen-skill-docs.ts --dry-run and verify it exits 0.
  test('generated files match what gen-skill-docs would produce (dry-run exits 0)', async () => {
    const proc = Bun.spawn(
      ['bun', 'scripts/gen-skill-docs.ts', '--dry-run'],
      {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    const exitCode = await proc.exited;
    let stdout = '';
    let stderr = '';

    if (proc.stdout) {
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        stdout += decoder.decode(value);
      }
    }
    if (proc.stderr) {
      const reader = proc.stderr.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        stderr += decoder.decode(value);
      }
    }

    expect(
      exitCode,
      `gen-skill-docs --dry-run exited ${exitCode}.\nstdout: ${stdout}\nstderr: ${stderr}`
    ).toBe(0);
  });
});

// ─── Preamble Bootstrap — moved to session-start hook ────────────────────────

describe('preamble does not contain bootstrap block (moved to session-start hook)', () => {
  test('T1 preamble for claude host does NOT include bootstrap block', () => {
    const ctx: TemplateContext = {
      skillName: 'test-skill',
      tmplPath: '/fake/SKILL.md.tmpl',
      host: 'claude',
      paths: HOST_PATHS['claude'],
      preambleTier: 1,
    };
    const preamble = generatePreamble(ctx);
    expect(preamble).not.toContain('rkstack bootstrap');
    expect(preamble).not.toContain('RKSTACK_BIN_UNAVAILABLE');
  });

  test('T1 preamble for codex host does NOT include bootstrap block', () => {
    const ctx: TemplateContext = {
      skillName: 'test-skill',
      tmplPath: '/fake/SKILL.md.tmpl',
      host: 'codex',
      paths: HOST_PATHS['codex'],
      preambleTier: 1,
    };
    const preamble = generatePreamble(ctx);
    expect(preamble).not.toContain('rkstack bootstrap');
  });

  test('T1 preamble for gemini host does NOT include bootstrap block', () => {
    const ctx: TemplateContext = {
      skillName: 'test-skill',
      tmplPath: '/fake/SKILL.md.tmpl',
      host: 'gemini',
      paths: HOST_PATHS['gemini'],
      preambleTier: 1,
    };
    const preamble = generatePreamble(ctx);
    expect(preamble).not.toContain('rkstack bootstrap');
  });
});
