---
type: Task Plan
title: 'Vida Powers - task-level plan for step G: D3 and D8 Runtime request'
description: 'One scoped request for the Agent maintainer to add the VP instruction registry reader and read the VP-owned methodology profile through the existing activation path.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- task-plan
- runtime-request
- d3
- d8
sources:
- id: design
  resource: /catalog-design.md
  title: Vida Powers - instruction catalog design
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers - system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers - acceptance criteria
- id: implementation-plan
  resource: /implementation-plan.md
  title: Vida Powers - implementation plan
- id: step-e-plan
  resource: /task-plan-step-e.md
  title: Vida Powers - task-level plan for step E
- id: d3
  resource: /decisions/D3-instruction-catalog-and-registry.md
  title: D3 - VP instruction catalog and extended Agent registry
- id: d8
  resource: /decisions/D8-methodology-profile.md
  title: D8 - VP-owned methodology profile
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers - product concept
- id: runtime-research-decision
  resource: /../../agent/src/research-decision.ts
  title: Current Agent instruction registry reader and activation path
- id: runtime-config
  resource: /../../agent/src/config/runtime-config.ts
  title: Current Agent runtime configuration owner
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-22T07:50:14Z' }
revision: '4'
---

**Goal:** prepare one reviewable draft Runtime request for D3 and D8 with an Agent owner, a VP schema owner, measurable acceptance, evidence, and explicit unresolved carrier-policy questions.

**The specification this plan follows from:** B: `docs/research/vida-powers-product-research.md` sections 4 and 10, plus decisions D3 and D8. S: D3's separate extended Agent registry and D8's one VP-owned profile schema with carriers by environment; `docs/system-specification.md` SR-34-SR-36 and SR-39-SR-41. C: current Agent owners in `packages/agent/src/research-decision.ts` and `packages/agent/src/config/runtime-config.ts`; acceptance for this request is request-level and does not add canonical AC definitions.

## Scope and boundaries

- Create one request at `packages/powers/docs/requests/REQ-D3-D8-runtime-request.md`. Use `REQ-D3-D8` as the request ID. VP-7 remains its separate Work Item.
- The Agent maintainer owns the extended registry and profile reader. The Vida Powers owner owns `VPEffectiveProfile/v1` and its source profile schema and field semantics.
- VP owns the canonical instruction corpus and profile artifacts. The Agent package consumes the generated VP artifact and implements Runtime reading through its existing activation engine.
- D3 requires a separate extended VP registry. Do not change the existing `InstructionRegistry/v1`, `research_decision.registry`, its 64-entry limit, source-path contract, or activation semantics.
- D8 keeps one VP-owned profile schema and ties appearance of its Runtime configuration section to the `.vida/project.yaml` cutover. The Agent currently reads `agent-runtime.config.v1.yaml`, which has no VP profile section. Ask the Agent maintainer to resolve the current-versus-cutover read policy; do not claim existing VP support in either carrier.
- No approved VP registry/profile required-versus-optional policy exists. The request proposes that policy for explicit owner approval and requires no silent defaults.
- Do not add a second resolver, scheduler, graph compiler, ledger, database, or copied VP source package.
- A delivered request is not an implementation, installation, Runtime acceptance, or user acceptance.
- G may prepare this draft after the reviewed plan corrections without waiting for F or E4/E5 product metadata. Final hash binding applies only to relevant E4 profile/catalog inputs; E5a manifest work is not a prerequisite. No VP project/provider registration is inferred.
- The live next-actions queue records G as a prepared draft, not delivered or complete; this packet does not establish Runtime acceptance.

## Current code observations

- Exported `validateInstructionRegistry` and `resolveInstructionActivation` in `packages/agent/src/research-decision.ts`, plus exported `ResearchDecisionConfig` in `packages/agent/src/config/runtime-config.ts`, are observed surfaces. The internal, non-exported `assertResearchDecisionConfiguration` validates current `research_decision` config; it is not an extension API. These source references are candidate boundaries for owner assessment, not approved contracts or locations.
- The current runtime config has the existing `research_decision.registry` but no VP profile section. Its 64-entry limit and `source_path` contract remain unchanged. No source observation establishes an extended VP registry, VP profile reader, or registered support in either carrier.
- The Agent maintainer selects the final code and schema files in the request response. No implementation support is claimed by these source observations.

## Plan review and validation method

The independent MiniMax M3.1 Flash Free review is READY after the text corrections in this revision. The DeepSeek Free attempt failed quota and remains unfulfilled; any independent Luna evidence is supplemental and is not labeled M3.1 or DeepSeek. The corrected plan may proceed without another routine plan approval. The request remains a draft and does not represent Runtime implementation or acceptance.

## Files and owners

| File | Owner and responsibility |
|---|---|
| Create `docs/requests/REQ-D3-D8-runtime-request.md` | Agent maintainer receives the request; VP owner owns the profile schema |
| Read `packages/agent/src/research-decision.ts` | Current registry validator and activation path; read-only input |
| Read `packages/agent/src/config/runtime-config.ts` | Current Runtime config contract; read-only input |

No Agent source, runtime config, product schema, acceptance document, or root project/provider registry is edited by this plan.
The draft request uses OKF frontmatter with a non-empty type, draft status, ISO `stale_after`, source resources, actor-valid `generated.by`, and ISO `generated.at`; new docs contain no BR/SR/AC definition markers.

## Task G1 - Freeze the runtime request

**File:** create `docs/requests/REQ-D3-D8-runtime-request.md`.

1. State the B/S trace to D3 and D8. Keep the request within the accepted VP-to-Agent boundary.
2. Specify the D3 consumer/provider split: VP supplies the canonical content and generated source-bound artifact; Agent owns a separate extended registry, configuration section, and reader in the existing activation engine.
3. Specify the D8 owner split: VP owns `VPEffectiveProfile/v1` and its source methodology profile; Agent owns reading and validating the profile in Runtime.
4. Name the observed surfaces exactly: exported `validateInstructionRegistry` and `resolveInstructionActivation` in `packages/agent/src/research-decision.ts`, exported `ResearchDecisionConfig` in `packages/agent/src/config/runtime-config.ts`, and internal non-exported `assertResearchDecisionConfiguration`. Mark all as read-only evidence/candidates, not extension APIs, approved support, or final edit locations.
5. State that the Agent currently reads `agent-runtime.config.v1.yaml`, which contains no VP profile section. D8 ties section appearance to the `.vida/project.yaml` cutover. Ask the Agent maintainer to resolve the current-versus-cutover read policy and migration sequence; claim no existing VP support in either carrier.
6. Preserve `InstructionRegistry/v1`, `research_decision.registry`, its 64-entry limit, and its `source_path` contract.
7. State that no approved required/optional policy exists for VP registry/profile. Ask the Agent maintainer to propose it for explicit owner approval, with missing/invalid behavior defined and no silent defaults.
8. Include request-level measurable acceptance and evidence:
   - A separate VP extended registry schema/config is consumed by the Agent package.
   - The current activation engine validates and activates the generated VP artifact with its declared source/digest, privacy, size, and output checks.
   - The Runtime reads the VP-owned profile through the active carrier and rejects invalid or mismatched profile input.
   - Focused Agent tests cover valid input, invalid schema, digest mismatch, and missing profile/registry behavior after the required/optional policy is explicitly approved. No silent default is allowed.
   - The result introduces no second resolver, state store, scheduler, or copied VP source.
   - The Agent maintainer returns exact source paths, tests, and receipts. Static and fixture evidence remain distinct from Runtime and user acceptance.
   - Acceptance states which current/cutover carrier is selected, how migration is handled, and which source/schema hashes bind the implementation after the relevant E4 profile/catalog inputs freeze.
9. List prerequisites, owner, requested response, non-goals, dependencies, and handoff. Keep F and product metadata out of the dependency chain.

**Acceptance:** one draft request document has a stable `REQ-D3-D8` ID, named Agent and VP owners, frozen D3/D8 boundaries, current/target carrier facts and an open migration question, an explicit owner-approval gate for required/optional policy, measurable evidence, accurate code candidates, and a statement that request delivery proves no implementation or acceptance. It remains unbound to final source/schema hashes until the relevant E4 profile/catalog inputs freeze.

## Task G2 - Validate and hand off

1. Run `check-okf.ts` for the package bundle and `check-documentation.ts` with the exact owned plan and request paths. Require no failures and a nonzero selected-document count.
2. Review every D3/D8 claim against the decision records and current Agent source. Remove any statement that presents the candidate code or either carrier as existing VP support.
3. Keep the request as a draft packet for the existing owner. The final integrator binds it to final relevant profile/catalog schema/source hashes after those E4 inputs freeze and reconciles the canonical queue/index/log. Do not modify Agent code, runtime configuration, or release state.

## Definition of done

1. The one draft request file passes OKF and focused document checks; this alone does not mark G as last or complete.
2. `REQ-D3-D8` remains separate from VP-7 and no new WorkItem schema or project/provider identity is introduced.
3. D3 uses a distinct extended registry and the existing activation path. D8 keeps VP ownership of the profile schema and names current versus target Runtime carriers.
4. The request has measurable acceptance and evidence owners, dependencies, and a clear handoff.
5. Request delivery is not described as Runtime implementation, installation, Runtime acceptance, or user acceptance. The live next-actions queue remains authoritative until its owner reconciles it.

## Implementation status addendum — 2026-10-22

`REQ-D3-D8` is prepared as a draft and remains unsent and unaccepted. D8 keeps
`.vida/project.yaml` as the approved Runtime target after cutover; the current Agent
reads `agent-runtime.config.v1.yaml` and has no VP profile reader. Current `vp-setup`
JSON exports are bridge materializations, not Runtime reads. Final binding waits only
for the relevant E4 profile/catalog Source and schema inputs to freeze; E5a is not a
prerequisite. Required/optional policy remains a proposal, with no provider/project
registration or Runtime acceptance.

## Outside this plan

- Runtime implementation or code changes under `packages/agent/`.
- Product schema changes or edits to the current B/S sources.
- Project/provider registration, installed runtime operations, or release.
- Waiting for F Work Items or new E4/E5 metadata before preparing this request.

---

**Plan implementation gate:** the corrected plan is READY for preparation of one draft request without waiting for F. Any change to the frozen D3/D8 boundary or claim of Runtime support requires the respective owner and new evidence. Request delivery, hash binding, and canonical reconciliation remain later gates.

## Implementation status addendum — 2026-10-22

`REQ-D3-D8` is prepared as a draft and remains unsent and unaccepted. D8 keeps
`.vida/project.yaml` as the approved Runtime target after cutover; the current Agent
configuration has no VP profile reader. The request's source/schema binding waits for
the relevant E4 profile/catalog inputs to freeze; E5a manifest repair does not block it.
