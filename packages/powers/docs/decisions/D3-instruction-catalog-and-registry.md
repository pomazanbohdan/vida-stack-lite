---
type: Decision
title: 'D3 — VP instruction catalog: a standalone plugin and an extended registry in the agent package'
description: 'VP keeps its own catalog and its own scripts for finding and using instructions (a standalone plugin with a launch skill and a hook); in the mode of building into the agent delivery package, the agent package must have its own extended instruction registry.'
status: stable
stale_after: '2027-10-19T00:00:00Z'
tags:
- vida-powers
- instruction-catalog
- instruction-registry
- distribution
- decision
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: instruction-registry-schema
  resource: /../../agent/schemas/instruction-registry.v1.schema.json
  title: InstructionRegistry/v1 schema
- id: runtime-config
  resource: /../../agent/schemas/agent-runtime-config.v1.schema.json
  title: AgentRuntimeConfig/v1 schema
- id: agent-system-spec
  resource: /../../agent/docs/system-specification.md
  title: Agent runtime system specification
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '2'
---

# Decision

**VP is a standalone product with its own catalog and its own scripts** for finding and
using instructions. The canonical corpus lives in VP; the scripts `catalog.tags` /
`catalog.search` / `catalog.get` / `catalog.compose` are deterministic and implemented
in VP code. If VP is installed as a separate plugin, it works with its own launch
skill (Router) and its own hook, with no dependency on VIDA Runtime.

**If VP instructions are built into the agent delivery package, the agent package must have
its own extended instruction registry** — a separate registry within the agent package, with
the extended set of VP fields, read by the existing activation mechanism.

# Two modes, one source

| Aspect | Standalone: VP as a separate plugin | Bundled: VP in the agent package |
|---|---|---|
| Catalog | `packages/powers/instructions/` — canonical, unlimited | The same corpus, built into the agent package as a **generated artifact with a declared Source link** (not a second canonical copy) |
| Search and use | VP's own scripts (`catalog.*`) | The same VP scripts + the agent package registry |
| Instruction activation | VP's own mechanism (the Router forms the bundle) | The extended instruction registry of the agent package |
| Dependency on Runtime | None | Yes — the registry and its activation live in the agent package |

# Separation of catalog and registry (rev 2)


**Corpus listing (CAT-D3, rev 2).** `catalog.json` is the **single listing of the corpus**:
for each instruction — `instruction_id`, `path` and the `sha256` of the content. A file outside
the manifest, an entry without a file, or a mismatching digest — an error. The manifest is written only by
the converter (the single writer); runtime scripts only read.
**Canonical VP catalog (rev 2, approved by the owner on 2026-10-19).** The source of
rules is **`.md` instructions with metadata** in the flat `instructions/` directory; the machine
catalog file is `catalog.json` — identity, tag vocabulary, tag aliases and
exception entries. There are no separate per-donor directories: source, license and revision
live in the instruction metadata. Design — `docs/catalog-design.md`.

Below is the model accepted in rev 1; rev 2 changes only the **physical form of the catalog**,
not the boundaries with the agent package registry and not the delivery modes.

- **Catalog (canon)** — `VPCatalog/v1`: `instruction_id`, `capability_tags[]`,
  `pattern_tags[]`, `conditions`, `artifact_contract`, `compatibility`
  (groups/exclusions/dependencies), `provenance` (donor, license, source revision),
  `revision`, `status`, `content`. There is no limit on the number of entries: the corpus
  grows with the volume of donors.
- **Agent package registry (extended)** — its own schema and its own configuration section
  within the agent package, with the extended set of VP fields. The `research_decision`
  registry (`InstructionRegistry/v1`) is **not** changed and does not constrain VP: its limit
  `maxItems: 64` and its binding to research/synthesis stages remain a matter
  outside VP.
- **One activation engine.** The extended agent package registry introduces no separate
  activation: resolution, digests, `privacy`, `max_bytes`, validation of
  `output_schema` and writing of activation history — the same as already exist in the runtime.
  Adding the registry is a runtime work item (owner: agent maintainer), not
  a VP initiative.

# What this means for the repository

1. **Runtime work item** (owner — agent maintainer): add to the agent package
   an extended instruction registry (schema + configuration section + reading in
   the existing resolver). VP does not edit `packages/agent` itself; instead VP supplies
   the format and the build, the runtime — the registry and activation.
2. **The dispute about `source_path` is removed**: VP entries do not go into
   `research_decision.registry.instructions.N` (a rigid path template) but into
   their own section of the agent package registry.
3. **Building into the package** — a build-time step with a declared Source link and digest,
   following the pattern of generated artifacts already present in the repository (`payload-source-provenance`).
   The canonical copy remains in VP.
4. **Standalone delivery** needs no changes in the runtime at all: VP has its own
   scripts, launch skill and hook; installation goes through the D4 channel.
5. **Shared semantics**: the catalog format, tag rules, `catalog.*` and
   `artifact_contract` — one semantics for both modes; only the way of
   delivering instructions to the executor differs.

# Options considered

| Option | Essence | Conclusion |
|---|---|---|
| (a) Extend `InstructionRegistry/v1` | Add VP fields to the existing research-contour registry | Rejected: the limit of 64 and the binding to research stages do not suit the corpus; a change to a foreign runtime contract |
| (b) `VPCatalog/v1` + a projection of ≤64 into the existing registry | The catalog separately, part of it — in the research registry | Rejected: the binding to the research contour and the limit remain; in standalone mode there is nowhere to project to |
| (c) A completely separate VP activation | A second resolver and a second engine | Rejected: contradicts research §4.8 and the prohibition on duplicating mechanisms |
| (d) Two modes: standalone VP + an extended registry in the agent package | Canon in VP, registry in the package, one semantics | **Accepted** |

# Consequences for the plan

- Stage 2: `VPCatalog/v1` + its own `catalog.*` scripts + a specification of the extended
  agent package registry + a runtime work item; `research_decision.registry` is not
  touched.
- Stage 3: the corpus is written in the canonical catalog format; building into the agent package —
  a separate step with provenance.
- Stage 5: the Router works on top of its own catalog scripts; `vp-setup` installs
  the plugin with the launch skill and the hook.
- Stage 7: in Runtime mode, VP instructions are activated by the extended registry of the agent
  package; no second scheduler/ledger/DB appears.
- D4 (delivery channel) has three channels: a separate plugin and building into the agent package.

# Authority

Decision of the repository owner dated 2026-10-19, recorded in the current conversation.
