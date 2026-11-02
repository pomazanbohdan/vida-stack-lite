# Project context

Repository: vida-agent
Selected projects: agent, plugin, powers
Runtime bundle: vida-agent
Machine configuration: agent-runtime.config.v1.yaml

This project-owned sidecar is the source map and development policy for this
repository. The repository root is the directory containing this file. Resolve
every path below against that root, including when the caller cwd is different.

## Sources, projects and ownership

| Project | Product root | Business / system sources | Code and checks |
| --- | --- | --- | --- |
| Agent | `packages/agent` | `packages/agent/docs/system-specification.md`; a separate business-requirements file is not supplied by this work | `packages/agent/src`, `packages/agent/bin`, `packages/agent/tests`, `packages/agent/TESTING.md` |
| Plugin | `packages/codex` | Separate business/system requirements are not supplied by this work | `packages/codex/package.json` declares its own commands |
| Powers | `packages/powers` | `packages/powers/AGENTS.md`, `packages/powers/docs/business-requirements.md`, `packages/powers/docs/system-specification.md`, `packages/powers/docs/acceptance.md`, `packages/powers/docs/decisions/index.md` | `packages/powers/tests`, `packages/powers/package.json` |

Agent current tasks and evidence boundaries belong to
`packages/agent/docs/next-actions.md`; its system specification remains the
behavior owner. Powers product instructions, current scope and history belong to
`packages/powers/AGENTS.md`, `packages/powers/docs/next-actions.md` and
`packages/powers/docs/log.md`. The authorized implementation record is
`.agent/work/vida-powers-skills-architecture-20261102/WORK.md`; it is derived
execution evidence, not another business/system authority.

Project documentation follows `docs/agent-instructions/documentation-policy.v1.json`
where that policy applies. Powers docs retain their product-owned OKF checks.
Working artifacts: `.agent/work/`; coordination: `.agent/coordination/`.
One writer owns each shared file; Root owns this sidecar, the project profile
and integration. Preserve unrelated dirty source and retained UNKNOWN evidence.
Delivery destinations and attributable user testing need their explicit owners.

## Product instructions

Product-specific instructions live in the nested product `AGENTS.md` files. For
Powers, read `packages/powers/AGENTS.md`; it owns the product source map, role
bootstrap, explicit-profile procedure, local commands and product checks. This
sidecar owns project roots, shared ownership/policy and pointers only. Product
instructions do not define Agent runtime consumption or shared-root changes.

## Development policy and checks

Read the product's nested AGENTS before its work. Existing lifecycle/allocation
policy references for this repository are
`packages/agent/instructions/development-lifecycle.md` and
`packages/agent/instructions/agent-allocation.md`; they remain policy owners,
not Powers bootstrap content or permission issued by the caller. A governed
runtime operation still requires its actual installed owner's bindings; source
reading and this sidecar do not manufacture them. Preserve authorization,
one-writer, CAS/lease, no-follow, UNKNOWN and user-acceptance boundaries wherever
the owning operation requires them.

For Powers use the product commands in `packages/powers/AGENTS.md`. Preserve
failures outside the assigned scope and all retained test evidence; do not weaken
gates or run mutation without authority. Code-tooling discovery uses the
configured Vex/AST route when available; absent tools require an explicit
limitation and direct current-source inspection.

Framework instructions stay with their package; project documents and records
stay project-owned. Initialization preserves this sidecar's project values.
Before any future current-v1 schema change affecting active artifacts, ship the
bundle-owned atomic artifact-repair owner required by the existing contract;
this project-document adoption does not change those active runtime schemas.
