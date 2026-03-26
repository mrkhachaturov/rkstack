set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := false

default:
  @just --list

[group("setup")]
[doc("Install pinned tools via mise")]
setup:
  mise install

[group("build")]
[doc("Build all packs, or pass a pack name: just build rkstack-base")]
build *args:
  cargo run --quiet -p rkbuild -- build {{args}}

[group("build")]
[doc("Validate all packs without writing plugins/, or pass a pack name")]
validate *args:
  cargo run --quiet -p rkbuild -- validate {{args}}

[group("build")]
[doc("Compare pack.lock upstream SHAs with current submodule HEADs")]
drift *args:
  cargo run --quiet -p rkbuild -- check-drift {{args}}

[group("build")]
[doc("Diff committed plugins/ against a fresh rebuild")]
diff pack:
  cargo run --quiet -p rkbuild -- diff {{pack}}

[group("build")]
[doc("Run cargo check for the rkbuild CLI")]
check:
  cargo check -p rkbuild

[group("build")]
[doc("Build rkstack-base")]
base:
  just build rkstack-base
