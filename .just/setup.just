set shell := ["bash", "-euo", "pipefail", "-c"]
set working-directory := '..'

[doc("Install pinned tools via mise")]
tools:
  mise install

[doc("Configure age encryption for docs/rkstack/ (opt-in, per project)")]
age:
  bash scripts/setup-age-encryption.sh

[doc("Verify docs are encrypted if age-recipients.txt exists")]
check-age:
  bash scripts/check-age-encryption.sh
