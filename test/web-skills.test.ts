/**
 * Tests for the 10 web skills — structure, frontmatter, content references.
 *
 * Validates that web skill templates and generated files exist, have correct
 * frontmatter, reference the browse binary and report directory where expected,
 * and are properly registered in using-rkstack and session-start.
 */

import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');

const WEB_SKILLS = [
  'browse', 'qa', 'qa-only', 'design-review', 'plan-design-review',
  'design-consultation', 'setup-browser-cookies', 'benchmark', 'canary', 'supabase-qa',
];

// Skills that directly use the browse binary
const BROWSER_DEPENDENT_SKILLS = [
  'browse', 'qa', 'qa-only', 'design-review', 'setup-browser-cookies', 'benchmark', 'canary',
];

// Skills that produce report output to .rkstack/
const REPORT_SKILLS = ['qa', 'qa-only', 'design-review', 'benchmark', 'canary'];

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

// ─── 1. Templates and generated files exist ──────────────────────────────────

describe('Web skill files exist', () => {
  for (const skill of WEB_SKILLS) {
    test(`skills/${skill}/SKILL.md.tmpl exists`, () => {
      const tmplPath = path.join(ROOT, 'skills', skill, 'SKILL.md.tmpl');
      expect(fs.existsSync(tmplPath), `Missing template: skills/${skill}/SKILL.md.tmpl`).toBe(true);
    });

    test(`skills/${skill}/SKILL.md exists`, () => {
      const mdPath = path.join(ROOT, 'skills', skill, 'SKILL.md');
      expect(fs.existsSync(mdPath), `Missing generated file: skills/${skill}/SKILL.md`).toBe(true);
    });
  }
});

// ─── 2. Valid frontmatter ────────────────────────────────────────────────────

describe('Web skill frontmatter', () => {
  for (const skill of WEB_SKILLS) {
    describe(skill, () => {
      const content = readFile(`skills/${skill}/SKILL.md.tmpl`);
      const fm = extractFrontmatter(content);

      test('name: matches directory name', () => {
        const name = extractField(fm, 'name');
        expect(name, `${skill} frontmatter name: field missing`).toBe(skill);
      });

      test('preamble-tier: is 1, 2, 3, or 4', () => {
        const tier = extractPreambleTier(fm);
        expect(tier, `${skill} missing preamble-tier`).not.toBeUndefined();
        expect([1, 2, 3, 4]).toContain(tier!);
      });

      test('user-invocable: true', () => {
        const val = extractField(fm, 'user-invocable');
        expect(val, `${skill} missing user-invocable`).toBe('true');
      });

      test('description: is non-empty', () => {
        expect(fm.includes('description:'), `${skill} missing description:`).toBe(true);
        // description is a block scalar — check there's content after it
        const descIdx = fm.indexOf('description:');
        const afterDesc = fm.slice(descIdx + 'description:'.length).trim();
        expect(afterDesc.length, `${skill} has empty description`).toBeGreaterThan(0);
      });

      test('allowed-tools: includes Bash', () => {
        expect(fm.includes('allowed-tools:'), `${skill} missing allowed-tools:`).toBe(true);
        // Check the tools list section for Bash
        const toolsIdx = fm.indexOf('allowed-tools:');
        const toolsSection = fm.slice(toolsIdx);
        expect(toolsSection.includes('Bash'), `${skill} allowed-tools missing Bash`).toBe(true);
      });
    });
  }
});

// ─── 3. Browser-dependent skills reference RKSTACK_BROWSE ────────────────────

describe('Browser-dependent skills reference RKSTACK_BROWSE', () => {
  for (const skill of BROWSER_DEPENDENT_SKILLS) {
    test(`${skill} generated SKILL.md contains RKSTACK_BROWSE`, () => {
      const content = readFile(`skills/${skill}/SKILL.md`);
      const hasRef = content.includes('$RKSTACK_BROWSE') || content.includes('RKSTACK_BROWSE');
      expect(hasRef, `${skill}/SKILL.md should reference RKSTACK_BROWSE`).toBe(true);
    });
  }
});

// ─── 4. Report skills reference .rkstack/ ────────────────────────────────────

describe('Report skills reference .rkstack/', () => {
  for (const skill of REPORT_SKILLS) {
    test(`${skill} generated SKILL.md contains .rkstack/`, () => {
      const content = readFile(`skills/${skill}/SKILL.md`);
      expect(content.includes('.rkstack/'), `${skill}/SKILL.md should reference .rkstack/`).toBe(true);
    });
  }
});

// ─── 5. Supabase skill references MCP ────────────────────────────────────────

describe('Supabase skill references MCP', () => {
  test('supabase-qa generated SKILL.md contains MCP reference', () => {
    const content = readFile('skills/supabase-qa/SKILL.md');
    const hasMcp = content.includes('MCP') || content.includes('Supabase MCP');
    expect(hasMcp, 'supabase-qa/SKILL.md should reference MCP').toBe(true);
  });
});

// ─── 6. Using-rkstack intent table includes all web skills ───────────────────

describe('Using-rkstack includes all web skills', () => {
  const usingRkstack = readFile('skills/using-rkstack/SKILL.md');

  for (const skill of WEB_SKILLS) {
    test(`using-rkstack mentions ${skill}`, () => {
      // Skills appear as backtick-quoted names in the intent table
      expect(
        usingRkstack.includes(skill),
        `using-rkstack/SKILL.md should reference "${skill}"`
      ).toBe(true);
    });
  }
});

// ─── 7. Session-start hook has all detection blocks ──────────────────────────

describe('Session-start hook structure', () => {
  const hookContent = readFile('hooks/session-start');

  test('contains binary bootstrap section', () => {
    expect(hookContent.includes('# === Binary bootstrap')).toBe(true);
  });

  test('contains rkstack-browse bootstrap subsection', () => {
    expect(hookContent.includes('rkstack-browse')).toBe(true);
  });

  test('contains project type detection section', () => {
    expect(hookContent.includes('# === Project type detection')).toBe(true);
  });

  test('contains service detection section', () => {
    expect(hookContent.includes('# === Service detection')).toBe(true);
  });

  test('declares RKSTACK_BOOTSTRAP_RESULT', () => {
    expect(hookContent.includes('RKSTACK_BOOTSTRAP_RESULT')).toBe(true);
  });

  test('declares BROWSE_BOOTSTRAP_RESULT', () => {
    expect(hookContent.includes('BROWSE_BOOTSTRAP_RESULT')).toBe(true);
  });

  test('declares PROJECT_TYPE_RESULT', () => {
    expect(hookContent.includes('PROJECT_TYPE_RESULT')).toBe(true);
  });

  test('declares HAS_SUPABASE', () => {
    expect(hookContent.includes('HAS_SUPABASE')).toBe(true);
  });
});
