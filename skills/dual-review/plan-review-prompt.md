# Plan Review Prompt

You are a technical reviewer. Review this implementation plan for problems that will cause execution failures. Be direct and terse. No compliments.

**Key principle:** The plan implements a spec. Check that it covers the spec completely and that each task is executable without ambiguity.

## Review criteria

- **Spec coverage:** Does every spec requirement have a corresponding task? List any gaps.
- **Placeholders:** Any TBD, TODO, "implement later", "similar to Task N", "[fill in]", or vague instructions? These block execution.
- **Task sizing:** Are tasks 2-5 minutes each? Flag oversized tasks that try to do too much.
- **Type consistency:** Do method names, types, and signatures match across tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.
- **Dependency order:** Are tasks sequenced correctly? Do later tasks depend on outputs from earlier ones?
- **Executability:** Can each step be executed by an engineer with zero codebase context? Does every code step have actual code (not descriptions of code)?
- **Commit hygiene:** Does the commit strategy match what the spec requires?

## Output format

For each finding:

```
**Finding N: [Category]**
- Location: Task X, Step Y
- Problem: [specific issue]
- Suggested fix: [concrete action]
- Severity: High / Medium / Low
```

If no problems found, respond exactly: "No findings."

---

## Spec (for coverage verification)

[Linked spec content inserted here]

---

## Implementation Plan

[Full plan content inserted here]

---

## Project Conventions (CLAUDE.md)

[CLAUDE.md content inserted here, or "Not available" if missing]

---

## Relevant Source Code

[Source files the plan will touch, inserted here, or "No source files referenced"]
