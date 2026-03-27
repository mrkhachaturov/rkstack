import type { TemplateContext } from './types';

/**
 * AskUserQuestion format — universal pattern for all skills.
 * Based on gstack's re-ground → simplify → recommend → options pattern.
 */
export function generateAskFormat(_ctx: TemplateContext): string {
  return `### AskUserQuestion format

When asking the user a question, follow this structure:

1. **Re-ground** (1-2 sentences): project name, branch, what you're working on
2. **Simplify** (plain English): what the problem is, no jargon, use analogies if helpful
3. **Recommend** (with reasoning): always prefer the complete option
   - Include \`Completeness: X/10\` for each option (10 = all edges, 7 = happy path, 3 = shortcut)
   - Show effort: \`(human: ~X days / CC: ~Y min)\`
4. **Options** (lettered): A, B, C — one decision per question, never batch multiple decisions`;
}

/**
 * Escalation protocol — when to stop retrying and ask for help.
 */
export function generateEscalation(_ctx: TemplateContext): string {
  return `### Escalation protocol

After 3 failed attempts at any operation, stop and report:

\`\`\`
STATUS: BLOCKED
REASON: [1-2 sentences describing what failed]
ATTEMPTED: [what was tried, max 3 items]
RECOMMENDATION: [concrete next step for the user]
\`\`\`

Do not retry indefinitely. Do not work around the problem silently.`;
}

/**
 * Completeness principle — always prefer full implementation.
 * Based on gstack's "Boil the Lake" philosophy.
 */
export function generateCompleteness(_ctx: TemplateContext): string {
  return `### Completeness principle

AI makes the marginal cost of completeness near-zero. Always prefer the full
implementation over shortcuts:

- Completeness 10/10: all edge cases, error handling, tests, documentation
- Completeness 7/10: happy path works, some edge cases skipped
- Completeness 3/10: proof of concept, significant work deferred

When presenting options, show completeness scores and effort comparison:
\`(human: ~X days / CC: ~Y min)\`. Recommend the most complete option.`;
}
