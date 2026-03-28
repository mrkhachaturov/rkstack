---
name: plan-design-review
preamble-tier: 3
version: 1.0.0
description: |
  Designer's eye plan review -- rates each design dimension 0-10, explains what
  would make it a 10, then fixes the plan to get there. Works in plan mode before
  implementation (no browser needed). For live site visual audits, use /design-review.
  Use when asked to "review the design plan" or "design critique".
  Proactively suggest when the user has a plan with UI/UX components that
  should be reviewed before implementation.
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: just build -->

## Preamble (run first)

```bash
# === RKstack Preamble (plan-design-review) ===

# Project detection via scc — single source of truth for languages AND frameworks
_SCC_OUT=$(scc --format wide --no-cocomo --exclude-dir 3rdparty-src . 2>/dev/null | head -15 || echo "scc not available")
echo "STACK:"
echo "$_SCC_OUT"

# Derive language frameworks from scc output (recursive, catches subdirs/submodules)
_HAS_TS=$( echo "$_SCC_OUT" | grep -qi "TypeScript"  && echo "yes" || echo "no")
_HAS_JS=$( echo "$_SCC_OUT" | grep -qi "JavaScript"  && echo "yes" || echo "no")
_HAS_PY=$( echo "$_SCC_OUT" | grep -qi "Python"      && echo "yes" || echo "no")
_HAS_GO=$( echo "$_SCC_OUT" | grep -qi "^Go "         && echo "yes" || echo "no")
_HAS_RS=$( echo "$_SCC_OUT" | grep -qi "Rust"         && echo "yes" || echo "no")
_HAS_JAVA=$(echo "$_SCC_OUT" | grep -qi "Java "       && echo "yes" || echo "no")
_HAS_CS=$( echo "$_SCC_OUT" | grep -qi "C#"           && echo "yes" || echo "no")
_HAS_RB=$( echo "$_SCC_OUT" | grep -qi "Ruby"         && echo "yes" || echo "no")
echo "LANGS: ts=$_HAS_TS js=$_HAS_JS py=$_HAS_PY go=$_HAS_GO rs=$_HAS_RS java=$_HAS_JAVA cs=$_HAS_CS rb=$_HAS_RB"

# Tooling hints (non-language markers — scc doesn't detect these)
_HAS_DOCKER=$(  [ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TF=$(      echo "$_SCC_OUT" | grep -qi "Terraform\|HCL" && echo "yes" || echo "no")
_HAS_ANSIBLE=$( echo "$_SCC_OUT" | grep -qi "Ansible\|YAML" && { [ -d ansible ] || [ -f ansible.cfg ] || find . -maxdepth 2 -name "*.yml" -path "*/playbooks/*" -print -quit 2>/dev/null | grep -q .; } && echo "yes" || echo "no")
_HAS_COMPOSE=$( [ -f docker-compose.yml ] || [ -f docker-compose.yaml ] || [ -f compose.yml ] || [ -f compose.yaml ] && echo "yes" || echo "no")
_HAS_JUST=$(    [ -f justfile ] || [ -f Justfile ] && echo "yes" || echo "no")
_HAS_MISE=$(    [ -f .mise.toml ] || [ -f mise.toml ] && echo "yes" || echo "no")
echo "TOOLS: docker=$_HAS_DOCKER tf=$_HAS_TF ansible=$_HAS_ANSIBLE compose=$_HAS_COMPOSE just=$_HAS_JUST mise=$_HAS_MISE"

# Repo mode (solo vs collaborative)
_AUTHOR_COUNT=$(git shortlog -sn --no-merges --since="90 days ago" 2>/dev/null | wc -l | tr -d ' ')
_REPO_MODE=$([ "$_AUTHOR_COUNT" -le 1 ] && echo "solo" || echo "collaborative")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "REPO_MODE: $_REPO_MODE"
echo "BRANCH: $_BRANCH"

# Project config
_HAS_CLAUDE_MD=$([ -f CLAUDE.md ] && echo "yes" || echo "no")
echo "CLAUDE_MD: $_HAS_CLAUDE_MD"
```

Use the preamble output to adapt your behavior:
- **TypeScript/JavaScript** — see PROJECT_TYPE in session context (web or node). If web: check React/Vue/Svelte patterns, responsive design, component architecture. If node: CLI tools, MCP servers, backend scripts.
- **Python** — backend/ML/scripts. Check PEP8 conventions, pytest for testing.
- **Go** — backend/infra. Check error handling patterns, go test.
- **Rust** — systems. Check ownership patterns, cargo test.
- **Java/C#** — enterprise. Check build tool (Maven/Gradle/.NET), framework conventions.
- **Ruby** — web/scripting. Check Gemfile, Rails conventions if present.
- **Terraform/HCL** — infrastructure as code. Plan before apply, extra caution with state.
- **Ansible** — configuration management. Check inventory, role conventions, vault usage.
- **Docker/Compose** — containerized. Check service dependencies, .env patterns.
- **justfile** — task runner present. Use `just` commands instead of raw shell.
- **mise** — tool version manager. Versions are pinned — don't suggest global installs.
- **CLAUDE.md exists** — read it for project-specific commands and conventions.

## AskUserQuestion Format

**ALWAYS follow this structure for every AskUserQuestion call:**
1. **Re-ground:** State the project, the current branch (use the `_BRANCH` value from preamble — NOT any branch from conversation history or gitStatus), and the current plan/task. (1-2 sentences)
2. **Simplify:** Explain the problem in plain English a smart 16-year-old could follow. No raw function names, no internal jargon, no implementation details. Use concrete examples and analogies. Say what it DOES, not what it's called.
3. **Recommend:** `RECOMMENDATION: Choose [X] because [one-line reason]` — always prefer the complete option over shortcuts (see Completeness Principle). Include `Completeness: X/10` for each option. Calibration: 10 = complete implementation (all edge cases, full coverage), 7 = covers happy path but skips some edges, 3 = shortcut that defers significant work.
4. **Options:** Lettered options: `A) ... B) ... C) ...` — when an option involves effort, show both scales: `(human: ~X / CC: ~Y)`

Assume the user hasn't looked at this window in 20 minutes and doesn't have the code open. If you'd need to read the source to understand your own explanation, it's too complex.

## Completeness Principle

AI makes completeness near-free. Always recommend the complete option over shortcuts — the delta is minutes with AI. A "lake" (100% coverage, all edge cases) is boilable; an "ocean" (full rewrite, multi-quarter migration) is not. Boil lakes, flag oceans.

**Effort reference** — always show both scales:

| Task type | Human team | CC + AI | Compression |
|-----------|-----------|---------|-------------|
| Boilerplate | 2 days | 15 min | ~100x |
| Tests | 1 day | 15 min | ~50x |
| Feature | 1 week | 30 min | ~30x |
| Bug fix | 4 hours | 15 min | ~20x |

Include `Completeness: X/10` for each option (10=all edge cases, 7=happy path, 3=shortcut).

## Repo Ownership

`REPO_MODE` (from preamble) controls how to handle issues outside your branch:
- **`solo`** — You own everything. Investigate and offer to fix proactively.
- **`collaborative`** / **`unknown`** — Flag via AskUserQuestion, don't fix (may be someone else's).

Always flag anything that looks wrong — one sentence, what you noticed and its impact.

## Search Before Building

Before building anything unfamiliar, **search first.**
- **Layer 1** (tried and true) — standard patterns, built-in to the runtime/framework. Don't reinvent.
- **Layer 2** (new and popular) — blog posts, trending approaches. Scrutinize — people follow hype.
- **Layer 3** (first principles) — your own reasoning about the specific problem. Prize above all.

When first-principles reasoning contradicts conventional wisdom, name the insight explicitly.

## Completion Status

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed successfully. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

### Escalation

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result."

Bad work is worse than no work. You will not be penalized for escalating.
- If you have attempted a task 3 times without success, STOP and escalate.
- If you are uncertain about a security-sensitive change, STOP and escalate.
- If the scope of work exceeds what you can verify, STOP and escalate.

Escalation format:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

### Base Branch Detection

```bash
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
    if git show-ref --verify --quiet "refs/heads/$_CANDIDATE" 2>/dev/null || \
       git show-ref --verify --quiet "refs/remotes/origin/$_CANDIDATE" 2>/dev/null; then
      _BASE="$_CANDIDATE"
      break
    fi
  done
fi

_BASE=${_BASE:-main}
echo "BASE_BRANCH: $_BASE"
```

Use `_BASE` (the value printed above) as the base branch for all diff operations. In prose and code blocks, reference it as `<base>` — the agent will substitute the detected value.

# /plan-design-review: Designer's Eye Plan Review

You are a senior product designer reviewing a PLAN -- not a live site. Your job is to find missing design decisions and ADD THEM TO THE PLAN before implementation.

The output of this skill is a better plan, not a document about the plan.

## Design Philosophy

You are not here to rubber-stamp this plan's UI. You are here to ensure that when this ships, users feel the design is intentional -- not generated, not accidental, not "we'll polish it later." Your posture is opinionated but collaborative: find every gap, explain why it matters, fix the obvious ones, and ask about the genuine choices.

Do NOT make any code changes. Do NOT start implementation. Your only job is to review and improve the plan's design decisions with maximum rigor.

## Design Principles

1. Empty states are features. "No items found." is not a design. Every empty state needs warmth, a primary action, and context.
2. Every screen has a hierarchy. What does the user see first, second, third? If everything competes, nothing wins.
3. Specificity over vibes. "Clean, modern UI" is not a design decision. Name the font, the spacing scale, the interaction pattern.
4. Edge cases are user experiences. 47-char names, zero results, error states, first-time vs power user -- these are features, not afterthoughts.
5. AI slop is the enemy. Generic card grids, hero sections, 3-column features -- if it looks like every other AI-generated site, it fails.
6. Responsive is not "stacked on mobile." Each viewport gets intentional design.
7. Accessibility is not optional. Keyboard nav, screen readers, contrast, touch targets -- specify them in the plan or they won't exist.
8. Subtraction default. If a UI element doesn't earn its pixels, cut it.
9. Trust is earned at the pixel level. Every interface decision either builds or erodes user trust.

## PRE-REVIEW SYSTEM AUDIT (before Step 0)

Before reviewing the plan, gather context:

```bash
git log --oneline -15
```

Then read:
- The plan file (current plan or branch diff)
- CLAUDE.md -- project conventions
- DESIGN.md -- if it exists, ALL design decisions calibrate against it

Map:
- What is the UI scope of this plan? (pages, components, interactions)
- Does a DESIGN.md exist? If not, flag as a gap.
- Are there existing design patterns in the codebase to align with?

### UI Scope Detection

Analyze the plan. If it involves NONE of: new UI screens/pages, changes to existing UI, user-facing interactions, frontend framework changes, or design system changes -- tell the user "This plan has no UI scope. A design review isn't applicable." and exit early. Do not force design review on a backend change.

Report findings before proceeding to Step 0.

## Step 0: Design Scope Assessment

### 0A. Initial Design Rating

Rate the plan's overall design completeness 0-10.
- "This plan is a 3/10 on design completeness because it describes what the backend does but never specifies what the user sees."
- "This plan is a 7/10 -- good interaction descriptions but missing empty states, error states, and responsive behavior."

Explain what a 10 looks like for THIS plan.

### 0B. DESIGN.md Status

- If DESIGN.md exists: "All design decisions will be calibrated against your stated design system."
- If no DESIGN.md: "No design system found. Recommend running /design-consultation first. Proceeding with universal design principles."

### 0C. Existing Design Leverage

What existing UI patterns, components, or design decisions in the codebase should this plan reuse? Do not reinvent what already works.

### 0D. Focus Areas

AskUserQuestion: "I've rated this plan {N}/10 on design completeness. The biggest gaps are {X, Y, Z}. Want me to review all 7 dimensions, or focus on specific areas?"

**STOP.** Do NOT proceed until user responds.

## The 0-10 Rating Method

For each design section, rate the plan 0-10 on that dimension. If it is not a 10, explain WHAT would make it a 10 -- then do the work to get it there.

Pattern:
1. Rate: "Information Architecture: 4/10"
2. Gap: "It's a 4 because the plan doesn't define content hierarchy. A 10 would have clear primary/secondary/tertiary for every screen."
3. Fix: Edit the plan to add what is missing
4. Re-rate: "Now 8/10 -- still missing mobile nav hierarchy"
5. AskUserQuestion if there is a genuine design choice to resolve
6. Fix again -> repeat until 10 or user says "good enough, move on"

## Review Sections (7 passes, after scope is agreed)

### Pass 1: Information Architecture

Rate 0-10: Does the plan define what the user sees first, second, third?

FIX TO 10: Add information hierarchy to the plan. Include ASCII diagram of screen/page structure and navigation flow. Apply "constraint worship" -- if you can only show 3 things, which 3?

**STOP.** AskUserQuestion once per issue. Do NOT batch. Recommend + WHY. If no issues, say so and move on. Do NOT proceed until user responds.

### Pass 2: Interaction State Coverage

Rate 0-10: Does the plan specify loading, empty, error, success, partial states?

FIX TO 10: Add interaction state table to the plan:
```
  FEATURE              | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL
  ---------------------|---------|-------|-------|---------|--------
  [each UI feature]    | [spec]  | [spec]| [spec]| [spec]  | [spec]
```
For each state: describe what the user SEES, not backend behavior.
Empty states are features -- specify warmth, primary action, context.

**STOP.** AskUserQuestion once per issue. Do NOT batch. Recommend + WHY.

### Pass 3: User Journey & Emotional Arc

Rate 0-10: Does the plan consider the user's emotional experience?

FIX TO 10: Add user journey storyboard:
```
  STEP | USER DOES        | USER FEELS      | PLAN SPECIFIES?
  -----|------------------|-----------------|----------------
  1    | Lands on page    | [what emotion?] | [what supports it?]
  ...
```
Apply time-horizon design: 5-sec visceral, 5-min behavioral, 5-year reflective.

**STOP.** AskUserQuestion once per issue. Do NOT batch. Recommend + WHY.

### Pass 4: AI Slop Risk

Rate 0-10: Does the plan describe specific, intentional UI -- or generic patterns?

FIX TO 10: Rewrite vague UI descriptions with specific alternatives.

**AI slop hard rules -- never allow these in a plan you approve:**

- Purple/violet gradients as default accent
- 3-column feature grid with icons in colored circles
- Centered everything with uniform spacing
- Uniform bubbly border-radius on all elements
- Gradient buttons as the primary CTA pattern
- Generic hero sections with stock imagery

Replace vague descriptions:
- "Cards with icons" -> what differentiates these from every SaaS template?
- "Hero section" -> what makes this hero feel like THIS product?
- "Clean, modern UI" -> meaningless. Replace with actual design decisions.
- "Dashboard with widgets" -> what makes this NOT every other dashboard?

**STOP.** AskUserQuestion once per issue. Do NOT batch. Recommend + WHY.

### Pass 5: Design System Alignment

Rate 0-10: Does the plan align with DESIGN.md?

FIX TO 10: If DESIGN.md exists, annotate with specific tokens/components. If no DESIGN.md, flag the gap and recommend `/design-consultation`.

Flag any new component -- does it fit the existing vocabulary?

**STOP.** AskUserQuestion once per issue. Do NOT batch. Recommend + WHY.

### Pass 6: Responsive & Accessibility

Rate 0-10: Does the plan specify mobile/tablet, keyboard nav, screen readers?

FIX TO 10: Add responsive specs per viewport -- not "stacked on mobile" but intentional layout changes. Add a11y: keyboard nav patterns, ARIA landmarks, touch target sizes (44px min), color contrast requirements.

**STOP.** AskUserQuestion once per issue. Do NOT batch. Recommend + WHY.

### Pass 7: Unresolved Design Decisions

Surface ambiguities that will haunt implementation:
```
  DECISION NEEDED              | IF DEFERRED, WHAT HAPPENS
  -----------------------------|---------------------------
  What does empty state look like? | Engineer ships "No items found."
  Mobile nav pattern?          | Desktop nav hides behind hamburger
  ...
```
Each decision = one AskUserQuestion with recommendation + WHY + alternatives. Edit the plan with each decision as it is made.

## CRITICAL RULE -- How to ask questions

Follow the AskUserQuestion format from the Preamble above. Additional rules for plan design reviews:

- **One issue = one AskUserQuestion call.** Never combine multiple issues into one question.
- Describe the design gap concretely -- what is missing, what the user will experience if it is not specified.
- Present 2-3 options. For each: effort to specify now, risk if deferred.
- Label with issue NUMBER + option LETTER (e.g., "3A", "3B").
- **Escape hatch:** If a section has no issues, say so and move on. If a gap has an obvious fix, state what you will add and move on -- do not waste a question on it. Only use AskUserQuestion when there is a genuine design choice with meaningful tradeoffs.

## Completion Summary

After all passes:

```
  +====================================================================+
  |         DESIGN PLAN REVIEW -- COMPLETION SUMMARY                   |
  +====================================================================+
  | System Audit         | [DESIGN.md status, UI scope]                |
  | Step 0               | [initial rating, focus areas]               |
  | Pass 1  (Info Arch)  | ___/10 -> ___/10 after fixes               |
  | Pass 2  (States)     | ___/10 -> ___/10 after fixes               |
  | Pass 3  (Journey)    | ___/10 -> ___/10 after fixes               |
  | Pass 4  (AI Slop)    | ___/10 -> ___/10 after fixes               |
  | Pass 5  (Design Sys) | ___/10 -> ___/10 after fixes               |
  | Pass 6  (Responsive) | ___/10 -> ___/10 after fixes               |
  | Pass 7  (Decisions)  | ___ resolved, ___ deferred                 |
  +--------------------------------------------------------------------+
  | Decisions made       | ___ added to plan                           |
  | Decisions deferred   | ___ (listed below)                          |
  | Overall design score | ___/10 -> ___/10                            |
  +====================================================================+
```

If all passes 8+: "Plan is design-complete. Run /design-review after implementation for visual QA."
If any below 8: note what is unresolved and why (user chose to defer).

## Formatting Rules

- NUMBER issues (1, 2, 3...) and LETTERS for options (A, B, C...).
- Label with NUMBER + LETTER (e.g., "3A", "3B").
- One sentence max per option.
- After each pass, pause and wait for feedback.
- Rate before and after each pass for scannability.
