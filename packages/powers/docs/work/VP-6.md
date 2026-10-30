---
type: Work Item
id: VP-6
title: 'VP-6 — materialization, Work Items, and findings'
description: 'Stage 6 work item for artifact contracts, shallow Work Item records, and the bounded Standalone findings caller and writer.'
status: draft
stale_after: '2026-11-21T00:00:00Z'
tags:
- vida-powers
- work-item
- stage-6
sources:
- id: next-actions
  resource: /next-actions.md
  title: Vida Powers delivery status and forward stages
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers product research
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers acceptance criteria
- id: runtime-workitem-owner
  resource: /../../agent/src/orchestration/workflow-session-reservation-contract.ts
  title: Agent-owned WorkItem/v1 validator
- id: runtime-workitem-contract
  resource: /../../../agent-runtime.config.v1.yaml
  title: Current WorkItem/v1 required fields
generated: { by: vida-agent/gpt-6-luna, at: '2026-10-23T00:33:38Z' }
revision: '7'
---

# VP-6 — Materialization, Work Items, and Findings

## Owner and state

Owner: Vida Powers owner. State: draft. This Markdown record and the VP-5/VP-7 documents are human planning records; they are not machine-admitted `WorkItem/v1` records.

The Agent-owned validator and runtime configuration require eleven machine fields: `schema`, `id`, `provider`, `provider_type`, `canonical_kind`, `intent`, `project_id`, `title`, `description`, `labels`, and `risk_flags`. The current project/provider registration does not provide a validated binding for these records. Do not invent those values or treat these documents as Runtime state.

## Goal

Materialize content through existing artifact contracts and create the smallest Standalone Work Item and findings workflow that preserves scope, evidence, attribution, and append-only history.

## Frozen Work Scope

- Reuse the existing Research, Decision, Acceptance, Implementation Scope, Work Item, Work State, and artifact-reference owners. VP adds only missing product-owned representations; it does not define parallel runtime schemas or storage.
- Each Work Item has a stable ID, goal, frozen Work Scope, acceptance references, typed relations, and evidence. Its human-readable `artifact_contract` states output kind, required data, materialization location, and verification method.
- Standalone Findings use one writer and append-only JSONL per product. A finding records problem, evidence, source, product, Work Scope link, and blocking impact. Recording one does not authorize a fix.
- The main Standalone caller queries before append. Deterministic OR matches return stored observations, exact reasons, and original append order; they do not rank or prove equivalence. Every new primary observation uses a distinct caller-supplied `finding_id`. After explicit semantic confirmation, preserve the new observation and evidence, then append a separate merge event; ambiguity remains separate.
- One main Standalone host caller invokes findings commands sequentially; subagents return structured findings and never write. The read/check/append path has no cross-process lock or race-safety claim. Runtime findings and transactional Work state remain with the Agent's existing SQLite/HostState owner. Standalone adds no database, lease, reservation service, scheduler, or lock owner.
- The derived search index remains recoverable and non-authoritative. Scope violations are recorded with a permission request, not silently expanded.

## Acceptance references

Relevant canonical criteria include AC-20 through AC-24, AC-38, and AC-39. Only portions proven against their complete contracts may close; AC-22 remains open for semantic candidate generation and equivalence wherever attributable evidence is absent. The trace includes BR-03, BR-04, BR-07, BR-10, BR-11, BR-16, BR-17, SR-37 through SR-54, SR-55, SR-72, and sections 8 through 10 of [product research](../research/vida-powers-product-research.md).

## Current implementation evidence

Current review evidence supports the no-fix boundary in AC-24 and only the deterministic
portion of AC-22. AC-20, AC-21, and AC-23 remain open pending materialization, index, and
scope-orchestrator proof. AC-22's semantic candidate generation and equivalence remain open.
The merge path accepts caller-reported evidence and context. It does not independently verify
the reported reproduction, context, or semantic equivalence.

The writer roundtrip records caller-supplied Work Scope and evidence text. It does not detect
out-of-Work-Scope input or require permission to expand scope. No real finding event exists, so
`docs/work/findings.jsonl` remains absent.

The `.35` focused packet records 8 pass / 0 fail / 45 assertions and the `.40` independent
review judged the component ready; neither closes Step F. Malformed existing JSONL fails closed
and requires manual repair. The writer has no explicit `fsync` durability guarantee. AC-24's
test name is `preserves an out-of-scope blocker and its permission request without authorizing a
fix`; this verifies the no-fix boundary, while caller-supplied blocker text does not prove
out-of-scope detection or permission-policy enforcement.

Candidate evidence from `.104` on 2026-10-23: `findings.ts` returns append/replay results and read-only candidate rows; `catalog-cli.ts` provides nested `findings append|candidates` commands with explicit absolute paths and redacted one-line JSON errors; `vp-mode/SKILL.md` specifies query-before-append and caller judgment. The CLI branch runs before catalog/profile loading. No real event or production JSONL exists.

## Relations

- `implements` → the materialization, Work Item and findings stage in the [next actions](../next-actions.md).
- `derived-from` → BR-03/BR-04/BR-07/BR-10/BR-11/BR-16/BR-17 and research sections 8-10.
- `blocks` → VP-7, which depends on Stages 5 and 6.
- Related Work Items: VP-5 and VP-7.

## Expected evidence

- Focused tests for event identity, deterministic fingerprints, key-order normalization, replay, distinct evidence, explicit merge events, conflicts, ambiguity, out-of-scope blockers, and no-fix authority.
- Focused process tests for nested command parsing, explicit store/event paths, CWD independence, catalog-independent dispatch, JSON framing, stable errors, and sentinel/error redaction.
- Test-only events remain in the test process or fixture tree. `docs/work/findings.jsonl` is created only for an actual attributable finding; it stays absent when no such event exists.
- A real event, if one occurs, distinguishes observed from reported input and retains actor, source, evidence, scope, product, and impact without inferred provenance.
- Presence/format/digest receipts are bound separately from semantic judgments. Static tests do not prove external semantic equivalence or Runtime acceptance.

## Artifact contract

- **Output kind:** Human Markdown Work Items plus the Standalone findings writer and append-only JSONL events when real events exist.
- **Required data:** Work Item identity, goal, Work Scope, acceptance, typed relations, evidence and artifact contract; findings carry problem/evidence/source/product/scope/impact data, replay identity, candidate-query identity (`event_id`, `finding_id`, and fingerprint), and an explicit caller decision before merge. A failed rollback reports `FINDING_STORE_RECOVERY_REQUIRED` for owner recovery.
- **Materialization location:** `packages/powers/docs/work/VP-5.md`, `VP-6.md`, `VP-7.md`, `packages/powers/skills/vp-mode/scripts/findings.ts`, `catalog-cli.ts`, `skills/vp-mode/SKILL.md`, focused tests, and conditionally `packages/powers/docs/work/findings.jsonl`. The caller derives the explicit absolute store path from this contract; it is never derived from CWD.
- **Presence/format/digest verification:** OKF and focused document checks for the Markdown records; CLI JSON lines and stable exit/error framing; JSONL line parsing, event identity, exact append-byte checks, partial-write rollback checks, and query read-only checks for test stores and any actual event.
- **Semantic verification:** separate acceptance review establishes scope/classification and any claimed equivalence from reproduction, context, and evidence. Deterministic equality alone does not prove semantic equivalence.

## Implementation status addendum — 2026-10-22

The .35 initial RED was missing-module/absence evidence, not a behaviorally failing test;
do not count it as behavioral RED proof. GREEN records 8 pass / 0 fail / 45 assertions and
Bun/Node product smokes. The .40 independent review marked the F component READY, not Step F
closed. AC-20/21/23 remain open; AC-22 is deterministic-only because caller-supplied merge
evidence is not semantically validated; AC-24 verifies the no-fix boundary. Scope strings do
not enforce caller/orchestrator boundaries. No real finding event exists, so
`docs/work/findings.jsonl` remains absent. WorkItem/v1 still requires its 11 Agent-owned fields;
these Markdown items are not Runtime-admitted records. Full Step F gates remain pending.

## Implementation status addendum — 2026-10-23

The `.104` owned candidate records a process-boundary RED before code edits: `findings append` exited 1 with `CATALOG_INVALID` on Bun 1.4.3. After implementation, the focused `findings.test.ts` and `catalog-cli.test.ts` run reports 55 pass / 0 fail / 301 assertions; candidate `bun check --project tsconfig.json` reports no type errors in 29 files. The CLI scratch smoke confirms query-before-append, one appended row, full-row query, and exact replay with unchanged bytes. The final-store symlink test uses a Windows junction because the host denied file-symlink creation with `EPERM`; the event-file junction rejection also passes.

This is component evidence only. It does not prove host artifact materialization, scope classification, semantic candidate generation, equivalence, Runtime admission, or user acceptance. AC-20/21/23 remain open; AC-22 remains partial; AC-24 remains component-only. No real event exists, and `docs/work/findings.jsonl` remains absent. Full package tests, coverage threshold 1.0, canonical typecheck, Agent Knip, independent output review, G rebind, and root reconciliation remain pending.

## Implementation status addendum — 2026-10-23

The `.113` isolated candidate addresses the three Important and five Minor findings from `.110`. The final regression tests were run against unchanged `.104` production hashes and produced seven behavior failures in 61 tests. After the fixes, Bun 1.4.3 reports 61 pass, 0 fail, and 367 assertions; `bun check --project tsconfig.json` reports no type errors in 29 files. The injected partial-write tests cover rollback for an existing store, removal of a newly created store, and `FINDING_STORE_RECOVERY_REQUIRED` when rollback itself fails.

The receipt-only CLI smoke passes query-before-append, append, query with `finding_id` and all exact reasons, replay with unchanged bytes, raw-argv redaction, inapplicable-flag rejection, and event-path dot-component rejection. The changed-script API scan finds no Bun API use. These checks are bound to the candidate files and do not prove full F acceptance. AC-20/21/23 remain open, AC-22 remains partial, and AC-24 remains component-only. No real finding event, host acceptance, or Runtime acceptance exists. Independent follow-up review, full package tests, coverage, root typecheck and Knip, G rebind before handoff/admission, and root reconciliation remain pending.

## Links and handoff

- [Next actions](../next-actions.md)
- [Product research](../research/vida-powers-product-research.md)
- [System specification](../system-specification.md)
- [Acceptance criteria](../acceptance.md)
- [Agent WorkItem/v1 validator](../../../agent/src/orchestration/workflow-session-reservation-contract.ts)
- [Current runtime config contract](../../../../agent-runtime.config.v1.yaml)
