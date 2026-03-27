# rkstack

## What This Repo Is

rkstack is a repository of curated Claude Code plugin packs built from multiple
upstream skill sources:

- `superpowers`
- `gstack`
- selected custom rkstack content

The repo does **not** treat upstream skills as manually maintained copies.
Instead, it keeps upstreams pinned in `.upstreams/`, defines what to import in
`packs/{pack}/pack.yaml`, adds rkstack-owned customizations in
`packs/{pack}/overlay/`, and generates installable plugins into `plugins/`
using the Rust CLI `rkbuild`.

## Core Principle

**Source of truth lives in `packs/`, not in `plugins/`.**

- `.upstreams/` = read-only upstream sources pinned by git submodule commit
- `packs/` = canonical rkstack configuration and custom content
- `plugins/` = generated output committed to git after a successful build

If a change is meant to persist, make it in:

- `packs/{pack}/pack.yaml`
- `packs/{pack}/overlay/...`
- Rust build tooling under `tools/rkbuild/`
- docs such as `README.md` and `docs/`

Do **not** manually edit generated files under `plugins/` and leave them there
without also updating the corresponding source in `packs/` or the build logic.

## Build System

This repo uses a Rust CLI named `rkbuild`.

Human-facing commands should go through `justfile`. `rkbuild` is the real build
engine; `just` is the preferred task runner/interface for humans and Claude Code.

Primary entrypoints:

```bash
just build                         # build all packs
just build rkstack-base            # build one pack
just validate                      # validate all packs without writing plugins/
just validate rkstack-base
just drift                         # compare pack.lock upstream SHAs vs submodules
just drift rkstack-base
just diff rkstack-base
just check
```

Direct Rust entrypoint:

```bash
cargo run -p rkbuild -- build rkstack-base
cargo run -p rkbuild -- validate rkstack-base
cargo run -p rkbuild -- check-drift rkstack-base
cargo run -p rkbuild -- diff rkstack-base
```

## How Claude Code Should Work Here

When making changes in this repo:

1. Read the relevant `pack.yaml`, overlay files, and generated plugin output.
2. Change the source of truth in `packs/` or `tools/rkbuild/`.
3. Rebuild the affected pack with `just build <pack>` or `cargo run -p rkbuild -- build <pack>`.
4. Inspect the generated diff in `plugins/`.
5. If behavior depends on upstream pinning or overlay provenance, inspect `pack.lock`.

### Never do this

- Do not hand-edit `.upstreams/`
- Do not treat `plugins/` as canonical source
- Do not reintroduce `stg`, patch-stack workflow, or manual copy/paste updates
- Do not use shell-based bulk replacement logic in place of `rkbuild`

### Preferred workflow

- For normal repo workflows: prefer `just ...`
- For import/customization changes: edit `packs/{pack}/pack.yaml` and/or `packs/{pack}/overlay/`
- For generation behavior changes: edit `tools/rkbuild/src/main.rs`
- For verification: run `just check` and then rebuild the target pack
- If a workflow needs shell glue later, put it in `scripts/` and call it from `justfile`

## Repository Structure

```text
rkstack/
├── CLAUDE.md
├── README.md
├── Cargo.toml                    # workspace root
├── .mise.toml                    # local tool + task definitions
├── justfile                      # human-friendly task runner for rkbuild
├── scripts/                      # optional helper scripts called from justfile
├── .upstreams/                   # pinned git submodules, read-only
│   ├── superpowers/
│   └── gstack/
├── packs/                        # source of truth
│   └── rkstack-base/
│       ├── pack.yaml             # imports, dependencies, transforms
│       ├── pack.lock             # generated upstream SHA metadata
│       └── overlay/              # rkstack-owned files layered on top
├── plugins/                      # generated plugins, committed after build
│   └── rkstack-base/
└── tools/
    └── rkbuild/
        ├── Cargo.toml
        └── src/main.rs
```

## Manifest Model

Each pack is defined by `packs/{pack}/pack.yaml`.

Important sections:

- `pack`: pack metadata
- `imports`: which upstream skills/agents/commands to copy
- `dependencies`: required sibling skills and resource files that must exist
- `transforms.replace`: literal text replacements applied to imported text files

Import entries support both forms:

- `name`
- `source-name as target-name`

Use `source as target` when you want to import an upstream item under a different
name in the generated pack. This is the preferred mechanism for renamed imports.

Current example pack:

- [`packs/rkstack-base/pack.yaml`](/Volumes/storage/Projects/Git/Github/mrkhachaturov/rkstack/packs/rkstack-base/pack.yaml)

## Overlay Model

`packs/{pack}/overlay/` contains rkstack-owned content copied on top of imports.

Use overlay for:

- plugin metadata such as `.claude-plugin/plugin.json`
- platform root files such as `GEMINI.md` and `.codex/INSTALL.md`
- hooks
- new custom skills
- full overrides of imported files
- partial overrides on renamed imports, such as `using-rkstack/SKILL.md` while
  keeping imported `references/`

Rename strategy:

- Prefer renamed imports in `pack.yaml`: `source-name as target-name`
- Then override only the files you actually own in overlay
- Use overlay-only replacement only when you truly do not want any upstream files
  from that item to be copied

## Generated Output

`plugins/{pack}/` is build output and is committed after successful rebuilds.

This repo intentionally commits generated plugin output so that:

- marketplace `git-subdir` installs can point at tagged repo states
- generated pack contents are reviewable in normal git diffs
- CI is not required to materialize artifacts for every consumer

If `plugins/` differs from `packs/` + `rkbuild`, the fix is to rebuild, not to
patch generated files manually.

## Upstreams

Upstreams are git submodules pinned to known commits/tags.

Current pinned sources:

- `.upstreams/superpowers`
- `.upstreams/gstack`

Use submodules for:

- diffing upstream changes
- pinning exact versions
- rebuilding packs against new upstream commits

Do not commit modifications inside submodule working trees.

## Updating an Upstream

Typical maintenance flow:

```bash
cd .upstreams/superpowers
git fetch
git checkout v5.1.0
cd ../..

just build rkstack-base
just drift rkstack-base
```

Then:

1. Review generated diffs in `plugins/`
2. Review `packs/{pack}/pack.lock`
3. If an override may need attention, compare overlay files against upstream
4. Commit the submodule bump plus regenerated outputs together

## rkbuild Responsibilities

The Rust CLI is responsible for all pack assembly mechanics:

- parse YAML manifest
- copy imports from `.upstreams/`
- apply literal text replacements across supported text file types
- merge overlay recursively, including dotfiles
- validate skill/resource dependencies
- generate `pack.lock`
- compare lockfile SHAs with current upstream submodule HEADs
- diff fresh build output against committed `plugins/`

If one of these behaviors changes, update `tools/rkbuild/src/main.rs` and then
re-run the relevant build/validation commands.

## Tooling Notes

- Rust toolchain and `just` are managed via `mise`
- `Cargo.lock` should be committed for this workspace
- `target/` is ignored
- `justfile` should stay thin; keep durable logic in Rust, and any future shell helpers in `scripts/`

## Marketplace / Delivery

Packs are meant to be published through the personal Claude Code marketplace via
`git-subdir`, pointing at subdirectories under `plugins/`.

Use tags for reproducible installs rather than mutable `main` refs.

## Current Priority

The repo is in the phase of building and refining the manifest-driven system.
When unsure, optimize for:

1. correctness of `packs/` as source of truth
2. determinism of `rkbuild`
3. reproducible generated output in `plugins/`
4. safe future upstream updates

## Short Operational Rules

- Edit `packs/` or `tools/rkbuild/`, not generated `plugins/`
- Rebuild after every source change
- Treat `.upstreams/` as read-only references
- Keep `pack.lock` generated by the tool
- Prefer `just ...` for normal workflows, and `cargo run -p rkbuild -- ...` when working on the CLI itself
- If shell is needed, add a script under `scripts/` and invoke it from `justfile`
