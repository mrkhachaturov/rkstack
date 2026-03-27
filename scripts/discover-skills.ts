/**
 * Shared discovery for SKILL.md and .tmpl files.
 * Scans two paths:
 *   skills/     → output to skills/     (shipped to users)
 *   dev/skills/ → output to .claude/skills/ (project-local, contributors only)
 *
 * Follows gstack's pattern: flat scan, no recursion, returns relative paths.
 */

import * as fs from 'fs';
import * as path from 'path';

const SKIP = new Set(['node_modules', '.git', 'dist', '.upstreams']);

function subdirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !SKIP.has(d.name))
    .map(d => d.name);
}

/**
 * Find plugin skill templates (shipped to users).
 * Scans: root, skills/{name}/
 */
export function discoverTemplates(repoRoot: string): Array<{ tmpl: string; output: string }> {
  const results: Array<{ tmpl: string; output: string }> = [];

  // Check root SKILL.md.tmpl
  if (fs.existsSync(path.join(repoRoot, 'SKILL.md.tmpl'))) {
    results.push({ tmpl: 'SKILL.md.tmpl', output: 'SKILL.md' });
  }

  // Check skills/{name}/SKILL.md.tmpl (shipped to users)
  const skillsDir = path.join(repoRoot, 'skills');
  for (const dir of subdirs(skillsDir)) {
    const rel = `skills/${dir}/SKILL.md.tmpl`;
    if (fs.existsSync(path.join(repoRoot, rel))) {
      results.push({ tmpl: rel, output: rel.replace(/\.tmpl$/, '') });
    }
  }

  return results.sort((a, b) => a.tmpl.localeCompare(b.tmpl));
}

/**
 * Find dev skill templates (contributor-only).
 * dev/skills/{name}/SKILL.md.tmpl → .claude/skills/{name}/SKILL.md
 * These are plain-copied (no placeholder resolution) since they
 * document the template system and contain literal {{...}} syntax.
 */
export function discoverDevTemplates(repoRoot: string): Array<{ tmpl: string; output: string }> {
  const devSkillsDir = path.join(repoRoot, 'dev', 'skills');
  const results: Array<{ tmpl: string; output: string }> = [];
  for (const dir of subdirs(devSkillsDir)) {
    const tmplRel = `dev/skills/${dir}/SKILL.md.tmpl`;
    if (fs.existsSync(path.join(repoRoot, tmplRel))) {
      results.push({ tmpl: tmplRel, output: `.claude/skills/${dir}/SKILL.md` });
    }
  }

  return results.sort((a, b) => a.tmpl.localeCompare(b.tmpl));
}

/**
 * Find all SKILL.md files (generated or standalone).
 * Scans: root, skills/{name}/, .claude/skills/{name}/
 */
export function discoverSkillFiles(repoRoot: string): string[] {
  const results: string[] = [];

  // Check root SKILL.md
  if (fs.existsSync(path.join(repoRoot, 'SKILL.md'))) {
    results.push('SKILL.md');
  }

  // Check skills/{name}/SKILL.md
  const skillsDir = path.join(repoRoot, 'skills');
  for (const dir of subdirs(skillsDir)) {
    const rel = `skills/${dir}/SKILL.md`;
    if (fs.existsSync(path.join(repoRoot, rel))) {
      results.push(rel);
    }
  }

  // Check .claude/skills/{name}/SKILL.md
  const claudeSkillsDir = path.join(repoRoot, '.claude', 'skills');
  for (const dir of subdirs(claudeSkillsDir)) {
    const rel = `.claude/skills/${dir}/SKILL.md`;
    if (fs.existsSync(path.join(repoRoot, rel))) {
      results.push(rel);
    }
  }

  return results.sort();
}
