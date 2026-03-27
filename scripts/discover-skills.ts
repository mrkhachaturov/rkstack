/**
 * Shared discovery for SKILL.md and .tmpl files.
 * Scans root + one level of subdirs under skills/, skipping node_modules/.git/dist.
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
 * Find all SKILL.md.tmpl files under skillsDir + check root for SKILL.md.tmpl.
 * Returns relative paths from repoRoot.
 */
export function discoverTemplates(repoRoot: string): Array<{ tmpl: string; output: string }> {
  const skillsDir = path.join(repoRoot, 'skills');
  const results: Array<{ tmpl: string; output: string }> = [];

  // Check root SKILL.md.tmpl
  if (fs.existsSync(path.join(repoRoot, 'SKILL.md.tmpl'))) {
    results.push({ tmpl: 'SKILL.md.tmpl', output: 'SKILL.md' });
  }

  // Check skills/{name}/SKILL.md.tmpl (one level deep)
  for (const dir of subdirs(skillsDir)) {
    const rel = `skills/${dir}/SKILL.md.tmpl`;
    if (fs.existsSync(path.join(repoRoot, rel))) {
      results.push({ tmpl: rel, output: rel.replace(/\.tmpl$/, '') });
    }
  }

  return results.sort((a, b) => a.tmpl.localeCompare(b.tmpl));
}

/**
 * Find all SKILL.md files (generated or standalone).
 * Returns relative paths from repoRoot.
 */
export function discoverSkillFiles(repoRoot: string): string[] {
  const skillsDir = path.join(repoRoot, 'skills');
  const results: string[] = [];

  // Check root SKILL.md
  if (fs.existsSync(path.join(repoRoot, 'SKILL.md'))) {
    results.push('SKILL.md');
  }

  // Check skills/{name}/SKILL.md (one level deep)
  for (const dir of subdirs(skillsDir)) {
    const rel = `skills/${dir}/SKILL.md`;
    if (fs.existsSync(path.join(repoRoot, rel))) {
      results.push(rel);
    }
  }

  return results.sort();
}
