# Plan Review Criteria

Review this implementation plan for problems that will cause execution failures. Be direct and terse.

**Key principle:** The plan implements a spec. Check coverage and executability.

## What to check

- **Spec coverage:** Does every spec requirement have a corresponding task?
- **Placeholders:** Any TBD, TODO, "implement later", vague instructions?
- **Task sizing:** Are tasks 2-5 minutes each?
- **Type consistency:** Do names, types, and signatures match across tasks?
- **Dependency order:** Are tasks sequenced correctly?
- **Executability:** Can each step be executed with zero codebase context?

## Output format

For each finding:

**Finding N: [Title]**

- Location: Task X, Step Y
- Severity: High/Medium/Low
- Problem: [what's wrong]
- Suggestion: [how to fix]

If no findings: "No issues found."
