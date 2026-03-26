# rkstack — Personal AI Development Workflow

## What is this

rkstack is a unified skills repository that combines the best of multiple AI coding
skill sources (superpowers, gstack, Anthropic marketplace, and custom skills) into
curated, per-project skill packs with a consistent naming convention and controlled flow.

## Why it exists

Working with multiple skill sources (superpowers, gstack, etc.) creates problems:
- Different naming conventions — hard to remember which skill is where
- No control over flow — TDD sometimes triggers, sometimes doesn't
- System-wide install — same skills for all projects regardless of needs
- No deep understanding — using skills as black boxes without knowing how they work

rkstack solves this by:
1. **Studying each upstream skill** — understanding what it does, why, how
2. **Combining the best parts** — merging strengths of different sources
3. **Controlling the flow** — explicitly defining when each skill triggers
4. **Per-project install** — different skill packs for different project types
5. **Own naming** — names that make sense to the author, not upstream convention

## Core principle: patch-based, never manual

**All changes to upstream-derived skills MUST be stg patches.** Never edit upstream
skill content by hand. This ensures:
- When upstream releases a new version, we update the submodule and re-apply patches
- Every customization is tracked, named, and reversible
- We can see exactly what we changed and why

**Custom skills** (not derived from any upstream) can be created manually in `plugins/`.

## Initial task

Before building any skill packs, the first step is to **study every upstream skill**:

1. Add superpowers and gstack as git submodules in `upstreams/`
2. Go through each skill one by one
3. Document what it does, how it works, strengths/weaknesses in `docs/analysis/`
4. Decide which skills go into which pack
5. Only then start creating stg patches to build the packs

This is a learning exercise as much as a building exercise. Understanding how each
skill works is the foundation for making good decisions about combining them.

## Architecture

### Upstream tracking via git submodules

Upstreams are added as **git submodules** (not subtree). This keeps upstream history
separate from our patch stack — stg only manages our changes in `plugins/`, while
`upstreams/` is a clean pointer to a specific upstream commit/tag.

```bash
# Initial setup (one-time)
git submodule add -b main https://github.com/obra/superpowers.git upstreams/superpowers
git submodule add -b main https://github.com/garrytan/gstack.git upstreams/gstack

# Pin to specific tags
cd upstreams/superpowers && git checkout v5.0.6 && cd ../..
cd upstreams/gstack && git checkout v0.11.17.0 && cd ../..
git add upstreams/superpowers upstreams/gstack
git commit -m "pin upstreams: superpowers v5.0.6, gstack v0.11.17.0"

# Upgrade to new version
cd upstreams/superpowers && git fetch && git checkout v5.1.0 && cd ../..
git add upstreams/superpowers
stg pop --all           # remove our patches
git commit -m "upgrade superpowers to v5.1.0"
stg push --all          # re-apply patches (resolve conflicts if any)

# Clone with submodules
git clone --recurse-submodules https://github.com/mrkhachaturov/rkstack.git
```

### Why submodules over subtree

- **Clean separation:** upstream commits stay in upstream repos, our stg patches
  only touch `plugins/`. No interleaved history.
- **stg compatibility:** `stg pop --all` + submodule update + `stg push --all`
  is clean. With subtree, upstream merge commits can conflict with stg patches.
- **Easy diffing:** `cd upstreams/superpowers && git diff v5.0.6..v5.1.0` to see
  what upstream changed — no filtering needed.
- **Pinned versions:** `.gitmodules` records exactly which commit each upstream
  points to. Reproducible builds.

### Upstream sources

| Upstream | Submodule path | Pinned version | What we take |
|----------|---------------|----------------|-------------|
| [superpowers](https://github.com/obra/superpowers) | `upstreams/superpowers` | v5.0.6 | Process: brainstorming, TDD, plans, debugging, worktrees |
| [gstack](https://github.com/garrytan/gstack) | `upstreams/gstack` | v0.11.17.0 | Team roles: review, QA, security, ship, deploy, retro |
| [Anthropic skills](https://github.com/anthropics/skills) | (reference only) | latest | Content: pdf, docx, frontend-design, webapp-testing |
| Anthropic marketplace | (reference only) | latest | Integrations: any useful plugin |

### Skill packs (plugins/)

Each pack is a self-contained plugin installable per-project via the
ccode-personal-plugins marketplace using `git-subdir` source type.

**NOTE:** The pack structure below is a preliminary draft. The actual packs,
their names, and which skills go where will be decided during Phase 1 (study)
after we understand how each upstream skill works. Possible splits include
web/infra, frontend/backend, language-specific packs, or something entirely
different. The structure will emerge from understanding, not be imposed upfront.

```
plugins/
├── rkstack-web/          ← (draft) Web development (Next.js, React, Vue)
├── rkstack-infra/        ← (draft) Infrastructure (Docker, Terraform, K8s)
├── rkstack-base/         ← (draft) Base workflow (debug, retro, finish) — for all projects
└── (actual packs TBD after Phase 1)
```

### Marketplace integration via ccode-personal-plugins

[ccode-personal-plugins](https://github.com/mrkhachaturov/ccode-personal-plugins) is
our personal fork of the official [Anthropic Claude Code plugin marketplace](https://github.com/anthropics/claude-plugins-official).
It syncs weekly with Anthropic upstream via GitHub Actions, and adds our own plugins
on top via `custom-plugins.json`. Unwanted upstream plugins are filtered out via
`exclude-plugins.txt`.

rkstack skill packs are registered in ccode-personal-plugins as separate plugins
using the `git-subdir` source type (same pattern as AWS `agent-plugins.git` which
hosts multiple plugins in one repo). Each pack points to a subdirectory in this repo:

```json
{
  "name": "rkstack-{pack}",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/mrkhachaturov/rkstack.git",
    "path": "plugins/rkstack-{pack}",
    "ref": "main"
  }
}
```

Install per-project (not system-wide):

```bash
/plugin install rkstack-{pack}@ccode-personal-plugins
```

### Related repositories

| Repo | Local path | Purpose |
|------|-----------|---------|
| [rkstack](https://github.com/mrkhachaturov/rkstack) | `/Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack` | This repo — unified skill packs |
| [ccode-personal-plugins](https://github.com/mrkhachaturov/ccode-personal-plugins) | `/Volumes/storage/Projects/Git/Github/mrkhachaturov/ccode-personal-plugins` | Plugin marketplace (fork of [Anthropic claude-plugins-official](https://github.com/anthropics/claude-plugins-official)) — syncs weekly with upstream, adds our custom plugins, delivers rkstack packs to projects. Config: `.github/scripts/custom-plugins.json` for adding plugins, `exclude-plugins.txt` for removing unwanted ones. |
| [cc-skills](https://github.com/mrkhachaturov/cc-skills) | `/Volumes/storage/Projects/Git/Github/mrkhachaturov/cc-skills` | Fork of [Anthropic example skills](https://github.com/anthropics/skills) (pdf, docx, pptx, frontend-design, webapp-testing) — separate from rkstack, content-oriented skills |
| [gstack upstream](https://github.com/garrytan/gstack) | `/Volumes/storage/Projects/Git/Github/upstreams/gstack` | Full clone for study (also as submodule in `upstreams/gstack`) |

## Project structure

```
rkstack/
├── CLAUDE.md                 ← You are here
├── README.md                 ← Public-facing description
├── .gitmodules               ← Submodule definitions
├── upstreams/                ← Upstream sources (git submodules, read-only reference)
│   ├── superpowers/          ← submodule → obra/superpowers @ v5.0.6
│   └── gstack/               ← submodule → garrytan/gstack @ v0.11.17.0
├── plugins/                  ← Skill packs (each is a plugin)
│   ├── rkstack-{pack}/      ← (structure TBD — packs will be defined in Phase 1)
│   │   ├── .claude-plugin/
│   │   │   └── manifest.json
│   │   └── skills/
│   │       └── {skill}/SKILL.md
├── docs/                     ← Skill analysis and design decisions
│   ├── analysis/             ← Deep-dive notes on each upstream skill
│   └── flow/                 ← Flow diagrams and design decisions
└── THIRD_PARTY_NOTICES.md    ← License attribution for upstream sources
```

## Commands

```bash
# submodule management
git submodule update --init --recursive       # after clone
git submodule update --remote upstreams/X     # fetch latest from upstream

# stg patch management
stg init                          # initialize stg on the branch
stg series                        # list all patches in the stack
stg new <name> -m "description"   # create a new patch
stg refresh                       # update current patch with staged changes
stg pop --all                     # unapply all patches (before upstream update)
stg push --all                    # re-apply all patches (after upstream update)
stg edit <name>                   # edit a patch description
stg reorder                       # reorder patches in the stack
stg show <name>                   # see the patch diff
stg log <name>                    # see patch history
```

## Patch-based workflow with stg (Stacked Git)

### Why stg

Each customization to an upstream skill is a **named, reorderable, re-appliable patch**.
When upstream releases a new version, we update the submodule and re-apply patches.
Conflicts are resolved per-patch — you see exactly which customization broke and why.

### What gets patched vs what doesn't

| Content | How it's managed |
|---------|-----------------|
| Upstream-derived skills in `plugins/` | **stg patches only** — never edit manually |
| Custom skills (no upstream source) | **Manual edits** — no patches needed |
| `upstreams/` submodules | **git submodule** — read-only, never modify |
| `docs/analysis/` | **Manual edits** — personal notes, not patched |
| Manifests, README, CLAUDE.md | **Normal git commits** — infrastructure, not skills |

### Patch naming convention

```
{NN}-{pack}-{action}-{description}

Examples:
01-web-import-brainstorming        # copy skill as-is from upstreams/superpowers
02-web-rename-brainstorming        # rename to think, adjust references
03-web-restructure-think           # rewrite sections for our flow
04-web-import-executing-plans      # copy as-is from upstreams/superpowers
05-web-embed-tdd-in-code           # embed TDD into the code skill
06-web-import-review               # copy from upstreams/gstack
07-web-customize-review-checklist  # replace checklist with our own
08-base-import-debugging           # copy from upstreams/superpowers
09-base-import-investigate         # copy from upstreams/gstack
10-base-merge-debug                # merge two debug skills into one
```

Import patches copy from `upstreams/` as-is. Subsequent patches modify.
This way when upstream updates, import patches may conflict (upstream changed
the source) but customization patches usually apply cleanly.

### Typical stg workflow

```bash
# Creating a new skill from upstream
stg new 01-web-import-brainstorming -m "Import brainstorming from superpowers as-is"
cp -r upstreams/superpowers/skills/brainstorming/ plugins/rkstack-web/skills/think/
stg refresh

stg new 02-web-rename-brainstorming -m "Rename brainstorming to think, update references"
# ... edit plugins/rkstack-web/skills/think/SKILL.md ...
stg refresh

# Upgrading upstream
cd upstreams/superpowers && git fetch && git checkout v5.1.0 && cd ../..
git add upstreams/superpowers
stg pop --all                     # remove all our patches
git commit -m "upgrade superpowers to v5.1.0"
stg push --all                    # re-apply patches
# if conflict on 01-web-import-brainstorming:
#   → upstream changed brainstorming, re-copy from new version
#   → stg refresh, stg push (continue with remaining patches)

# Inspecting
stg series                          # see all patches
stg show 05-web-embed-tdd-in-code   # see what this patch changes
stg diff                            # see uncommitted changes in current patch
```

## Development workflow

### Phase 1: Study (current phase)

1. Add superpowers and gstack as git submodules
2. Read each upstream skill one by one
3. Write analysis in `docs/analysis/{upstream}-{skill-name}.md`
4. Map skills to packs — decide what goes where

### Phase 2: Build packs

1. For each skill: create stg import patch (copy from upstream as-is)
2. Create stg customization patches (rename, restructure, merge, embed TDD)
3. Test each pack by installing in a real project

### Phase 3: Maintain

1. Watch upstream releases
2. Update submodule → pop/push stg patches
3. Incorporate new upstream features worth having
4. Add new custom skills as needed

### Naming convention

**NOTE:** The names below are a preliminary draft. Final naming will be decided
during Phase 1 after studying all upstream skills. The principle stays: names
should be action-oriented and immediately clear to the author.

Draft examples (subject to change):

- `think` — brainstorm and explore the problem
- `plan` — design the solution with architecture review
- `code` — implement with TDD (test first, always)
- `review` — code review with checklists
- `test` — QA in real browser
- `security` — OWASP + STRIDE audit
- `ship` — PR, changelog, push
- `deploy` — merge, deploy, verify production
- `debug` — systematic root-cause investigation
- `retro` — weekly retrospective with metrics
- `finish` — verify everything before claiming done

## Key design decisions

### TDD is mandatory in `code` skill
Unlike superpowers where TDD is a separate optional skill that may or may not trigger,
rkstack embeds the TDD cycle directly into the `code` skill. Red-Green-Refactor is
not a suggestion — it's the only way the skill works.

### Per-project, not system-wide
Skills are installed per-project via the plugin marketplace. A Docker project gets
`rkstack-infra`, a Next.js project gets `rkstack-web`. No unnecessary skills cluttering
the context.

### Patch-based, not fork-based
Upstream skills are NOT copied and manually edited. They are imported via stg patches
and customized via subsequent patches. This means upstream updates can be incorporated
by re-applying the patch stack. Manual edits would make upstream tracking impossible.

### Submodules for upstream, not subtree
Upstreams live as git submodules — clean pointers to specific commits. This keeps
our git history clean (only our patches, not upstream commits) and makes stg work
smoothly (no merge commits from subtree pulls interfering with the patch stack).
