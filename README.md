# 🛠️ RKstack

> 🤖 Engineering discipline system for AI coding agents.
>
> One plugin. 23 skills. Install once, adapts to your project.

[![Check](https://github.com/mrkhachaturov/rkstack/actions/workflows/check.yml/badge.svg)](https://github.com/mrkhachaturov/rkstack/actions/workflows/check.yml)
[![Docs](https://github.com/mrkhachaturov/rkstack/actions/workflows/update-refs.yml/badge.svg)](https://github.com/mrkhachaturov/rkstack/actions/workflows/update-refs.yml)
![Skills](https://img.shields.io/badge/skills-23-0f766e)
![Tiers](https://img.shields.io/badge/preamble%20tiers-T1--T4-6366f1)
![License](https://img.shields.io/badge/license-MIT-3b82f6)

| | Scope | Meaning |
|---|-------|---------|
| 🧠 | Workflow | Full cycle: idea → spec → plan → implement → verify → review → ship |
| 🛡️ | Safety | PreToolUse hooks block destructive commands and scope-lock edits |
| 🔍 | Detection | scc detects your stack, preamble adapts behavior automatically |
| 📐 | Platform-agnostic | Reads CLAUDE.md for commands — works with any stack |

> [!IMPORTANT]
> RKstack enforces discipline that prevents common AI agent failures:
> skipping tests, guessing at root causes, claiming things work without
> checking, and making destructive changes without warning.

---

## ⚡ Quick Start

```bash
# Claude Code
/install-plugin rkstack@ccode-personal-plugins
```

That's it. Skills activate automatically based on what you're doing.

---

## 🗺️ The Flow

```mermaid
graph LR
    A["💡 Idea"] --> B["🧠 brainstorming"]
    B --> DR1["🔄 dual-review"]
    DR1 --> C["📋 writing-plans"]
    C --> DR2["🔄 dual-review"]
    DR2 --> D{"Execute"}
    D -->|inline| E["⚙️ executing-plans"]
    D -->|subagents| F["🤖 subagent-driven"]
    E --> G["✅ verification"]
    F --> G
    G --> H["🔍 code-review"]
    H --> I["🚀 finishing-branch"]
    I --> J["📝 document-release"]

    style A fill:#f59e0b,color:#000
    style B fill:#8b5cf6,color:#fff
    style C fill:#6366f1,color:#fff
    style DR1 fill:#f97316,color:#fff
    style DR2 fill:#f97316,color:#fff
    style G fill:#10b981,color:#fff
    style H fill:#0ea5e9,color:#fff
    style I fill:#0f766e,color:#fff
```

Each step uses **test-driven-development** (RED → GREEN → REFACTOR). Bugs trigger **systematic-debugging** (5-phase investigation, 3-strike escalation). **humanizer** constraints activate during all prose writing (specs, plans, CHANGELOGs, docs).

---

## 🔄 Dual-Review: Claude Writes, Codex Reviews

Specs and plans go through a multi-round review loop before you approve them. Claude self-reviews first, then Codex reviews independently against the source code. Claude evaluates each finding, fixes valid ones, rejects false positives with evidence. Rounds repeat until Codex comes back clean or max rounds are reached.

```mermaid
graph TD
    A["Claude writes artifact\n(spec or plan)"] --> B["Claude self-reviews\n(reads source code)"]
    B --> C["Fixes own findings"]
    C --> D["Codex reviews\n(read-only, sees source code)"]
    D --> E{"Findings?"}
    E -->|none| F["Clean exit ✓"]
    E -->|findings| G["Claude evaluates each\nagainst source code"]
    G --> H["Valid → fix"]
    G --> I["Rejected → cite evidence"]
    G --> J["Unclear → surface to user"]
    H --> K{"Max rounds?"}
    I --> K
    J --> K
    K -->|no| D
    K -->|yes| L["Report results"]
    F --> L
    L --> M["User approves"]

    style A fill:#8b5cf6,color:#fff
    style D fill:#f97316,color:#fff
    style F fill:#10b981,color:#fff
    style H fill:#10b981,color:#fff
    style I fill:#ef4444,color:#fff
    style J fill:#f59e0b,color:#000
    style M fill:#0f766e,color:#fff
```

**Real example** — reviewing a CLI distribution plan:

|   | Round 1    | Round 2    | Round 3 |
| --- | ---------- | ---------- | ------- |
| Codex findings | 10 | 3 | 1 |
| Valid (fixed) | 3 | 2 | 0 |
| Rejected | 7 | 1 | 1 |
| Result | tightening | converging | clean |

Each round gets tighter. Codex catches real issues Claude missed (missing CI path trigger, version mismatch guard). Claude rejects findings where Codex lacked context (standard Rust patterns, intentional parallelism). Three rounds, zero remaining issues.

```
/dual-review path/to/spec.md            # review any spec or plan
/dual-review path/to/plan.md --rounds 5 # up to 5 rounds
```

---

## 📦 Skills

### 🧠 Core Workflow

| | Skill | What it does |
|---|-------|-------------|
| 💡 | **brainstorming** | Explore ideas before code. Design spec before implementation. |
| 📋 | **writing-plans** | Bite-sized TDD tasks. Exact file paths. No placeholders. |
| ⚙️ | **executing-plans** | Inline execution with checkpoints every 3 tasks. |
| 🤖 | **subagent-driven-development** | Fresh agent per task. Two-stage review. |
| 🧪 | **test-driven-development** | RED → GREEN → REFACTOR. No code without failing test. |
| ✅ | **verification-before-completion** | Prove it works before claiming done. |
| 🔍 | **requesting-code-review** | Two-pass review (CRITICAL → INFORMATIONAL). Fix-first. |
| 🚀 | **finishing-a-development-branch** | Test triage → merge/PR → cleanup. |

### 🔧 Quality & Security

| | Skill | What it does |
|---|-------|-------------|
| 🐛 | **systematic-debugging** | 5-phase investigation. 3 strikes then escalate. |
| 🛡️ | **cso** | OWASP Top 10 + STRIDE security audit. |
| 📝 | **document-release** | Post-ship documentation audit and sync. |
| 📊 | **retro** | Weekly retrospective with commit analysis and trends. |
| 💬 | **receiving-code-review** | Respond to feedback with technical rigor. |
| ✍️ | **humanizer** | Write like a human. 35 anti-AI constraints active during composition. |
| 🔄 | **dual-review** | Claude writes, Codex reviews. Sequential rounds until clean. Source code is truth. |

### 🚧 Safety Guardrails

| | Skill | What it does |
|---|-------|-------------|
| ⚠️ | **careful** | Warn before `rm -rf`, `DROP TABLE`, `force-push`. |
| 🔒 | **freeze** | Lock edits to one directory. Hard block. |
| 🛡️ | **guard** | Both careful + freeze at once. |
| 🔓 | **unfreeze** | Remove freeze restriction. |

### 🔩 Utility

| | Skill | What it does |
|---|-------|-------------|
| 🌳 | **using-git-worktrees** | Isolated workspaces for feature work. |
| ⚡ | **dispatching-parallel-agents** | Run independent tasks in parallel. |
| ✏️ | **writing-skills** | Create skills for your project. TDD for documentation. |

---

## 🏛️ Architecture

### 🔄 Session Lifecycle

```mermaid
graph TD
    A["🚀 Session starts"] --> B["hooks/session-start"]
    B --> C["📖 Injects using-rkstack"]
    C --> D{"User intent?"}
    D -->|build| E["🧠 brainstorming"]
    D -->|bug| F["🐛 systematic-debugging"]
    D -->|review| G["🔍 requesting-code-review"]
    D -->|ship| H["🚀 finishing-branch"]
    D -->|security| I["🛡️ cso"]
    D -->|safety| J["🚧 guard"]

    style A fill:#0f766e,color:#fff
    style C fill:#6366f1,color:#fff
```

### 📐 Preamble Tier System

Every skill gets a preamble — a bash block collecting project facts. Tiers control context depth:

| | Tier | Sections | Skills |
|---|------|----------|--------|
| 🟢 | T1 | Core detection + Escalation | using-rkstack, careful, freeze, guard, unfreeze |
| 🔵 | T2 | + AskUserQuestion Format + Completeness | brainstorming, debugging, plans, verification, +8 more |
| 🟣 | T3 | + Repo Ownership + Search Before Building | test-driven-development |
| 🔴 | T4 | Full context (gate-quality) | requesting-code-review, finishing-branch |

### 🔧 Template System

```
skills/{name}/SKILL.md.tmpl     ← human writes (content + {{PLACEHOLDERS}})
        │
        ▼  gen-skill-docs.ts    ← resolves placeholders from registry
        │
        ▼
skills/{name}/SKILL.md          ← generated, committed, read by Claude
```

Skills that reference official Claude Code docs (like `writing-skills`) include a `refs/` directory with auto-updated documentation from Anthropic. CI checks daily for upstream changes and bumps the plugin version when refs update — so your plugin stays current.

---

## 🧰 For Contributors

```bash
just setup         # 📦 install tools via mise
just build         # 🔨 pull docs + generate all SKILL.md from templates
just dev-build     # 🔧 generate project-local dev skills with refs
just check         # ✅ verify generated files are fresh
just skill-check   # 🩺 health dashboard for all skills
just dev           # 👀 watch mode: auto-regen on change
bun test           # 🧪 run 75 tests (<6s)
```

| | Tool | Purpose |
|---|------|---------|
| 🧰 | `mise` | Installs bun, just, scc |
| ⚡ | `just` | Task runner |
| 📊 | `scc` | Tech stack detection |
| 🍞 | `bun` | TypeScript runtime + test runner |

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add skills and work with templates.
See [ARCHITECTURE.md](ARCHITECTURE.md) for why rkstack is built this way.

---

## 💡 Philosophy

See [ETHOS.md](ETHOS.md) for the full builder philosophy:

| | Principle | What it means |
|---|-----------|--------------|
| 🌊 | **Completeness is cheap** | AI makes the last 10% near-free. Do it. |
| 🔎 | **Search before building** | Know what exists before you design. |
| 📋 | **Evidence before assertions** | Prove it works, don't claim it. |
| 🔌 | **Platform-agnostic** | Read from CLAUDE.md, never hardcode. |
| 🚨 | **Escalate, don't guess** | 3 strikes then stop. |

---

## 📄 License

MIT. See [LICENSE](LICENSE).

Upstream skills adapted from [gstack](https://github.com/garrytan/gstack)
and [superpowers](https://github.com/obra/superpowers) — see
THIRD_PARTY_NOTICES.md for their licenses.
