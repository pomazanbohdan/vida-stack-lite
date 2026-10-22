---
type: Runtime Request
id: REQ-D3-D8
title: 'REQ-D3-D8 — VP instruction registry and methodology profile'
description: 'Draft request to the Agent maintainer for one D3/D8 integration plan and its approved policy gates.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- runtime-request
- d3
- d8
sources:
- id: decision-registry
  resource: /decisions/D3-instruction-catalog-and-registry.md
  title: D3 instruction catalog and registry
- id: decision-profile
  resource: /decisions/D8-methodology-profile.md
  title: D8 methodology profile
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: implementation-plan
  resource: /implementation-plan.md
  title: Vida Powers implementation plan
- id: agent-runtime-observation
  resource: /../../agent/src/research-decision.ts
  title: Current Agent registry validation and activation surfaces
- id: agent-config-observation
  resource: /../../agent/src/config/runtime-config.ts
  title: Current Agent runtime configuration surface
- id: runtime-config-file
  resource: /../../../agent-runtime.config.v1.yaml
  title: Current Agent runtime configuration file
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-22T08:01:00Z' }
revision: '3'
---

# REQ-D3-D8 — VP instruction registry and methodology profile

## Request status

**Draft; not sent.** This packet requests an owner response and a future implementation plan. It does not authorize Agent Source writes, delivery, installation, Runtime acceptance, or user acceptance. It is separate from Work Item VP-7.

## Intent and contract trace

The request implements the existing D3 boundary for a VP extended registry and the D8 boundary for one VP-owned profile schema. The trace is BR-07 and BR-16, D3/D8, SR-34 through SR-41, and Stage 7 of the [implementation plan](../implementation-plan.md). The D3 and D8 decisions define the owner split; this request does not revise those decisions or add canonical acceptance criteria.

## Current evidence and boundaries

- The Agent currently reads `agent-runtime.config.v1.yaml`. That file contains the existing `research_decision.registry`, with `InstructionRegistry/v1` and its `source_path` contract. The exported `validateInstructionRegistry` in [research-decision.ts](../../../agent/src/research-decision.ts) enforces the 64-entry limit. The file has no VP profile section.
- D8 names `.vida/project.yaml` as the Runtime target carrier and ties the profile section's appearance to the cutover. No existing VP profile support is claimed in the active config or the target carrier.
- Current `vp-setup` writes `.vida/vp-profile.json` and `vida-project-profile.json` as bridge JSON materializations. These are not the D8 carrier and are not read by the current Agent Runtime.
- Exported Agent surfaces observed for owner assessment are `validateInstructionRegistry` and `resolveInstructionActivation` in [research-decision.ts](../../../agent/src/research-decision.ts), plus `ResearchDecisionConfig` in [runtime-config.ts](../../../agent/src/config/runtime-config.ts). The internal, non-exported `assertResearchDecisionConfiguration` is defined in [runtime-config.ts](../../../agent/src/config/runtime-config.ts). These are read-only observations and candidates, not approved extension APIs or final edit locations.
- Current sources do not show VP extended-registry or VP profile-reader support in either carrier. The Agent maintainer chooses final implementation files and schema/config paths.
- No approved required/optional policy exists for a VP registry or profile. The request asks the Agent maintainer to propose explicit behavior for owner approval. Missing input has no silent default.

## Requested scope

1. VP owns its canonical instruction content, `VPEffectiveProfile/v1`, source methodology profile schema and field semantics, and the generated VP artifact with its final Source binding.
2. The Agent maintainer owns the separate extended registry schema/config, Runtime reading and validation, and integration with the existing activation engine. Identify the exact source/config files in the response.
3. Preserve the existing `InstructionRegistry/v1`, `research_decision.registry`, 64-entry limit, `source_path` contract, and activation semantics. Do not extend or repurpose that registry for VP entries.
4. Reuse existing activation behavior for the declared Source link/digest, privacy, size, and output checks. Do not add a resolver, scheduler, execution graph, ledger, state store, or copied VP source package.
5. Resolve the current-versus-cutover carrier policy and migration sequence. D8's target is `.vida/project.yaml`; the current config is read by the Agent but has no VP profile section. Do not claim existing support in either carrier.
6. Propose required/optional behavior for both registry and profile, including missing and invalid input. Obtain explicit owner approval before implementation; do not silently select a default.
7. Bind implementation and schema/source hashes only after the relevant E4 profile/catalog inputs freeze. E5a manifest work is not a prerequisite. This draft remains unbound to final hashes.

## Requested measurable acceptance and evidence

- A separate VP extended registry contract is consumed by the Agent package without changing the existing registry contract.
- The existing activation engine validates and activates the generated VP artifact with its declared Source/digest, privacy, size, and output checks.
- The VP-owned profile is read and validated through the owner-approved carrier policy; invalid or mismatched input is rejected.
- The approved required/optional policy defines missing registry/profile behavior without silent defaults. Focused Agent tests cover valid input, invalid schema, digest mismatch, and missing-input behavior under that policy.
- No second resolver, state store, scheduler, execution graph, or copied VP source is introduced.
- The Agent maintainer returns exact changed paths, schema/config versions, focused test names, commands, and receipts bound to final input hashes.
- Static and fixture evidence remains distinct from Runtime execution and attributable user acceptance. Request delivery is not Runtime acceptance.

## Open decisions for the owner response

- Which reader path applies before and after the `.vida/project.yaml` cutover, and what migration or compatibility sequence governs it?
- Is the extended registry required or optional, under which activation conditions, and how is absence reported?
- Is the profile required or optional, under which conditions, and how are missing and invalid inputs handled? No silent defaults are permitted.
- Which Agent-owned schema/config/source paths implement the approved behavior, and which final Source/schema hashes bind the evidence after the relevant E4 profile/catalog inputs freeze?
- Which test receipts and Runtime observations are required before any Runtime acceptance claim?

## Requested response and handoff

Please return the proposed policy answers, the Agent-owned implementation path/schema list, migration sequence, focused test plan, and evidence requirements. The Vida Powers owner retains the profile schema and source semantics; the Agent maintainer retains Runtime registry/config/reader ownership. Any change to D3/D8 behavior returns to the respective owner for approval.

The current next-actions queue records G as a draft prepared, unsent and unaccepted. This document does not mark G complete or authorize delivery. The request remains unbound to final hashes until the relevant E4 profile/catalog inputs freeze; E5a is not a prerequisite.

