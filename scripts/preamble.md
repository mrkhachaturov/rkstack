## Preamble (run first)

```bash
# === RKstack Preamble ===

# Project detection via scc
_TOP_LANGS=$(scc --format wide --no-cocomo . 2>/dev/null | head -8 || echo "scc not available")
echo "STACK:"
echo "$_TOP_LANGS"

# Framework hints
_HAS_PACKAGE_JSON=$([ -f package.json ] && echo "yes" || echo "no")
_HAS_CARGO_TOML=$([ -f Cargo.toml ] && echo "yes" || echo "no")
_HAS_GO_MOD=$([ -f go.mod ] && echo "yes" || echo "no")
_HAS_PYPROJECT=$([ -f pyproject.toml ] && echo "yes" || echo "no")
_HAS_DOCKERFILE=$([ -f Dockerfile ] && echo "yes" || echo "no")
_HAS_TERRAFORM=$(find . -maxdepth 1 -name "*.tf" -print -quit 2>/dev/null | grep -q . && echo "yes" || echo "no")
echo "FRAMEWORKS: pkg=$_HAS_PACKAGE_JSON cargo=$_HAS_CARGO_TOML go=$_HAS_GO_MOD py=$_HAS_PYPROJECT docker=$_HAS_DOCKERFILE tf=$_HAS_TERRAFORM"

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

- **TypeScript/JavaScript + package.json** → web/fullstack project. Suggest vitest/jest for TDD, check for React/Vue/Svelte patterns.
- **Python + pyproject.toml** → backend/ML. Suggest pytest, check PEP8.
- **Rust + Cargo.toml** → systems. Suggest cargo test, check ownership patterns.
- **Go + go.mod** → backend/infra. Suggest go test, check error handling.
- **Dockerfile + Terraform** → infrastructure. Extra caution with state, suggest plan before apply.
- **Solo repo** → be proactive, fix issues directly.
- **Collaborative repo** → flag issues, document findings, don't assume ownership.
- **CLAUDE.md exists** → read it for project-specific commands and conventions.
