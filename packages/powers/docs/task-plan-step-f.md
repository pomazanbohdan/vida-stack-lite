---
type: Task Plan
title: 'Vida Powers - task-level plan for step F: Work Items and findings'
description: 'Caller API, append-only Standalone findings register, and bounded evidence under existing WorkItem/v1 and findings contracts.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- task-plan
- work-items
- findings
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers - system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers - acceptance criteria
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers - delivery status and forward stages
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers - product concept
- id: workitem-runtime-owner
  resource: /../../agent/src/orchestration/workflow-session-reservation-contract.ts
  title: Agent-owned WorkItem/v1 runtime validator
- id: workitem-runtime-contract
  resource: /../../../agent-runtime.config.v1.yaml
  title: Current WorkItem/v1 artifact contract
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-23T00:33:38Z' }
revision: '8'
---

**Goal:** keep VP-5, VP-6, and VP-7 separate; implement the bounded Standalone findings store API, existing CLI caller, caller procedure, and proof cases.

**The specification this plan follows from:** B: `docs/business-requirements.md` BR-07, BR-11, BR-16, BR-17 and `docs/research/vida-powers-product-research.md` sections 8-10. S: `docs/system-specification.md` SR-37-SR-54, SR-55, and SR-72. C: the delivery status in `docs/next-actions.md` and the existing runtime WorkItem/v1 owner. Relevant acceptance criteria are AC-20 through AC-24; only proven portions may close, and AC-22 remains open wherever semantic candidate generation or equivalence is not proven. AC-23 traces through both SR-53 and SR-54.

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

Review inputs: `.102` accepted the corrected caller contract without a new product choice. Independent `.110` output review found three Important and five Minor issues in `.104`; this revision resolves them in the owned code, tests, and plan. The corrected RED is bound to the delivered tests and unchanged `.104` production hashes. Independent follow-up review and final integration gates remain open.

## Files and owners

| File | Owner and responsibility |
|---|---|
| Read `docs/work/VP-5.md` | Existing human Work Item for implementation-plan Stage 5; no edit in this round |
| Reconcile `docs/work/VP-6.md` after proof | Existing human Work Item for implementation-plan Stage 6; this round adds caller and writer evidence |
| Read `docs/work/VP-7.md` | Existing human Work Item for implementation-plan Stage 7; no edit in this round |
| Modify `skills/vp-mode/scripts/findings.ts` | Sole validated JSONL read/write owner and candidate query |
| Modify `tests/findings.test.ts` | Findings API behavior evidence |
| Modify `skills/vp-mode/scripts/catalog-cli.ts` | Existing CLI nested findings adapter and JSON protocol |
| Modify `tests/catalog-cli.test.ts` | Process-boundary CLI behavior evidence |
| Modify `skills/vp-mode/SKILL.md` | Main caller procedure and semantic decision boundary |
| Reconcile `docs/work/VP-6.md` after proof | Artifact contract and evidence name the CLI and caller procedure |
| Reconcile F-specific `docs/log.md` and `docs/next-actions.md` | Record actual implementation status and final F queue state |
| `docs/work/findings.jsonl` | Conditional data output only for a real event; keep absent otherwise |

No file under `packages/agent/` is modified. Runtime findings remain owned by the existing Agent state owner and are outside this Standalone writer.
This bounded implementation owns only the nine named paths above. It does not duplicate VP-5/VP-6/VP-7, modify Agent or Runtime owners, or modify B/S/AC sources, schemas, catalog, corpus, notices, dependency manifests, or other evidence lanes. After the final F bytes are frozen, the owner rebinds the affected G inputs before actual handoff or admission. Preserve the published `.103` audit and `.106` correction; do not rewrite historical evidence or require all twelve unchanged-input bindings before code integration.

## Task F1 - Reconcile the existing product Work Items

**Files:** read existing `docs/work/VP-5.md` and `docs/work/VP-7.md`; reconcile existing `docs/work/VP-6.md` after proof.

1. Verify the existing VP-5, VP-6, and VP-7 IDs map to implementation-plan Stages 5, 6, and 7. Keep the three Markdown records distinct.
2. Preserve their current owner, goal, frozen Work Scope, acceptance prose, typed relations, evidence, and human-readable `artifact_contract` sections. Do not create replacement or duplicate Work Items.
3. Reconcile VP-6 after proof so its artifact contract and evidence name the existing findings CLI, caller procedure, rollback behavior, and error boundary.
4. Keep the Agent-owned `workflowWorkItemSchema` and eleven-field WorkItem/v1 contract authoritative. The Markdown records do not establish Runtime admission or supply guessed provider/project values.

**Acceptance:** the three existing Work Items retain their distinct IDs and Stages; VP-6 reflects the proved caller contract; no duplicate Work Item, machine record, fabricated project/provider value, or Runtime admission claim is added.

## Task F2 - Implement the findings API and caller

**Files:** `findings.ts`, its tests, `catalog-cli.ts`, its process tests, and `vp-mode/SKILL.md`; conditionally `docs/work/findings.jsonl` only after a real event.

1. Keep `findings.ts` the sole store reader/writer. Export `appendFindingEvent` with `{operation:'append', outcome:'appended'|'replayed', event_id, candidate_fingerprint:string|null}` and `findFindingCandidates`, which accepts only a validated observation and returns query identity plus full matching stored observation rows in original append order.
2. Candidate reasons are all exact matches in fixed order: event ID, finding ID, candidate fingerprint, context, provenance. Use OR matching; exclude merge events. Return no ranking, semantic verdict, automatic merge, or write effect.
3. Canonicalize context recursively by object-key order; preserve exact strings and array order. Empty context `{}` is valid and matches exactly; empty provenance is invalid. Exact replay adds no line. Every new primary observation uses a distinct caller-supplied `finding_id`; changed bytes under an existing ID fail `FINDING_ID_CONFLICT`.
4. In the existing CLI add `findings append|candidates --store <absolute-path> --event-file <absolute-path>`; parse and validate JSON event input before store mutation, dispatch before catalog/profile loading, preserve existing commands, and emit one JSON stdout line on success or one redacted JSON stderr line on failure. Error codes include the established store errors plus `CATALOG_INVALID`, `FINDING_INPUT_JSON_INVALID`, `FINDING_INPUT_PATH_INVALID`, `FINDING_INPUT_READ_FAILED`, `FINDING_INVALID`, `FINDING_CANDIDATE_QUERY_INVALID`, redacted `FINDING_OPERATION_FAILED`, and `FINDING_STORE_RECOVERY_REQUIRED` when rollback cannot be confirmed. Never expose event text, stacks, or raw filesystem exceptions.
5. The caller derives `--store` only from VP-6's existing `packages/powers/docs/work/findings.jsonl` artifact contract; no CWD-derived default or new host path. Query before append. After exact candidates, the caller judges reproduction/context/evidence semantically. For explicit equivalence, append a distinct observation with preserved evidence, then a separate merge event linking to the canonical `finding_id`. Ambiguity remains separate. Scope blockers request permission and never grant fix authority.
6. One main Standalone host invokes operations sequentially; subagents return structured messages and never write. Do not claim cross-process locking or race-proof operations. Store/path preflight requires absolute path, exact store basename `findings.jsonl`, existing parent, no dot components, and no final symlink observed; event input requires an absolute path with no raw `.` or `..` components and an existing regular non-symlink file. Ancestor symlinks may resolve normally; no containment or swap-race claim. Missing-store query is read-only and creates nothing; corrupt/no-final-newline stores fail closed. If append fails after a partial write, restore preexisting bytes or remove only the newly created file that still matches the open handle. A failed rollback returns `FINDING_STORE_RECOVERY_REQUIRED` and leaves the effect unknown for recovery.
7. Capture a real process-boundary RED from the unmodified candidate CLI before the first code edit: valid event/store argv for `findings append` must fail `CATALOG_INVALID`; save command, version, exact inputs, stdout, stderr, exit, and bound hashes. Then add meaningful tests before implementation. Cover API result/replay, duplicate observation IDs with query/append fail-closed behavior, duplicate evidence and explicit merge, all reasons/order/full query identity, empty context/provenance, CWD independence, catalog-independent dispatch without a catalog file, read-only/absent/corrupt stores, invalid/final-symlink/dot-component paths, unchanged bytes on rejection and injected partial-prefix write failures for existing and absent stores, recovery-required errors when rollback itself fails, serial caller protocol, JSON framing/exits, inapplicable flags, and sentinel plus filesystem-error privacy.

## Task F3 - Verify and hand off the result

1. Run focused `findings.test.ts` and `catalog-cli.test.ts`, candidate-only scoped typecheck, candidate CLI smoke, changed-shipped-script Bun API scan limited to `findings.ts` and `catalog-cli.ts`, and owned Markdown LF/EOF/diff checks. Use the product-selected Bun from `.bun-version` (1.4.4 for new work). Retained 1.4.3 receipts and active frozen producers keep their recorded identity. Do not run Node smoke or install tools. Preserve raw failures and distinguish scoped evidence from package gates.
2. Queue full package test, coverage with configured thresholds 1.0, typecheck, and Agent Knip until all writers freeze; do not duplicate these final-integration gates. Run corpus checks only if corpus inputs change.
3. Run selected candidate OKF/documentation checks only where checker contract allows out-of-root paths; otherwise record the exact checker limitation for root. Require no failures and nonzero selected count to claim a pass.
4. Reconcile VP-6 after proof: artifact contract names the store, findings CLI, and caller procedure; separate artifact presence/format/digest from semantic validity. Keep AC-20/21/23 open, AC-22 partial until semantic/equivalence evidence exists, and AC-24 component-only. No Runtime or host acceptance claim.
5. Record actual status in the F-owned log and next-actions only. Hand off canonical index, acceptance, shared WORK and G rebinding to their owners; do not edit those inputs here.

## Definition of done

1. VP-5, VP-6, and VP-7 remain separate Markdown Work Items and link to their existing stages.
2. WorkItem/v1 stays Agent-owned; no parallel schema or guessed Runtime identifiers appear.
3. The findings writer is the only Standalone JSONL writer, and no store exists without a real event.
4. Red evidence predates the first code edit. Focused candidate Bun tests, an isolated Bun CLI smoke, candidate TypeScript checking, the changed-script API scan, and Markdown checks pass or have their exact checker limitation reported. Do not run a separate Node smoke or duplicate final integration gates in this candidate lane.
5. Replay, confirmed-duplicate evidence, conflict, and ambiguity cases have distinct assertions. AC-22 remains open wherever real semantic/equivalence proof is absent.
6. VP-6, log, and the F-specific next-actions status are reconciled to candidate evidence. The index, acceptance, shared WORK, G rebind, independent review, and final integration gates remain with their owners. No Runtime acceptance or final F closure is claimed before those gates.

## Implementation status addendum — 2026-10-22

The `.35` initial RED was module-absence evidence only, not a behaviorally failing test.
The `.35` GREEN packet records 8 pass / 0 fail / 45 assertions and Bun/Node product
smokes. The `.40` independent review marked the F component READY, not Step F closed.
AC-20/21/23 remain open; AC-22 is deterministic-only because merge evidence is caller
supplied and not semantically validated; AC-24 verifies the no-fix boundary. Scope
strings do not enforce caller/orchestrator boundaries. No real finding event exists, so
`docs/work/findings.jsonl` remains absent. Full Step F gates remain pending.

## Implementation status addendum — 2026-10-23 (.104 candidate)

The owned candidate includes the bounded caller contract and implementation. Its pre-code process RED returned `CATALOG_INVALID` / exit 1 for `findings append`; focused Bun tests now report 55 pass / 0 fail / 301 assertions, the candidate typecheck reports no errors in 29 files, the changed-shipped-script Bun API scan found 0 matches, and the isolated query/append/query/replay smoke passed. Candidate Markdown checks selected five documents and found two missing Agent-owned link targets in `VP-6.md`; candidate OKF reports eight missing targets in the isolated Powers copy, including Agent files and one historical traceability receipt. These are layout-bound checker limits for this candidate, not repairs authorized here; root checks remain required after integration.

The implementation remains under independent output review, not accepted. AC-20/21/23 remain open, AC-22 partial pending semantic/equivalence proof, and AC-24 component-only. No real findings event exists; no host or Runtime acceptance is claimed. Full package tests, coverage, canonical typecheck, Agent Knip, final Markdown gates, G rebind, and canonical reconciliation remain with the root integrator.

## Outside this plan

- Changes to `packages/agent/`, root runtime configuration, provider/project registration, Runtime state, or an installed runtime.
- A new WorkItem schema, a second ledger, a database, or an LLM/semantic dedup service.
- Closing AC-22 without actual candidate and equivalence evidence.
- `docs/index.md`, `docs/acceptance.md`, shared WORK, Agent/Runtime state, and bound G inputs remain outside this implementation lane. The final root integrator reconciles index, acceptance, WORK, and rebinds G evidence before Source integration.

---

**Plan implementation gate:** the corrected plan is READY for implementation. Routine file creation and the three existing VP IDs need no further product choice. Any request to create a machine WorkItem/v1 or close AC-22 without semantic/equivalence evidence remains blocked. Final F closure still requires independent output review, canonical reconciliation, and final integration gates.

## Revision 5 implementation constraints

- Exact owned patch allowlist: `skills/vp-mode/scripts/findings.ts`, `tests/findings.test.ts`, `skills/vp-mode/scripts/catalog-cli.ts`, `tests/catalog-cli.test.ts`, `skills/vp-mode/SKILL.md`, `docs/task-plan-step-f.md`, `docs/work/VP-6.md`, `docs/log.md`, and F-specific status in `docs/next-actions.md`.
- No production event exists; keep `docs/work/findings.jsonl` absent. Do not modify B/S/AC, schema, catalog/corpus, `REQ-D3-D8`, VP-5/VP-7, Agent, Runtime, or G-bound files.
- `--store` is explicit and caller-resolved from VP-6, never defaulted from CWD. Exact-path symlink validation is point-in-time. Error framing hides event text and low-level exceptions. No process lock/concurrency guarantee.
- Deliver exact relative patch paths and per-file before/current-base/candidate SHA-256; candidate checks and receipts remain inside `.104`. No Git metadata write, staging, commit, push, or canonical source mutation.

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
