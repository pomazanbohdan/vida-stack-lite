---
type: Decision
title: 'D8 — Methodology profile: one VP schema, carrier per environment'
description: 'The methodology profile schema is VP-owned (VPMethodologyProfile/v1); Runtime carries the section in .vida/project.yaml, Standalone — the same section in the managed YAML block of the project instruction file, the host layer — in the project config file.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- methodology-profile
- configuration-surface
- inheritance
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: d7
  resource: /decisions/D7-consumer-initialization.md
  title: D7 — Environment-driven VP initialization
- id: project-config-schema
  resource: /../../agent/schemas/project-configuration.v1.schema.json
  title: VidaProjectConfig/v1 schema
- id: agent-system-spec
  resource: /../../agent/docs/system-specification.md
  title: Agent runtime system specification — initialized project layout
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '2'
---

# Decision

**One schema — different carriers.** The methodology profile schema belongs to **VP**:
`VPMethodologyProfile/v1` (its own `Type/vN` schema, its own owner). The physical
location is determined by the environment:

| Environment | Profile carrier |
|---|---|
| Runtime (agent environment) | A section in `.vida/project.yaml` — the target consumer layout |
| Standalone (VP without the agent runtime) | The same section in the managed YAML block of the project instruction file (`AGENTS.md`, or `CLAUDE.md` if `AGENTS.md` is absent) |
| Host layer (e.g. Codex) | The same section in the project config file assembled from the layer's templates |

The field set, the inheritance semantics and the conflict rules are **the same** in all
environments; only the carrier file differs.

# Profile composition

- Selection groups (for example `testing-sequence`, `review-strategy`, `architecture`, `delivery`) —
  each group has mutually exclusive alternatives, compatible additions and conditional dependencies.
- Explicit selective inheritance between products: the profile references stable IDs
  of another product; implicit full inheritance through a shared repository is **not**
  applied.
- A local override of a group takes priority over the inherited one without repeated
  confirmation; two contradictory inherited alternatives without a local decision are
  a conflict for the owner, not "the last loaded wins".
- Task-scoped override — a temporary exception for a particular task and product:
  requested once, recorded, passed to child agents; it does not change
  the permanent profile, other products, permissions or security gates.
- Live Inheritance: references to stable IDs without version pinning; a change of behavior —
  a new `pattern ID`, not a substitution of the same instruction.
- The flow level (`Full` / `Medium` / `Light`) — a separate property of the profile: depth,
  requirement level (`required` / `conditional` / `optional`) and applicability are different
  things.

# Consequences

1. **The schema is VP-owned**: `packages/powers/config/` + `VPMethodologyProfile/v1`;
   its own owner; no extension of runtime schemas "for the sake of a VP entity".
2. **Runtime validation of the section** in `.vida/project.yaml` — part of the same
   runtime work item as the extended instruction registry (D3): the runtime must
   read and pass the profile. One request, not two.
3. **`.vida/project.yaml` remains the target layout**; in its current state the Runtime
   uses `agent-runtime.config.v1.yaml` — the profile section appears in the
   Runtime config together with the cutover (D7: three environments, three carriers).
4. **Standalone does not depend on `.vida`**: there the profile lives in the managed block
   of the instruction file, which `vp-setup` writes.
5. **Research §4.3 already separates the environments** in exactly this way ("Standalone — a managed block in
   `AGENTS.md`; Runtime — product configuration"), so the decision is consistent with the
   B-source rather than contradicting it.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) A VP-owned schema, section in the runtime config | The profile — an extension of a foreign schema | Rejected: a VP entity in a foreign package; a runtime change without need |
| (b) A VP-owned schema + a file in the product | One file, the environments reference it | Rejected: a consumer project has no complete profile without an external file |
| (c) One schema, carrier per environment | VP schema; Runtime — `.vida/project.yaml`, Standalone — the instruction file, shim — the project config | **Accepted** |
| (d) `.vida/project.yaml` only | A Runtime-only carrier | Rejected: contradicts research §4.3 for Standalone; depends on the cutover |
| (e) Only the current runtime config | `agent-runtime.config.v1.yaml` | Rejected: divergence from the target layout and a separate migration |

# Impact on other decisions

- D7: D8 refines the profile carrier in each of the three environments; D7 does not change.
- D3: the runtime work item combines the extended instruction registry **and** reading
  of the methodology profile.
- D5: the profile sets the flow level that routing (LLM selection, agent formation)
  establishes.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
