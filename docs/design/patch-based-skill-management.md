# Manifest-Driven Skill Management: Design Document

## Problem Statement

We use multiple upstream AI coding skill repositories (superpowers, gstack, Anthropic
marketplace skills) with Claude Code. Each provides valuable workflows, but using them
as-is creates problems:

1. **No customization** — upstream skills hard-code their own names, paths, and
   cross-references. `superpowers:writing-plans` references `superpowers:executing-plans`,
   `superpowers:subagent-driven-development`, etc. We can't rename or restructure
   without modifying 52+ references across 17 files.

2. **No combination** — skills from different upstreams can't be mixed into a single
   plugin pack. A project needs brainstorming from superpowers AND code review from
   gstack, but they're separate plugins with separate installs.

3. **All-or-nothing install** — superpowers installs 13 skills. A Docker-only project
   doesn't need frontend-design or webapp-testing. There's no way to install a subset.

4. **Upstream tracking is hard** — if we just copy and edit files, we lose the ability
   to incorporate upstream improvements. When superpowers releases v5.1.0 with better
   debugging, we'd have to manually diff and merge.

## What We Want

A system that lets us:

- **Cherry-pick** skills from any upstream into themed packs (base, web, infra)
- **Rename and restructure** skills to our own naming convention
- **Customize deeply** — rewrite sections, add paragraphs, change execution order
- **Combine** skills from multiple upstreams into a single installable plugin
- **Track upstream updates** and incorporate them with minimal manual work
- **Install per-project** — a Next.js project gets `rkstack-web`, a Terraform project
  gets `rkstack-infra`, both get `rkstack-base`

## Approach: Manifest + Overlay + Build

Instead of managing patches (stg) that record file contents and live outside git,
we use a **declarative manifest** that describes what to import and how to transform
it, plus an **overlay directory** for deep customizations. A build script reads the
manifest, copies from `.upstreams/`, applies transforms and overlays, and writes the
final plugin to `plugins/`.

### Why not stg (patch-based)

Previously considered and rejected:

- **Local-only state** — stg patch stack lives on one machine, not in git. Can't
  reproduce the build, can't do CI, can't onboard others.
- **Snapshot patches don't auto-conflict** — when upstream changes a file, the import
  patch still has old content and applies cleanly. You don't know it's stale.
- **Rename patches are permanent maintenance** — upstream skills have 52+ cross-references
  (`superpowers:writing-plans`, `superpowers:code-reviewer`, etc.). Each upstream update
  can add new references that the rename patch doesn't cover. This isn't a thin
  compatibility layer — it's ongoing manual work.
- **No declarative intent** — a patch says "change line 42 from X to Y". A manifest
  says "rename all occurrences of superpowers to rkstack-base". The manifest survives
  upstream restructuring; the patch doesn't.

### Why not fork-based

Also considered and rejected:

- Can't combine skills from multiple upstreams into one plugin
- Can't restructure directory layout (upstream layout ≠ our pack layout)
- Need one fork per upstream, each with its own maintenance
- We don't contribute back to upstream

## Architecture

### Repository layout

```
rkstack/
├── .upstreams/                         ← git submodules (read-only, pinned to tags)
│   ├── superpowers/                    ← obra/superpowers @ v5.0.6
│   └── gstack/                         ← garrytan/gstack @ v0.11.17.0
│
├── packs/                              ← source of truth: manifests + overlays
│   ├── rkstack-base/
│   │   ├── pack.yaml                   ← declares imports, dependencies, transforms
│   │   └── overlay/                    ← hand-authored overrides and additions
│   │       ├── .claude-plugin/
│   │       │   └── plugin.json
│   │       ├── hooks/
│   │       │   ├── hooks.json
│   │       │   └── session-start
│   │       └── skills/
│   │           ├── using-rkstack/      ← full override of using-superpowers
│   │           │   └── SKILL.md
│   │           └── brainstorming/      ← partial override (only changed files)
│   │               └── SKILL.md
│   ├── rkstack-web/
│   │   ├── pack.yaml
│   │   └── overlay/
│   └── rkstack-infra/
│       ├── pack.yaml
│       └── overlay/
│
├── plugins/                            ← build output (committed to git)
│   ├── rkstack-base/                   ← self-contained Claude Code plugin
│   ├── rkstack-web/
│   └── rkstack-infra/
│
├── build.sh                            ← build script
└── docs/
```

### Key directories

| Directory | What it is | Who writes it |
|-----------|-----------|---------------|
| `.upstreams/` | Git submodules, read-only | `git submodule update` |
| `packs/` | Source of truth: manifests + overlays | You (human) |
| `plugins/` | Build output, committed after each build | `build.sh` |

### plugins/ is committed to git

`plugins/` is committed to git after each `./build.sh` run. Marketplace `git-subdir`
refs point to **tags** for reproducibility. This is simple and needs no CI.

Future option: if the repo grows, move to a gitignored `plugins/` with a CI job
that builds and pushes to a `release` branch. But for MVP, committed is fine.

## Manifest Format: pack.yaml

```yaml
# packs/rkstack-base/pack.yaml

pack:
  name: rkstack-base
  version: 0.1.0
  description: >
    Base development workflow: brainstorming, planning, TDD, debugging,
    code review, and verification. Universal skills for all projects.

# Import skills from .upstreams
imports:

  # Import all skills from superpowers
  - upstream: superpowers
    type: skills
    include:
      - brainstorming
      - writing-plans
      - executing-plans
      - test-driven-development
      - systematic-debugging
      - dispatching-parallel-agents
      - subagent-driven-development
      - using-git-worktrees
      - requesting-code-review
      - receiving-code-review
      - finishing-a-development-branch
      - verification-before-completion
      - writing-skills
    # using-superpowers is NOT imported — replaced entirely by
    # overlay/skills/using-rkstack/ (see "exclude + overlay-only" below)

  # Import agents from superpowers
  - upstream: superpowers
    type: agents
    include:
      - code-reviewer

  # Import commands from superpowers
  - upstream: superpowers
    type: commands
    include:
      - brainstorm
      - write-plan
      - execute-plan

  # Example: import from gstack too (future)
  # - upstream: gstack
  #   type: skills
  #   include:
  #     - guard

# Dependency declarations.
# The build validates that every dependency exists in the output.
# Two kinds: skill deps (sibling skills) and resource deps (files, agents).
dependencies:
  executing-plans:
    skills:
      - finishing-a-development-branch
      - using-git-worktrees
      - writing-plans
  subagent-driven-development:
    skills:
      - finishing-a-development-branch
      - using-git-worktrees
      - writing-plans
      - requesting-code-review
      - test-driven-development
    resources:
      - agents/code-reviewer.md                 # reviewer subagent prompt
      - skills/subagent-driven-development/implementer-prompt.md
      - skills/subagent-driven-development/spec-reviewer-prompt.md
      - skills/subagent-driven-development/code-quality-reviewer-prompt.md
  writing-plans:
    skills:
      - subagent-driven-development
      - executing-plans
    resources:
      - skills/writing-plans/plan-document-reviewer-prompt.md
  requesting-code-review:
    resources:
      - skills/requesting-code-review/code-reviewer.md   # prompt template inside skill dir
      - agents/code-reviewer.md                          # agent definition (used by subagent dispatch)
  brainstorming:
    resources:
      - skills/brainstorming/spec-document-reviewer-prompt.md
      - skills/brainstorming/visual-companion.md

# Text replacements applied to ALL imported files (before overlay)
transforms:
  replace:
    "superpowers:": "rkstack-base:"
    "superpowers plugin": "rkstack-base plugin"
    "docs/superpowers/specs": "docs/specs"
```

## Overlay: Deep Customization

The overlay directory (`packs/{pack}/overlay/`) contains hand-authored files that
are copied on top of the generated output **after** imports and transforms.

### Four levels of customization

**Level 1: Automatic transforms (manifest)**

For mechanical replacements that apply everywhere.

```yaml
transforms:
  replace:
    "superpowers:": "rkstack-base:"
```

Handles the 52+ cross-references automatically. When upstream adds new references,
the next build catches them too.

**Level 2: Exclude + overlay-only (rename a skill)**

When you need to rename a skill directory (not just content). Don't import the
upstream skill — provide your own version entirely in overlay:

```yaml
# in pack.yaml imports: using-superpowers is NOT in the include list
```

```text
# in overlay: your replacement skill with the new name
packs/rkstack-base/overlay/skills/using-rkstack/SKILL.md
```

The upstream `using-superpowers/` is never copied. Only `using-rkstack/` appears
in the output. This avoids the problem of both old and new directories coexisting.

**Level 3: Full file override (overlay)**

When you need to rewrite a skill's logic, change section order, add paragraphs,
but keep the same directory name. Place the complete rewritten file in overlay:

```text
packs/rkstack-base/overlay/skills/brainstorming/SKILL.md
```

This file **replaces** the upstream version entirely. You own it — upstream changes
to this skill won't auto-merge (but you'll get a drift warning, see below).

**Level 4: New files (overlay)**

For skills, hooks, agents not from any upstream. Place them in overlay:

```text
packs/rkstack-base/overlay/skills/my-custom-skill/SKILL.md
packs/rkstack-base/overlay/hooks/hooks.json
packs/rkstack-base/overlay/hooks/session-start
packs/rkstack-base/overlay/.claude-plugin/plugin.json
```

These are purely your code — no upstream dependency.

### How the build assembles output

```text
1. For each import in pack.yaml:
   - skills (directories): copy .upstreams/{upstream}/skills/{name}/ → plugins/{pack}/skills/{name}/
   - agents (files):       copy .upstreams/{upstream}/agents/{name}.md → plugins/{pack}/agents/{name}.md
   - commands (files):     copy .upstreams/{upstream}/commands/{name}.md → plugins/{pack}/commands/{name}.md
   (only names listed in "include")

2. Apply text transforms to all imported files

3. Copy overlay/ on top (rsync -a), overwriting matching paths, adding new paths
   Overlay can add new skill dirs, replace imported files, provide .claude-plugin/, etc.
```

Rules:
- **Imported but not in overlay** → auto-generated (upstream + transforms)
- **Imported AND in overlay** → overlay wins (full override of that file)
- **Not imported, only in overlay** → overlay-only (custom or renamed skill)
- **Not imported, not in overlay** → not in output

### Tracking upstream drift for overridden files

When you override a file, you diverge from upstream. A **lockfile** records which
upstream commit each overlay file was based on:

```yaml
# packs/rkstack-base/pack.lock (auto-generated by build.sh)
#
# Machine keys are commit SHAs for exact comparison.
# Tags are display metadata only — never used for drift logic.

upstream_refs:
  superpowers:
    sha: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
    tag: v5.0.6          # display only

overrides:
  skills/brainstorming/SKILL.md:
    upstream_source: superpowers/skills/brainstorming/SKILL.md
    based_on_sha: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
    based_on_tag: v5.0.6   # display only
    override_date: 2026-03-15
  skills/using-rkstack/SKILL.md:
    upstream_source: superpowers/skills/using-superpowers/SKILL.md
    based_on_sha: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
    based_on_tag: v5.0.6   # display only
    override_date: 2026-03-27
```

The build script generates and updates this lockfile. `--check-drift` compares
the lockfile's `based_on_sha` against the current submodule HEAD:

```bash
$ ./build.sh --check-drift rkstack-base

Overridden files with upstream changes:
  skills/brainstorming/SKILL.md
    based on: a1b2c3d (v5.0.6), current: f7e8d9c (v5.1.0)
    upstream commits touching this file: 3
    review: diff .upstreams/superpowers/skills/brainstorming/SKILL.md \
                 packs/rkstack-base/overlay/skills/brainstorming/SKILL.md
```

This is informational, not blocking. It tells you which overrides may need
review after an upstream update.

## Build Process

```bash
#!/usr/bin/env bash
# build.sh — assemble plugins from manifests + overlays

build_pack() {
    local pack="$1"
    local manifest="packs/${pack}/pack.yaml"
    local overlay="packs/${pack}/overlay"
    local output="plugins/${pack}"

    # 1. Clean output
    rm -rf "${output}"
    mkdir -p "${output}"

    # 2. Process imports from manifest
    #    For each import: copy files from .upstreams/{upstream}/{type}/
    #    to ${output}/{type}/
    process_imports "${manifest}" "${output}"

    # 3. Apply text transforms from manifest
    #    Global search-and-replace across all imported files
    apply_transforms "${manifest}" "${output}"

    # 4. Apply overlay (copy on top, overwriting where exists)
    #    Uses rsync -a to include hidden directories (.claude-plugin/ etc.)
    if [ -d "${overlay}" ]; then
        rsync -a "${overlay}/" "${output}/"
    fi

    # 5. Validate dependencies
    #    Check that every entry in "skills:" and "resources:" exists in output
    validate_dependencies "${manifest}" "${output}"

    # 6. Update lockfile with current upstream refs and override metadata
    update_lockfile "${pack}"

    echo "Built ${pack} → plugins/${pack}/"
}

# Build all packs or a specific one
if [ -n "$1" ] && [ "$1" != "--check-drift" ] && [ "$1" != "--diff" ]; then
    build_pack "$1"
elif [ "$1" = "--check-drift" ]; then
    check_drift "${2:-all}"
elif [ "$1" = "--diff" ]; then
    diff_output "${2:-all}"
else
    for pack_dir in packs/*/; do
        build_pack "$(basename "${pack_dir}")"
    done
fi
```

### Build commands

```bash
./build.sh                              # build all packs
./build.sh rkstack-base                 # build one pack
./build.sh --check-drift                # show overridden files with upstream changes
./build.sh --check-drift rkstack-base   # check drift for one pack
./build.sh --diff rkstack-base          # diff between current plugins/ and fresh build
```

### Dependency validation

The build reads `dependencies` from `pack.yaml` and validates two things:

1. **Skill deps** — every skill in `skills:` list exists as a directory in the output
2. **Resource deps** — every path in `resources:` list exists as a file in the output

Failures are fatal:

```text
ERROR: rkstack-base: skill "executing-plans" requires skill "finishing-a-development-branch"
       but it is not imported and not in overlay/

ERROR: rkstack-base: skill "subagent-driven-development" requires resource
       "agents/code-reviewer.md" but it was not found in output
```

This prevents shipping packs where skills reference siblings or resources that
aren't included. Companion files (prompts, scripts, reference docs) that live
alongside skills are tracked as resource deps, not just skill-level deps.

## Upstream Update Procedure

```bash
# 1. See what changed
cd .upstreams/superpowers
git fetch && git log v5.0.6..v5.1.0 --oneline -- skills/
cd ../..

# 2. Update submodule
cd .upstreams/superpowers && git checkout v5.1.0 && cd ../..

# 3. Update version in manifests
# Edit packs/rkstack-base/pack.yaml if needed (e.g. new skills to include)

# 4. Rebuild
./build.sh

# 5. Check what changed in output
git diff plugins/

# 6. Check drift for overridden files
./build.sh --check-drift

# 7. Review, test, commit
git add .upstreams/superpowers plugins/ packs/
git commit -m "upgrade superpowers to v5.1.0"
git tag rkstack-base-v0.2.0    # tag for reproducible marketplace refs
```

Compare with the stg procedure: no pop/push/refresh cycle, no manual re-copy,
no hoping customization patches apply cleanly. Just rebuild and review the diff.

## Delivery: Marketplace Integration

Packs are registered in ccode-personal-plugins marketplace using `git-subdir`.
Use **tags** (not `main`) for reproducible installs:

```json
{
  "name": "rkstack-base",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/mrkhachaturov/rkstack.git",
    "path": "plugins/rkstack-base",
    "ref": "rkstack-base-v0.1.0"
  }
}
```

Install per-project:
```bash
/plugin install rkstack-base@ccode-personal-plugins
```

## Decided

- **plugins/ handling** — committed to git after each build. Tags for reproducibility.
- **Dependency model** — `dependencies` section validates both skill deps and resource deps (files, agents, prompts).
- **Drift tracking** — lockfile (`pack.lock`) uses commit SHAs as machine keys, tags as display-only metadata.
- **Skill renames** — exclude from imports, provide entirely via overlay. No import + rename-in-place.
- **Overlay merging** — `rsync -a` to include hidden directories (`.claude-plugin/` etc.).

## Remaining Decisions

1. **Pack boundaries** — which skills go into base vs web vs infra? Requires
   studying all upstream skills first (Phase 1 analysis).

2. **Cross-pack references** — if rkstack-web has a skill that references
   `rkstack-base:writing-plans`, what happens when only rkstack-web is installed?
   Options: (a) document as dependency, (b) duplicate the skill, (c) graceful fallback.

3. **Build script language** — bash is simple but limited for YAML parsing. Options:
   (a) bash + yq, (b) Python script, (c) Makefile + helpers. Recommendation: start
   with bash + yq, migrate if complexity grows.
