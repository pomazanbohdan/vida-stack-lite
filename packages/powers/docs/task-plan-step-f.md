---
type: Task Plan
title: 'Vida Powers - task-level plan for step F: Work Items and findings'
description: 'Three distinct product Work Items and a single-writer append-only Standalone findings register, bounded by existing WorkItem/v1 and findings contracts.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- task-plan
- work-items
- findings
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
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers - product concept
- id: workitem-runtime-owner
  resource: /../../agent/src/orchestration/workflow-session-reservation-contract.ts
  title: Agent-owned WorkItem/v1 runtime validator
- id: workitem-runtime-contract
  resource: /../../../agent-runtime.config.v1.yaml
  title: Current WorkItem/v1 artifact contract
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-22T07:50:14Z' }
revision: '4'
---

**Goal:** create separate Markdown Work Items for VP-5, VP-6, and VP-7, then implement only the bounded Standalone findings writer and its proof cases.

**The specification this plan follows from:** B: `docs/business-requirements.md` BR-07, BR-11, BR-16, BR-17 and `docs/research/vida-powers-product-research.md` sections 8-10. S: `docs/system-specification.md` SR-37-SR-54 and SR-72. C: `docs/implementation-plan.md` Stages 5-7, `docs/catalog-design.md` section 16, `docs/task-plan-step-e.md` outside-plan boundary, and the existing runtime WorkItem/v1 owner. Relevant acceptance criteria are AC-20 through AC-24; only proven portions may close, and AC-22 remains open wherever semantic candidate generation or equivalence is not proven. AC-23 traces through both SR-53 and SR-54.

## Global constraints

- Keep VP-5, VP-6, and VP-7 as three separate product Markdown Work Items. Their IDs already map to implementation-plan Stages 5, 6, and 7.
- Keep the D3+D8 request ID `REQ-D3-D8` separate from VP-7. Never reuse VP-7 as the request ID.
- Reuse the Agent-owned `workflowWorkItemSchema` in `packages/agent/src/orchestration/workflow-session-reservation-contract.ts` and the existing `WorkItem/v1` field list in `agent-runtime.config.v1.yaml` around line 1135. The current required fields are `schema`, `id`, `provider`, `provider_type`, `canonical_kind`, `intent`, `project_id`, `title`, `description`, `labels`, and `risk_flags`.
- Treat the VP Markdown Work Items as human planning records. Their goal, Work Scope, acceptance, relations, and evidence sections follow SR-40. They are not machine WorkItem/v1 records and do not establish Runtime admission.
- Each Work Item carries a human-readable `artifact_contract`: output kind, required data, materialization location, and verification method. Record presence/format/digest checks separately from semantic validity, reusing SR-41 terms without defining a new schema.
- Do not invent `provider`, `provider_type`, or `project_id` values. A machine record requires validated project/provider registration and its owner; this step creates none.
- Do not add a parallel WorkItem schema or claim the Markdown files satisfy the runtime validator.
- Use checker-supported Work Item frontmatter: non-empty `type`, `status` (`draft|stable|deprecated`), ISO `stale_after`, `sources[].resource`, and actor-valid `generated.by` plus ISO `generated.at`. New docs contain no BR/SR/AC definition markers; cite canonical definitions in prose or links.
- Put AC references in prose or links. Do not use AC IDs as the first column of a table, which would duplicate canonical AC definitions in the OKF checker.
- `skills/vp-mode/scripts/findings.ts` is the sole Standalone findings writer. It owns append operations to `docs/work/findings.jsonl`; no other module writes that path.
- Keep findings source identity and provenance explicit and validated at the input boundary. Preserve observed versus reported origin; do not infer attribution or create a production event from test data.
- Create `findings.jsonl` only when a real finding event is recorded. Keep the path absent when there is no event. Do not add a database, search service, queue service, or semantic model.
- Append primary observations and merge events. Never rewrite or delete earlier JSONL lines. A finding does not authorize a fix.
- Deterministic identity and fingerprint checks may find candidates. A location match or a score never proves equivalence. No semantic or LLM result is fabricated.

## Plan review and validation method

The independent MiniMax M3.1 Flash Free review is READY after the text corrections in this revision. The DeepSeek Free attempt failed quota and remains unfulfilled; any independent Luna evidence is supplemental and is not labeled M3.1 or DeepSeek. The corrected plan may proceed without another routine plan approval. Output review and final integration gates remain open.

## Files and owners

| File | Owner and responsibility |
|---|---|
| Create `docs/work/VP-5.md` | VP owner; human Work Item for implementation-plan Stage 5 |
| Create `docs/work/VP-6.md` | VP owner; human Work Item for implementation-plan Stage 6 |
| Create `docs/work/VP-7.md` | VP owner; human Work Item for implementation-plan Stage 7 |
| Create `skills/vp-mode/scripts/findings.ts` | One writer for Standalone finding and merge events |
| Create `tests/findings.test.ts` | Focused behavior evidence for the findings writer |
| Create `docs/work/findings.jsonl` | Data output only when a real event exists; never create an empty seed file |

No file under `packages/agent/` is modified. Runtime findings remain owned by the existing Agent state owner and are outside this Standalone writer.
The F writer owns `skills/vp-mode/scripts/findings.ts`, `tests/findings.test.ts`, optional `tests/fixtures/findings/**`, the three listed Work Items, and the F/G plans/request only. E4 retains its catalog/config implementation and tests; E5a retains the manifest generator/tests, setup/skill implementation/tests, step-E plan, and its existing WORK. These file sets do not overlap. The canonical `next-actions.md` owner reconciles the queue after all writers freeze.

## Task F1 - Bind the product Work Items to existing IDs and contracts

**Files:** create the three Markdown Work Items listed above.

1. Re-read implementation-plan Stages 5-7 and confirm the current WorkItem/v1 owner before writing. The strict runtime validator is `workflowWorkItemSchema`; the current config contract lists 11 required machine fields.
2. Write each Markdown record with its existing VP ID, owner, goal, frozen Work Scope, acceptance prose, typed relations, and expected evidence. Link its Stage and relevant BR/SR/AC clauses.
3. Add an `artifact_contract` section to each Work Item with output kind, required data, materialization location, and verification method. State separately which check proves presence/format/digest and which check judges semantic validity; use existing contract terms, not a new schema.
4. Mark the Runtime representation as not admitted until a real project/provider binding is validated. Keep Markdown sections separate from machine WorkItem/v1 fields.
5. Keep VP-5, VP-6, and VP-7 distinct even where their work blocks or informs one another.

**Acceptance:** exactly three Work Item files exist; each has a unique existing ID and its own Stage, scope, acceptance, typed relation links, evidence, and complete `artifact_contract`. No machine record, fabricated project/provider value, or Runtime admission claim is present.

## Task F2 - Pin findings normalization, fingerprints, replay, and conflicts

**Files:** `skills/vp-mode/scripts/findings.ts`, `tests/findings.test.ts`, and conditionally `docs/work/findings.jsonl`.

The module exports `appendFindingEvent(storePath, event): Promise<void>` as the only disk writer. Its local TypeScript event type follows SR-43 and is not a new versioned `Finding/v1` schema.

1. Use the SR-43 attributes: problem, evidence, source, product, Work Scope link, and blocking impact. Keep `finding_id` as the canonical link named by AC-22.
2. Validate the event and store boundary before any write. Require attributable source identity and provenance, preserve the observed-versus-reported distinction, and reject malformed input without modifying existing bytes. Preserve exact text, array order, source, product, Work Scope, blocking impact, context, and provenance; do not trim, case-fold, paraphrase, or infer semantic equivalence.
3. Use deterministic identity for replay and deterministic candidate checks over ID, fingerprint, context, and provenance. The candidate fingerprint uses the normalized problem, source/provenance, product, Work Scope, and blocking impact. Preserve evidence separately; a new evidence list does not silently alter a prior observation.
4. Write failing tests before the implementation edit. Use test-only event values (inline or fixture-backed), never production JSONL records, for these cases:
   - Identical normalized observation, including its exact evidence list: no new JSONL event.
   - Same deterministic candidate with distinct evidence: no automatic merge; after explicit equivalence confirmation, append a merge event linked to the canonical `finding_id` and preserve the new evidence.
   - Key-order-only changes yield the same fingerprint. A change to a candidate field changes the fingerprint; conflicting context or provenance remains separate.
   - Conflicting context or provenance: keep records separate and report the conflict; do not rewrite the canonical row.
   - Ambiguous semantic candidates: do not merge and do not report semantic or LLM proof.
   - First real event: create the JSONL path and append one complete line. No event: leave the path absent.
   - Out-of-scope finding: retain the scope boundary and request permission. Finding creation grants no fix authority.
5. Run the focused test before the first implementation edit and retain the red receipt. Implement one append owner in `findings.ts` using only runtime-agnostic `node:` APIs and no external dependency. Run a product smoke under available Bun and Node; statically scan shipped `findings.ts` for Bun-only APIs. If Deno is unavailable, record Deno as a GAP without installing it or claiming a PASS.
6. Run the focused tests after implementation. The event bytes must show append-only history, replay idempotency, preserved new evidence, and unmerged conflicts.

The deterministic checks cover only candidate discovery. Keep AC-22 open for semantic candidate generation and equivalence until attributable evidence proves those behaviors. Do not add a semantic backend to close the criterion by assertion.

## Task F3 - Verify and hand off the result

1. Run the focused `tests/findings.test.ts` selection from `packages/powers` with the pinned Bun. Record exact test names and outcomes, plus separate Bun and Node product-smoke receipts and the static Bun-API scan. Record Deno unavailable as a GAP if it is not installed.
2. Queue these exact final-integration gates until every writer freezes: `bun run --cwd packages/powers test`; `bun run --cwd packages/powers test:coverage` with all configured thresholds at 1.0; `bun run --cwd packages/powers typecheck`; and `bun run --cwd packages/agent lint:knip:pinned` with `issues: []`. Do not duplicate these gates during this F/G implementation pass. Run `check-corpus.ts` only if corpus inputs change.
3. Run `bun packages/powers/scripts/check-okf.ts` and `tooling/agent/check-documentation.ts` with the exact owned plan, Work Item, and request paths; require no failures and a nonzero selected-document count.
4. Reconcile only proven acceptance. AC-20 through AC-24 close only where evidence meets their full contracts; AC-22 remains open for any unproven semantic candidate/equivalence case. A deterministic replay test alone does not close it.
5. Hand off exact integration deltas for the canonical index, log, next-actions, acceptance, and shared WORK to their owners. Do not claim Runtime acceptance or completion of VP-7 from the Markdown records.

## Definition of done

1. VP-5, VP-6, and VP-7 remain separate Markdown Work Items and link to their existing stages.
2. WorkItem/v1 stays Agent-owned; no parallel schema or guessed Runtime identifiers appear.
3. The findings writer is the only Standalone JSONL writer, and no store exists without a real event.
4. Red evidence predates the first code edit. Focused tests, Bun/Node product smokes, selected typecheck, static scan, and owned-document checks pass on their bound inputs; the final integration gates remain queued for the final integrator.
5. Replay, confirmed-duplicate evidence, conflict, and ambiguity cases have distinct assertions. AC-22 remains open wherever real semantic/equivalence proof is absent.
6. Product index/log/next-actions/acceptance and the owner's WORK updates are handed to their existing owners. No Runtime acceptance or final F closure is claimed before independent output review, canonical reconciliation, and final gates.

## Implementation status addendum — 2026-10-22

The `.35` initial RED was module-absence evidence only, not a behaviorally failing test.
The `.35` GREEN packet records 8 pass / 0 fail / 45 assertions and Bun/Node product
smokes. The `.40` independent review marked the F component READY, not Step F closed.
AC-20/21/23 remain open; AC-22 is deterministic-only because merge evidence is caller
supplied and not semantically validated; AC-24 verifies the no-fix boundary. Scope
strings do not enforce caller/orchestrator boundaries. No real finding event exists, so
`docs/work/findings.jsonl` remains absent. Full Step F gates remain pending.

## Outside this plan

- Changes to `packages/agent/`, root runtime configuration, provider/project registration, Runtime state, or an installed runtime.
- A new WorkItem schema, a second ledger, a database, or an LLM/semantic dedup service.
- Closing AC-22 without actual candidate and equivalence evidence.
- The F implementation lane did not own `docs/index.md`, `docs/log.md`, `docs/next-actions.md`, `docs/acceptance.md`, or the shared WORK record. A later canonical documentation reconciliation is separately authorized and recorded in `.agent/work/vp-next-steps/WORK.md`.

---

**Plan implementation gate:** the corrected plan is READY for implementation. Routine file creation and the three existing VP IDs need no further product choice. Any request to create a machine WorkItem/v1 or close AC-22 without semantic/equivalence evidence remains blocked. Final F closure still requires independent output review, canonical reconciliation, and final integration gates.

## Implementation status addendum — 2026-10-22

The `.35` focused findings packet records 8 pass / 0 fail / 45 assertions, Bun and Node
product smokes, a selected typecheck, and a static API scan; Deno was unavailable. The
`.40` independent review judged the F component ready, not Step F closed. AC-24 has a
passing no-fix boundary test; AC-22 has deterministic replay and explicit merge-event
evidence only; AC-20/21/23 remain open. The writer accepts caller-reported scope and
evidence and does not detect scope violations or verify reproduction, context, or
semantic equivalence. Malformed JSONL fails closed and needs manual repair; no explicit
fsync durability guarantee is implemented. No real finding event exists, so
`docs/work/findings.jsonl` remains absent. Full package gates remain queued until all
active code writers freeze.
