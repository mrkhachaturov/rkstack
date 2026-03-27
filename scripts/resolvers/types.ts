/** Supported host platforms */
export type Host = 'claude' | 'codex' | 'gemini';

/** Host-specific path configuration */
export interface HostPaths {
  /** Root of the installed plugin (e.g. ~/.claude/plugins/rkstack) */
  skillRoot: string;
  /** Local (repo-relative) plugin root */
  localSkillRoot: string;
  /** Directory for CLI utilities */
  binDir: string;
}

/** Per-host path defaults */
export const HOST_PATHS: Record<Host, HostPaths> = {
  claude: {
    skillRoot: '~/.claude/plugins/rkstack',
    localSkillRoot: '.claude/plugins/rkstack',
    binDir: '~/.claude/plugins/rkstack/bin',
  },
  codex: {
    skillRoot: '$RKSTACK_ROOT',
    localSkillRoot: '.agents/skills/rkstack',
    binDir: '$RKSTACK_BIN',
  },
  gemini: {
    skillRoot: '~/.gemini/plugins/rkstack',
    localSkillRoot: '.gemini/plugins/rkstack',
    binDir: '~/.gemini/plugins/rkstack/bin',
  },
};

/** Context passed to every placeholder resolver */
export interface TemplateContext {
  /** Skill name (from frontmatter `name:` or directory name) */
  skillName: string;
  /** Absolute path to the .tmpl file */
  tmplPath: string;
  /** Prerequisite skills (from frontmatter `benefits-from:`) */
  benefitsFrom?: string[];
  /** Which host we're generating for */
  host: Host;
  /** Host-specific paths */
  paths: HostPaths;
  /** Preamble tier 1-4 (from frontmatter `preamble-tier:`) */
  preambleTier?: number;
}

/** A placeholder resolver: takes context, returns the replacement string */
export type Resolver = (ctx: TemplateContext) => string;
