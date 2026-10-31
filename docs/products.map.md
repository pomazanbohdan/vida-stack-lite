# Product source map

Owner: repository maintainer. Class: derived map; canonical behavior is not
duplicated here.

## Products

| Product | Stable project ID | Actual root | Registration |
| --- | --- | --- | --- |
| VIDA Agent | `agent` | `packages/agent` | Registered |
| VIDA Codex | `plugin` | `packages/plugin` | Registered |
| Vida Powers | `powers` | `packages/powers` | Not registered |

The product documentation identifies three products; the
sidecar and root cfg still describe/register only `agent` and `plugin`. Codex
product docs remain a setup GAP. The requested Codex root `packages/codex` is
not in place; relocation is unsupported by the current public CLI. No project
IDs have changed.

Powers canonical sources: [index](../packages/powers/docs/index.md),
[business requirements](../packages/powers/docs/business-requirements.md),
[system specification](../packages/powers/docs/system-specification.md), and
[acceptance](../packages/powers/docs/acceptance.md).

- Agent system behavior: `packages/agent/docs/system-specification.md`.
- Audit-state and successor qualification evidence: `packages/agent/docs/research/audit-36-validation-20261001.md` (supporting research, not acceptance).
- Supporting execution-backend research: `packages/agent/docs/research/openai-execution-backends.md`.
- Official framework reference registry and case applicability: `packages/agent/docs/research/agent-framework-reference-registry.md` (supporting research; lifecycle policy remains in the lifecycle instruction).
- Agent lifecycle and speed protocol: `packages/agent/instructions/development-lifecycle.md`.
- Agent verification: `packages/agent/TESTING.md`.
- Derived native-primary and npm/SDK compatibility installation/repair guide: `packages/agent/docs/installation.md`.
- Agent implementation: `packages/agent/src/`, public commands in `packages/agent/bin/`.
- Plugin owner sources: `packages/plugin/docs/business-requirements.md`,
  `system-specification.md`, `acceptance.md`; absent files remain an explicit
  owner setup gap.
- Repository identity, owners and commands: `AGENT.sidecar.md`.
- Source-only standing package/Git authorization: `AGENT.sidecar.md#source-package-git-policy`.

Relations: the agent specification documents the implementation and is verified
by its package tests; the product map depends on the Sidecar source bindings.

Repository-only migration evidence: [consumer retirement inventory and ordering](migration/consumer-source-retirement.md). This is supporting evidence, not an npm asset or runtime authority.
