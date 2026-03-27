# RKstack

Curated AI development workflow — unified skill packs for Claude Code, Codex, and Gemini.

Combines the best of multiple upstream skill sources into per-project
skill packs with consistent naming and controlled flow.

## Install

```bash
/plugin install rkstack-web@ccode-personal-plugins     # Web projects
/plugin install rkstack-infra@ccode-personal-plugins   # Infrastructure projects
/plugin install rkstack-base@ccode-personal-plugins    # Base (all projects)
```

## Skill packs

| Pack | For | Skills |
|------|-----|--------|
| **rkstack-web** | Next.js, React, Vue | think, plan, code (TDD), review, test, security, ship |
| **rkstack-infra** | Docker, Terraform, K8s | plan, code, review, deploy |
| **rkstack-base** | All projects | debug, retro, finish |

## Flow

```
think → plan → code (TDD) → review → test → security → ship → deploy
                  ↑                                         |
                  └──── debug (when something breaks) ──────┘
                                                    retro (weekly)
```

## License

MIT. Upstream skills retain their original licenses — see THIRD_PARTY_NOTICES.md.
