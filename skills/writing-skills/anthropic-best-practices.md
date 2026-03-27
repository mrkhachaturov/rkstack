# Skill Authoring Best Practices

> Anthropic's official guidance on writing effective Skills, adapted for RKstack's template system.

Good Skills are concise, well-structured, and tested with real usage. This guide provides practical authoring decisions to help you write Skills that Claude can discover and use effectively.

## Core Principles

### Concise is Key

The context window is a shared resource. Your Skill shares it with:

* The system prompt
* Conversation history
* Other Skills' metadata
* The actual request

At startup, only metadata (name and description) from all Skills is pre-loaded. Claude reads SKILL.md only when the Skill becomes relevant, and reads additional files only as needed. Being concise still matters: once Claude loads it, every token competes with conversation history and other context.

**Default assumption**: Claude is already very smart

Only add context Claude doesn't already have. Challenge each piece of information:

* "Does Claude really need this explanation?"
* "Can I assume Claude knows this?"
* "Does this paragraph justify its token cost?"

**Good example: Concise** (approximately 50 tokens):

````markdown
## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

**Bad example: Too verbose** (approximately 150 tokens):

```markdown
## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library. There are many libraries available for PDF processing, but we
recommend pdfplumber because it's easy to use and handles most cases well.
First, you'll need to install it using pip. Then you can use the code below...
```

The concise version assumes Claude knows what PDFs are and how libraries work.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability.

**High freedom** (text-based instructions) — use when multiple approaches are valid:

```markdown
## Code review process

1. Analyze the code structure and organization
2. Check for potential bugs or edge cases
3. Suggest improvements for readability and maintainability
4. Verify adherence to project conventions
```

**Medium freedom** (pseudocode or scripts with parameters) — use when a preferred pattern exists:

````markdown
## Generate report

Use this template and customize as needed:

```python
def generate_report(data, format="markdown", include_charts=True):
    # Process data
    # Generate output in specified format
    # Optionally include visualizations
```
````

**Low freedom** (specific scripts, few or no parameters) — use when consistency is critical:

````markdown
## Database migration

Run exactly this script:

```bash
python scripts/migrate.py --verify --backup
```

Do not modify the command or add additional flags.
````

**Analogy**: Think of Claude as a robot exploring a path:

* **Narrow bridge with cliffs**: Only one safe way forward. Provide specific guardrails (low freedom). Example: database migrations.
* **Open field with no hazards**: Many paths lead to success. Give general direction (high freedom). Example: code reviews.

### Test with All Models You Plan to Use

Skills act as additions to models, so effectiveness depends on the underlying model.

* **Claude Haiku** (fast, economical): Does the Skill provide enough guidance?
* **Claude Sonnet** (balanced): Is the Skill clear and efficient?
* **Claude Opus** (powerful reasoning): Does the Skill avoid over-explaining?

What works perfectly for Opus might need more detail for Haiku.

## Skill Structure

### Naming Conventions

Use consistent naming patterns. We recommend **gerund form** (verb + -ing):

**Good naming examples:**
* "writing-plans"
* "requesting-code-review"
* "systematic-debugging"
* "test-driven-development"

**Avoid:**
* Vague names: "Helper", "Utils", "Tools"
* Overly generic: "Documents", "Data", "Files"
* Inconsistent patterns within your skill collection

### Writing Effective Descriptions

The `description` field enables Skill discovery. Write in third person. Include both what the Skill does and when to use it.

**Be specific and include key terms.** Claude uses descriptions to choose the right Skill from potentially many available Skills.

```yaml
# Good: specific triggers
description: |
  Extract text and tables from PDF files, fill forms, merge documents.
  Use when working with PDF files or when the user mentions PDFs.

# Bad: vague
description: Helps with documents
```

### Progressive Disclosure

SKILL.md serves as an overview that points Claude to detailed materials as needed.

* Keep SKILL.md body under 500 lines for optimal performance
* Split content into separate files when approaching this limit
* Use companion files for heavy reference material

**Pattern: High-level guide with references**

````markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features

**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
````

Claude loads companion files only when needed.

**Keep references one level deep from SKILL.md.** Avoid deeply nested references where files reference other files.

### Structure Longer Reference Files

For reference files longer than 100 lines, include a table of contents at the top:

```markdown
# API Reference

## Contents
- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns
- Code examples

## Authentication and setup
...
```

## Workflows and Feedback Loops

### Use Workflows for Complex Tasks

Break complex operations into clear, sequential steps. For complex workflows, provide a checklist:

````markdown
## Research synthesis workflow

Copy this checklist and track your progress:

```
Research Progress:
- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
- [ ] Step 3: Cross-reference claims
- [ ] Step 4: Create structured summary
- [ ] Step 5: Verify citations
```
````

### Implement Feedback Loops

**Common pattern**: Run validator, fix errors, repeat.

```markdown
## Document editing process

1. Make your edits
2. **Validate immediately**: `python scripts/validate.py output/`
3. If validation fails:
   - Review the error message carefully
   - Fix the issues
   - Run validation again
4. **Only proceed when validation passes**
```

## Content Guidelines

### Avoid Time-Sensitive Information

Use "old patterns" sections instead of date-based conditionals:

```markdown
## Current method

Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns

<details>
<summary>Legacy v1 API (deprecated)</summary>
The v1 API used: `api.example.com/v1/messages`
This endpoint is no longer supported.
</details>
```

### Use Consistent Terminology

Choose one term and use it throughout:

* Always "API endpoint" (not mixing "URL", "route", "path")
* Always "field" (not mixing "box", "element", "control")

## Common Patterns

### Template Pattern

Provide templates for output format. Match strictness to your needs:

**For strict requirements** (data formats, API responses):

```markdown
## Report structure

ALWAYS use this exact template structure:
[exact format here]
```

**For flexible guidance** (when adaptation is useful):

```markdown
## Report structure

Here is a sensible default format, but use your best judgment:
[flexible format here]
```

### Examples Pattern

Provide input/output pairs for output quality:

```markdown
## Commit message format

**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

One excellent example is better than many mediocre ones.

### Conditional Workflow Pattern

Guide Claude through decision points:

```markdown
## Modification workflow

1. Determine the modification type:
   **Creating new content?** Follow "Creation workflow" below
   **Editing existing content?** Follow "Editing workflow" below
```

## Evaluation and Iteration

### Build Evaluations First

Create evaluations BEFORE writing extensive documentation:

1. **Identify gaps**: Run Claude on tasks without a Skill. Document specific failures
2. **Create evaluations**: Build three scenarios that test these gaps
3. **Establish baseline**: Measure performance without the Skill
4. **Write minimal instructions**: Just enough to address the gaps
5. **Iterate**: Execute evaluations, compare against baseline, refine

### Develop Skills Iteratively

Work with one Claude instance ("Claude A") to create Skills tested by other instances ("Claude B"):

1. Complete a task without a Skill — notice what context you repeatedly provide
2. Ask Claude A to create a Skill capturing the pattern
3. Review for conciseness — remove unnecessary explanations
4. Test with Claude B on related use cases
5. Iterate based on observation

### Observe How Claude Navigates Skills

Watch for:
* **Unexpected exploration paths** — structure may not be intuitive
* **Missed connections** — references may need to be more explicit
* **Overreliance on certain sections** — content may belong in SKILL.md instead
* **Ignored content** — files may be unnecessary or poorly signaled

## Anti-Patterns

* **Windows-style paths** — always use forward slashes
* **Too many options** — provide a default with an escape hatch, not five alternatives
* **Assuming tools are installed** — be explicit about dependencies
* **Magic numbers** — justify and document all configuration values
* **Punting errors to Claude** — handle error conditions in scripts explicitly

## Checklist for Effective Skills

### Core quality

* [ ] Description is specific and includes key terms
* [ ] Description includes both what the Skill does and when to use it
* [ ] SKILL.md body is under 500 lines
* [ ] Additional details are in separate companion files (if needed)
* [ ] No time-sensitive information
* [ ] Consistent terminology throughout
* [ ] Examples are concrete, not abstract
* [ ] File references are one level deep
* [ ] Progressive disclosure used appropriately
* [ ] Workflows have clear steps

### Code and scripts

* [ ] Scripts solve problems rather than punt to Claude
* [ ] Error handling is explicit and helpful
* [ ] No magic numbers (all values justified)
* [ ] Required packages listed and verified
* [ ] No Windows-style paths
* [ ] Validation steps for critical operations
* [ ] Feedback loops for quality-critical tasks

### Testing

* [ ] At least three evaluation scenarios created
* [ ] Tested with real usage scenarios
* [ ] Team feedback incorporated (if applicable)
