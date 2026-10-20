---
type: Decision
title: 'D7 — Environment-driven VP initialization: three configuration carriers'
description: 'vp-setup determines the initialization environment and writes the configuration into the matching carrier: the project instruction file (standalone), the config file of the agent runtime (agent delivery without host systems), or the template-based project config file (host layer).'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- initialization
- vp-setup
- configuration-surface
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: agent-system-spec
  resource: /../../agent/docs/system-specification.md
  title: Agent runtime system specification — initialized project layout
- id: agents-template
  resource: /../../agent/templates/AGENTS.template.md
  title: AGENTS.template.md — generator of the root discovery entry
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '1'
---

# Decision

**`vp-setup` — context-dependent initialization.** The procedure determines the environment
and writes the configuration into the carrier that belongs to that environment. The common
sequence is the same: determine the type of development, the type of flow, the number and roles of agents,
other necessary configuration — and write the result.

| Environment | Configuration carrier | What it writes |
|---|---|---|
| VP as a separate skill/plugin, **without** the agent runtime (Standalone) | The project instruction file: `AGENTS.md`, or, if `AGENTS.md` is absent and `CLAUDE.md` is present — `CLAUDE.md` | The managed VP YAML block: type of development, type of flow, number and roles of agents, effective methodology, references to artifacts |
| Agent delivery, **without** host systems | The config file of the agent runtime | The same content in the defined runtime format; `vp-setup` forms the agent config |
| An installed host layer (e.g. Codex) | The project config file | The layer configures its own agent system in the project config file based on templates |

# Context and evidence

- Research §3: `vp-setup` discovers projects and current instructions, adds/updates
  integration rules in `AGENTS.md` and in host-supported files, configures
  available session/compaction hooks, matches document and local work locations,
  guarantees idempotency and verifies activation.
- The root `AGENTS.md` in the **agent repository** is generated from
  `packages/agent/templates/AGENTS.template.md` (`project-specific-content:
  forbidden`, `replace-this-file-wholesale`) — therefore a VP block is never written
  into it (D-04).
- In a consumer project, `AGENTS.md` is a **project-owned** file; `.vida/` is the target
  consumer layout with local instructions in `.vida/instructions` and
  `.vida/AGENT.sidecar.md` (system-spec §132-190).
- Host templates for its own agent system already exist in the repository as a pattern
  (`tooling/agent/cloud-pstack-setup.ts` works with the superpowers/pstack host templates).

# Consequences

1. **`vp-setup` has three different writers**, and each is determined by the environment:
   the project instruction file / the runtime config / the project config of the host layer.
   None of them writes into the agent package.
2. **Idempotency** (§3) holds for each writer separately: a repeated run on
   unchanged input adds no duplicate blocks, hooks or entries.
3. **In the repository itself** the VP block is not written into `AGENTS.md` (the generator); for
   the repository, the VP integration lives on a project-owned surface (`.vida/` per the target
   layout or in the product-owned instructions) — this is a separate environment configuration.
4. **The configuration format is YAML** (a managed block in the instruction file / the project YAML
   config), consistent with the principle "one semantics, different carriers": the same fields
   (type of development, type of flow, agents, methodology, references) in different files.
5. **Activation verification** (§3) is performed in each environment separately: the start
   of a session, recovery after compaction, the context of a delegated agent.
6. **`.vida` is not a prerequisite** for the Standalone environment: it applies to Runtime
   (D8), where the target layout is not yet implemented.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) The current v1 config, `.vida` separately | VP targets the existing surface | **Partially accepted**: VP does not wait for `.vida` for Standalone; but the decision did not describe the distinction of environments |
| (b) Target `.vida` right away | One layout for everything | Rejected: blocks Standalone on someone else's cutover track |
| (c) Three carriers per environment | Standalone / agent-delivery / host-shim | **Accepted** — extends (a) with a real model of environments |

# Impact on other decisions

- D8: the methodology profile section lives in `.vida/project.yaml` (Runtime) and in
  the managed YAML block of the project instruction file (Standalone) — one schema,
  different carriers.
- D4: channel 1 (separate plugin) ↔ the Standalone environment; channel 2 (build into the agent
  package) ↔ the agent-delivery environment; channel 3 (marketplace) ↔ the
  host-shim environment.
- Stage 5: `vp-setup` implements three writers and activation verification in each.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
