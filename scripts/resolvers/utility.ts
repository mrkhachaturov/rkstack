import type { TemplateContext } from './types';

/**
 * Detect the base branch (main/master/develop) across platforms.
 * Used by skills that need to diff against the merge target.
 */
export function generateBaseBranchDetect(_ctx: TemplateContext): string {
  return `### Base Branch Detection

\`\`\`bash
# Detect base branch — try platform tools first, fall back to git
_BASE=""

# GitHub
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  _BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || true)
fi

# GitLab
if [ -z "$_BASE" ] && command -v glab &>/dev/null; then
  _BASE=$(glab mr view --output json 2>/dev/null | grep -o '"target_branch":"[^"]*"' | cut -d'"' -f4 || true)
fi

# Plain git fallback
if [ -z "$_BASE" ]; then
  for _CANDIDATE in main master develop; do
    if git show-ref --verify --quiet "refs/heads/$_CANDIDATE" 2>/dev/null || \\
       git show-ref --verify --quiet "refs/remotes/origin/$_CANDIDATE" 2>/dev/null; then
      _BASE="$_CANDIDATE"
      break
    fi
  done
fi

_BASE=\${_BASE:-main}
echo "BASE_BRANCH: $_BASE"
\`\`\`

Use \`_BASE\` (the value printed above) as the base branch for all diff operations. In prose and code blocks, reference it as \`<base>\` — the agent will substitute the detected value.`;
}
