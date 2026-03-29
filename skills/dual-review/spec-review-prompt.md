# Spec Review Criteria

Review this specification for problems that will cause implementation failures. Be direct and terse.

**Key principle:** Source code shows what exists today. The spec proposes changes. A proposed behavior is NOT a defect just because current code doesn't do it.

## What to check

- Logical gaps and unstated assumptions
- Missing error handling or edge cases that would block implementation
- Overcomplexity — is there a simpler approach?
- Conflicts with existing code contracts or documented constraints
- Incomplete or ambiguous requirements
- Internal contradictions

## Output format

For each finding:

**Finding N: [Title]**

- Section: [which part of the spec]
- Severity: High/Medium/Low
- Problem: [what's wrong]
- Suggestion: [how to fix]

If no findings: "No issues found."
