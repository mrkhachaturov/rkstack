---
name: writing-rkstack-skills
description: |
  Use when creating or editing skills for the rkstack plugin itself.
  Covers the template system, preamble tiers, resolvers, and build workflow.
  This is a contributor-only skill -- not shipped to end users.
---

# Writing RKstack Skills

This skill is for contributors to the rkstack plugin. It covers the template system,
preamble tiers, resolvers, and build workflow that turn `.tmpl` files into the
generated `SKILL.md` files that ship to users.

For general skill authoring guidance (TDD for skills, CSO, testing methodology),
use the **writing-skills** skill instead. This skill covers rkstack-specific
infrastructure only.

## Template System

RKstack uses a template system to generate skill documentation. Human authors
write `.tmpl` files; the build system resolves placeholders and produces the final
`SKILL.md` that Claude reads at load time.

```
skills/{name}/SKILL.md.tmpl         <- human writes template + {{PLACEHOLDERS}}
scripts/gen-skill-docs.ts           <- reads .tmpl, resolves placeholders, writes .md
skills/{name}/SKILL.md              <- generated, committed, tagged AUTO-GENERATED
```

**Never edit SKILL.md directly.** Always edit the `.tmpl`. The generated file will
be overwritten on next build.

## File Layout

```
skills/{name}/
  SKILL.md.tmpl         # human-authored template (source of truth)
  SKILL.md              # generated output (committed, read by Claude)
  companion-file.md     # hand-authored reference (not templated)
```

## Frontmatter Format

Every `.tmpl` starts with YAML frontmatter between `---` delimiters:

```yaml
---
name: skill-name-with-hyphens
preamble-tier: 2
version: 1.0.0
description: |
  Use when [specific triggering conditions and symptoms].
  Third person. Under 500 characters preferred. Max 1024 characters total.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
```

### Required Fields

- `name` -- letters, numbers, hyphens only. Use gerund form when natural
  (e.g., `writing-plans`, `requesting-code-review`).
- `preamble-tier` -- integer 1-4, controls how much context the preamble injects.
- `version` -- semver string.
- `description` -- starts with action verbs or "Use when...". Describes ONLY
  triggering conditions, NOT the skill's workflow. Third person.
- `allowed-tools` -- list of tools the skill needs.

### Optional Fields

- `benefits-from` -- list of other skills this skill may invoke or reference.

## Preamble Tier System

The preamble is a bash block injected at the top of every generated SKILL.md.
It runs first when Claude loads a skill, collecting project context. Higher tiers
include everything from lower tiers.

| Tier | What It Adds | Use For |
|------|-------------|---------|
| **T1** | Core: scc detection, branch, repo-mode, CLAUDE.md check, completion status | Lightweight utility skills (careful, freeze, guard, using-rkstack) |
| **T2** | T1 + AskUserQuestion format + Completeness principle | Moderate workflow skills (debugging, plans, verification, writing-skills) |
| **T3** | T2 + Repo ownership section + Search Before Building | Heavy workflow skills needing repo context (TDD, code-review, shipping) |
| **T4** | Same as T3 (reserved for future critical gate skills) | Future: deploy, QA, release gate skills |

**Choosing a tier:**
- If the skill asks the user questions, it needs T2+ (for AskUserQuestion format).
- If it modifies code or needs to understand repo ownership, it needs T3+.
- If it is a simple guard or reference, T1 is sufficient.

**Important:** AskUserFormat, Completeness, Escalation, and RepoMode are **sections
within the preamble** -- not separate `{{PLACEHOLDER}}`s. This matches gstack's design.

## The {{PREAMBLE}} Placeholder

After frontmatter, the first line of every `.tmpl` should be:

```
{{PREAMBLE}}
```

This is resolved by the build system into the appropriate preamble block for the
skill's tier. The preamble collects project context (language detection, branch info,
CLAUDE.md location) that subsequent skill content can reference.

## Resolver System

Placeholders follow the pattern `{{NAME}}` (uppercase letters and underscores between
double braces) and are resolved by functions in `scripts/resolvers/`.

### Existing Resolvers

| Placeholder | Resolver | What It Produces |
|-------------|----------|-----------------|
| `{{PREAMBLE}}` | `scripts/resolvers/preamble.ts` | Tier-based preamble block |
| `{{TEST_FAILURE_TRIAGE}}` | `scripts/resolvers/` | Test failure analysis steps |
| `{{BASE_BRANCH_DETECT}}` | `scripts/resolvers/utility.ts` | Dynamic main/master detection |

### Adding a New Placeholder

1. Check how gstack does it in `.upstreams/gstack/scripts/resolvers/`
2. Create resolver function in `scripts/resolvers/`
3. Register in `scripts/resolvers/index.ts`
4. Use `{{PLACEHOLDER_NAME}}` in any `.tmpl`

The build system will fail on any unresolved placeholder, so you will catch
mistakes immediately.

## Companion Files

Files like `testing-skills-with-subagents.md`, `persuasion-principles.md`, or
`visual-companion.md` are hand-authored and live alongside the template. They
are NOT processed by the template system. Reference them from the skill with
relative paths.

## Skill Authoring Rules

### Natural language for logic, bash for execution

Each bash block in a skill runs in a separate shell. There is no variable
persistence between blocks. Pass state through prose (natural language
instructions), not shell variables.

### Numbered decision steps, not nested if/else

LLMs parse prose better than nested conditionals. Use numbered steps with
clear decision points:

```markdown
1. Check if tests exist for the module
2. If no tests exist: create test file first (RED)
3. If tests exist: run them to establish baseline
4. Based on results, choose approach A or B
```

### One decision per AskUserQuestion

Never batch multiple decisions into a single question. Each AskUserQuestion
should present ONE choice with lettered options.

### Never hardcode framework commands

Read from the target project's CLAUDE.md for test commands, build commands,
lint commands. If CLAUDE.md doesn't specify, ask the user with AskUserQuestion
and record the answer.

### .tmpl files are prompt templates, not bash scripts

Use natural language for logic and `<placeholder>` tokens for runtime values.
The template is read by an LLM, not executed as a program.

## Checking Upstreams

Before writing any new skill or infrastructure:

1. **Check gstack first:** `.upstreams/gstack/` -- does gstack have this skill
   or pattern? If yes, study their version and follow it.
2. **Check superpowers:** `.upstreams/superpowers/` -- does superpowers have
   content for this? If yes, use as content reference.
3. **Adapt, don't copy:** Study the pattern, then write your own version
   following that pattern.

Do not copy files from upstreams directly. Do not hand-edit `.upstreams/`.

## Build Workflow

### Creating a New Skill

1. Create `skills/{name}/SKILL.md.tmpl` with proper frontmatter
2. Add `{{PREAMBLE}}` as first placeholder after frontmatter
3. Add companion files alongside if needed (hand-authored)
4. Build and verify:

```bash
just build          # generate SKILL.md from template
just check          # verify generated files are up to date (--dry-run)
just skill-check    # health dashboard -- all green?
```

5. Test the skill (use the writing-skills skill for methodology)
6. Commit both `.tmpl` and generated `.md`

### Editing an Existing Skill

1. Edit `skills/{name}/SKILL.md.tmpl` (NEVER edit SKILL.md directly)
2. Run `just build` to regenerate
3. Run `just check` to verify
4. Test the change
5. Commit both `.tmpl` and generated `.md`

### Merge Conflicts on SKILL.md

NEVER resolve conflicts on generated SKILL.md files by accepting either side.
Instead:

1. Resolve conflicts on the `.tmpl` templates and resolver source files
2. Run `just build` to regenerate all SKILL.md files
3. Stage the regenerated files

Accepting one side's generated output silently drops the other side's template changes.

## Cross-Skill Reference Conventions

When referencing other rkstack skills from within a skill template:

- Use the skill name directly: "Use the **verification-before-completion** skill"
- Mark dependencies: `**REQUIRED BACKGROUND:** You MUST understand test-driven-development`
- Do not use `@` links (force-loads, burns context)
- Do not use file paths (fragile, unclear if required)

## Anti-Patterns

**Editing SKILL.md directly** -- Always edit the `.tmpl`. The generated file will
be overwritten.

**Inventing patterns when gstack has one** -- Check `.upstreams/gstack/` first.

**Separate placeholders for preamble content** -- AskUserFormat, Completeness,
RepoMode belong INSIDE the preamble, not as separate `{{PLACEHOLDER}}`s.

**Hardcoding project commands** -- Read from CLAUDE.md or ask the user.

**Resolving merge conflicts by accepting a side** -- Regenerate from templates.

## Quick Reference

| Task | Command |
|------|---------|
| Generate all SKILL.md | `just build` |
| Verify freshness | `just check` |
| Health dashboard | `just skill-check` |
| Watch mode | `just dev` |
| Run tests | `bun test` |
| Generate for Codex | `bun scripts/gen-skill-docs.ts --host codex` |

## Contributor Checklist

- [ ] Edited `.tmpl` (not `.md`)
- [ ] `{{PREAMBLE}}` is first line after frontmatter
- [ ] Frontmatter has all required fields (name, preamble-tier, version, description, allowed-tools)
- [ ] Tier chosen appropriately (see Preamble Tier System)
- [ ] Checked gstack and superpowers upstreams
- [ ] No hardcoded framework commands
- [ ] `just build` succeeds
- [ ] `just check` passes
- [ ] `just skill-check` shows green
- [ ] `bun test` passes
- [ ] Committed both `.tmpl` and `.md`
