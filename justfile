set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := false

default:
  @just --list

[group("setup")]
[doc("Install pinned tools via mise")]
setup:
  mise install

[group("build")]
[doc("Generate all SKILL.md from templates")]
build:
  ./scripts/gen-skill-docs

[group("build")]
[doc("Check that generated SKILL.md files are up to date")]
check:
  ./scripts/gen-skill-docs --check

[group("detect")]
[doc("Detect project stack via scc")]
detect:
  scc --format wide --no-cocomo .
