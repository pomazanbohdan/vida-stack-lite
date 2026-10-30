---
type: Work Item
id: VP-7
title: 'VP-7 — Runtime integration'
description: 'Stage 7 work item for D3 registry and D8 profile integration through the existing Agent activation path.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- work-item
- stage-7
sources:
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers delivery status and forward stages
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers product research
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers acceptance criteria
- id: decision-registry
  resource: /decisions/D3-instruction-catalog-and-registry.md
  title: D3 instruction catalog and registry
- id: decision-profile
  resource: /decisions/D8-methodology-profile.md
  title: D8 methodology profile
- id: request
  resource: /requests/REQ-D3-D8-runtime-request.md
  title: D3/D8 Runtime request draft
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-22T21:24:38Z' }
revision: '4'
---

# VP-7 — Runtime integration

## Owner and state

Owner: Agent maintainer for Runtime registry/config/reader code; Vida Powers owner for VP schemas, source profile, canonical content, and generated artifact. State: draft. The Work Item is a human planning record, not a Runtime-admitted machine record or evidence of integration.

## Goal

Integrate the VP extended instruction registry and VP-owned methodology profile through the Agent's existing activation path, with explicit configuration policy, source binding, and evidence owned by the Agent maintainer.

## Frozen Work Scope

- Stage 7a uses the current v1 contracts and existing execution path. It adds no external stages, second resolver, graph compiler, scheduler, ledger, or database. Runtime work belongs to the Agent maintainer.
- D3 requires a separate VP extended registry and its own schema/config surface. Preserve the existing `InstructionRegistry/v1`, `research_decision.registry`, 64-entry limit, `source_path` contract, and activation semantics.
- D8 has one VP-owned profile schema. The Agent currently reads `agent-runtime.config.v1.yaml`, which has no VP profile section. D8 ties appearance of the Runtime profile section to the `.vida/project.yaml` cutover. The Agent maintainer must resolve the transition/read policy; no existing support is claimed in either carrier.
- No approved required/optional policy exists for the VP registry/profile. Missing-input behavior and any requiredness must receive explicit owner approval; silent defaults are forbidden.
- Stage 7b storage migration remains gated by the separate storage-admission GAP and runtime owner. It is outside this request and must not be implemented as a second database.
- One request, `REQ-D3-D8`, carries both D3 and D8. It is separate from VP-7 and binds the current published base plus relevant VP inputs; rebind if an input changes before handoff. E5a manifest work is not a prerequisite.

## Acceptance references

Relevant canonical criteria include AC-19 through AC-24, AC-38, and AC-40, plus the Runtime track in the [next actions](../next-actions.md#forward-stages). The trace includes BR-07, BR-08, BR-10, D3, D8, SR-34 through SR-54, and SR-72. Runtime support and user acceptance remain open until the Agent-owned implementation, installation, and attributable acceptance evidence exist.

## Implementation status addendum — 2026-10-23

The `REQ-D3-D8` request is bound to the current published Source commit and the listed
VP input hashes; see the request for the exact values. It is prepared for owner review,
unsent and unaccepted. D8 keeps `.vida/project.yaml` as the approved post-cutover target.
The Agent currently reads `agent-runtime.config.v1.yaml`; `vp-setup` JSON outputs remain
bridge materializations and are not Runtime reads. Required/optional policy and the
current-to-cutover migration remain open. No attributable handoff or admission evidence
exists, so the G phase remains open. Runtime acceptance remains a separate gate.

## Relations

- `implements` → the Runtime track in the [next actions](../next-actions.md#forward-stages).
- `derived-from` → BR-07/BR-08/BR-10, D3, and D8.
- `informs` → the separate `REQ-D3-D8` request; this relation does not reuse its ID or make the request a Work Item.
- Depends on VP-5 and VP-6; Stage 7b additionally depends on the runtime storage-admission decision.

## Expected evidence

- Agent-owned schema/config/source paths and focused tests for valid input, invalid schema, source/digest mismatch, and missing registry/profile behavior under an explicitly approved required/optional policy.
- Source-bound VP artifact receipts, existing activation checks for privacy/size/output, selected carrier and migration decisions, and exact Agent/VP input hashes for each future implementation receipt. The current request's VP inputs are bound in `REQ-D3-D8`.
- Static/fixture evidence is labeled separately from actual Runtime execution and attributable user acceptance. Delivery of the request or presence of code is not Runtime acceptance.
- The Agent maintainer returns the implemented file list, test names, commands, and receipts. No Agent Source change is authorized by this Work Item alone.

## Artifact contract

- **Output kind:** Agent-owned Runtime integration for the VP registry/profile through the existing activation engine, plus its source-bound implementation and acceptance evidence.
- **Required data:** the separately owned extended registry contract, VP profile schema and field semantics, approved required/optional behavior, generated Source identity/digest, chosen current/cutover carrier and migration rule, privacy/size/output behavior, tests, and Runtime evidence.
- **Materialization location:** VP schema/content/build inputs remain under `packages/powers/`; Agent schema/config/reader work remains in `packages/agent/`; `.vida/project.yaml` is the approved Runtime target carrier after cutover. No current VP support is inferred.
- **Presence/format/digest verification:** validate the generated artifact, selected carrier, schema, declared Source path/digest, and size/privacy/output constraints against the final frozen inputs.
- **Semantic verification:** focused Agent tests establish activation and policy behavior; Runtime execution and attributable user acceptance are separate gates. Static or fixture checks alone do not prove them.

## Links and handoff

- [Next actions](../next-actions.md)
- [Product research](../research/vida-powers-product-research.md)
- [System specification](../system-specification.md)
- [Acceptance criteria](../acceptance.md)
- [D3 decision](../decisions/D3-instruction-catalog-and-registry.md) · [D8 decision](../decisions/D8-methodology-profile.md)
- [Draft `REQ-D3-D8`](../requests/REQ-D3-D8-runtime-request.md)
