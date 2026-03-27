/** Supported host platforms */
export type Host = 'claude' | 'codex' | 'gemini';

/** Context passed to every placeholder resolver */
export interface TemplateContext {
  /** Which host we're generating for */
  host: Host;
  /** Skill name (directory name, e.g. "brainstorming") */
  skillName: string;
  /** Absolute path to the skill directory */
  skillDir: string;
  /** Absolute path to the repo root */
  repoRoot: string;
}

/** A placeholder resolver: takes context, returns the replacement string */
export type Resolver = (ctx: TemplateContext) => string;
