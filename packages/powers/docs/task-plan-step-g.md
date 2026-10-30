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
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-22T21:24:38Z' }
revision: '5'
---

**Goal:** prepare one reviewable, hash-bound draft Runtime request for D3 and D8 with an Agent owner, VP schema ownership, measurable acceptance, evidence, and explicit unresolved carrier-policy questions.

**The specification this plan follows from:** B: `docs/research/vida-powers-product-research.md` sections 4 and 10, plus decisions D3 and D8. S: D3's separate extended Agent registry and D8's VP-owned methodology profile with carriers by environment; `docs/system-specification.md` SR-33-SR-41, AC-15, AC-19, and AC-26/SR-58. C: current Agent owners in `packages/agent/src/research-decision.ts` and `packages/agent/src/config/runtime-config.ts`, plus the current VP profile, catalog, and setup readers. Acceptance for this request is request-level and adds no canonical AC definitions.

## Scope and boundaries

- Prepare one request at `packages/powers/docs/requests/REQ-D3-D8-runtime-request.md`. Use `REQ-D3-D8` as the request ID. VP-7 remains its separate Work Item.
- The Agent maintainer owns the extended registry and profile reader. The Vida Powers owner owns `VPEffectiveProfile/v1` and its source profile schema and field semantics.
- VP owns the canonical instruction corpus and profile artifacts. The Agent package consumes the generated VP artifact and implements Runtime reading through its existing activation engine.
- D3 requires a separate extended VP registry. Do not change the existing `InstructionRegistry/v1`, `research_decision.registry`, its 64-entry limit, source-path contract, or activation semantics.
- D8 keeps one VP-owned profile schema and ties appearance of its Runtime configuration section to the `.vida/project.yaml` cutover. The Agent currently reads `agent-runtime.config.v1.yaml`, which has no VP profile section. Ask the Agent maintainer to resolve the current-versus-cutover read policy; do not claim existing VP support in either carrier.
- No approved VP registry/profile required-versus-optional policy exists. The request proposes that policy for explicit owner approval and requires no silent defaults.
- Do not add a second resolver, scheduler, graph compiler, ledger, database, or copied VP source package.
- A delivered request is not an implementation, installation, Runtime acceptance, or user acceptance.
- G may prepare and bind this request without waiting for F or E5a product metadata. The request pins the current published base commit and relevant VP inputs; it does not close the full E4 gates or infer VP project/provider registration.
- The request remains separate from VP-7. See its Source binding section for detailed hashes and its current status.

## Current code observations

- Exported `validateInstructionRegistry` and `resolveInstructionActivation` in `packages/agent/src/research-decision.ts`, plus exported `ResearchDecisionConfig` in `packages/agent/src/config/runtime-config.ts`, are observed surfaces. The internal, non-exported `assertResearchDecisionConfiguration` validates current `research_decision` config; it is not an extension API. These source references are candidate boundaries for owner assessment, not approved contracts or locations.
- The current runtime config has the existing `research_decision.registry` but no VP profile section. Its 64-entry limit and `source_path` contract remain unchanged. No source observation establishes an extended VP registry, VP profile reader, or registered support in either carrier.
- Current VP inputs use `VPCatalog/v1`, `VPMethodologyProfile/v1`, and the resolved `VPEffectiveProfile/v1`. `catalog-cli.ts` and `vp-setup` retain their current JSON CLI and materialization contracts; the setup JSON outputs are not Agent Runtime reads. The request owns the exact input hashes and observed paths.
- The Agent maintainer selects the final code and schema files in the request response. No implementation support is claimed by these source observations.

## Plan review and validation method

The independent MiniMax M3.1 Flash Free review is READY after the text corrections in this revision. The DeepSeek Free attempt failed quota and remains unfulfilled; any independent Luna evidence is supplemental and is not labeled M3.1 or DeepSeek. The corrected plan may proceed without another routine plan approval. The request remains a draft and does not represent Runtime implementation or acceptance.

## Files and owners

| File | Owner and responsibility |
|---|---|
| Prepare `docs/requests/REQ-D3-D8-runtime-request.md` | Agent maintainer receives the request; VP owner owns the profile schemas and source semantics |
| Read `packages/agent/src/research-decision.ts` | Current registry validator and activation path; read-only input |
| Read `packages/agent/src/config/runtime-config.ts` | Current Runtime config contract; read-only input |

No Agent source, runtime config, product schema, acceptance document, or root project/provider registry is edited by this plan.
The draft request uses OKF frontmatter with a non-empty type, draft status, ISO `stale_after`, source resources, actor-valid `generated.by`, and ISO `generated.at`; new docs contain no BR/SR/AC definition markers.

## Task G1 - Freeze the runtime request

**File:** update `docs/requests/REQ-D3-D8-runtime-request.md`.

1. State the B/S trace to D3 and D8. Keep the request within the accepted VP-to-Agent boundary.
2. Specify the D3 consumer/provider split: VP supplies the canonical content and generated source-bound artifact; Agent owns a separate extended registry, configuration section, and reader in the existing activation engine.
3. Specify the D8 owner split: VP owns `VPMethodologyProfile/v1` source semantics and the current `VPEffectiveProfile/v1` resolved output; Agent owns reading and validating the effective profile in Runtime.
4. Name the observed surfaces exactly: exported `validateInstructionRegistry` and `resolveInstructionActivation` in `packages/agent/src/research-decision.ts`, exported `ResearchDecisionConfig` in `packages/agent/src/config/runtime-config.ts`, and internal non-exported `assertResearchDecisionConfiguration`. Mark all as read-only evidence/candidates, not extension APIs, approved support, or final edit locations.
5. State that the Agent currently reads root `agent-runtime.config.v1.yaml`, which contains `research_decision.registry` and no VP profile section. `vp-setup` writes `.vida/vp-profile.json` as a JSON bridge in Runtime mode; the Agent does not read it. D8 keeps `.vida/project.yaml` as the post-cutover target. Ask the Agent maintainer to resolve the current-versus-cutover read policy and migration sequence; claim no existing VP support in either carrier.
6. Preserve `InstructionRegistry/v1`, `research_decision.registry`, its 64-entry limit, and its `source_path` contract.
7. State that no approved required/optional policy exists for VP registry/profile. Ask the Agent maintainer to propose it for explicit owner approval, with missing/invalid behavior defined and no silent defaults.
8. Bind the request to the published immutable Source commit and exact current VP catalog, schema, profile, CLI, and setup-reader hashes. Exclude the request and mutable G status documents from this payload identity. Rebind if a listed input changes before handoff.
9. Include request-level measurable acceptance and evidence:
   - A separate VP extended registry schema/config is consumed by the Agent package.
   - The current activation engine validates and activates the generated VP artifact with its declared source/digest, privacy, size, and output checks.
   - The Runtime reads the VP effective profile through the owner-approved carrier and rejects invalid or mismatched input.
   - Focused Agent tests cover valid and invalid registry/profile input, Source or digest mismatch, privacy, size and output-schema checks, and missing behavior after the required/optional policy is explicitly approved. No silent default is allowed.
   - AC-15 profile conflict behavior and AC-26/SR-58 whole-result composition limits remain unchanged.
   - The result introduces no second resolver, state store, scheduler, or copied VP source.
   - The Agent maintainer returns exact source paths, tests, and receipts. Static and fixture evidence remain distinct from Runtime and user acceptance.
   - Acceptance states which current/cutover carrier is selected, how migration is handled, and which exact Agent and VP hashes bind later implementation evidence.
10. List prerequisites, owner, requested response, non-goals, dependencies, and handoff. Keep F and E5a metadata out of the dependency chain.

**Acceptance:** one draft request document has a stable `REQ-D3-D8` ID, named Agent and VP owners, frozen D3/D8 boundaries, current/target carrier facts and an open migration question, an explicit owner-approval gate for required/optional policy, measurable evidence, accurate code candidates, and a Source binding to the immutable base commit plus exact current VP inputs. It remains unsent and unaccepted until attributable handoff evidence exists; the binding proves no implementation or Runtime acceptance.

## Task G2 - Validate and hand off

1. Run `check-okf.ts` for the package bundle and `check-documentation.ts` with the exact owned plan and request paths. Require no failures and a nonzero selected-document count.
2. Review every D3/D8 claim against the decision records and current Agent source. Remove any statement that presents the candidate code or either carrier as existing VP support.
3. Keep the request as a draft packet prepared for the existing owner. The binding covers only the current inputs listed in the request; later implementation evidence binds its exact Agent and VP inputs. Reconcile the canonical queue and log. Do not modify Agent code, runtime configuration, or release state.

## Definition of done

1. The one draft request file includes its immutable base and current-input binding and passes OKF and focused document checks; this alone does not mark G complete.
2. `REQ-D3-D8` remains separate from VP-7 and no new WorkItem schema or project/provider identity is introduced.
3. D3 uses a distinct extended registry and the existing activation path. D8 keeps VP ownership of the profile schema and names current versus target Runtime carriers.
4. The request has measurable acceptance and evidence owners, dependencies, and a clear handoff.
5. Request delivery is not described as Runtime implementation, installation, Runtime acceptance, or user acceptance. The live next-actions queue remains authoritative until its owner reconciles it.

## Outside this plan

- Runtime implementation or code changes under `packages/agent/`.
- Product schema changes or edits to the current B/S sources.
- Project/provider registration, installed runtime operations, or release.
- Waiting for F Work Items or new E4/E5 metadata before preparing this request.

---

**Plan implementation gate, 2026-10-23:** Local request preparation and input binding are complete. The draft is prepared for owner review and remains unsent and unaccepted. No attributable handoff or admission evidence is recorded, so the G phase remains open. Runtime implementation and acceptance remain separate owner gates; the request owns the detailed hashes.
