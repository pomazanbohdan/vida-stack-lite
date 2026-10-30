---
type: Decision
title: 'D16 — Instruction form and domain facets'
description: 'Stable canonical files with explicit classification and generated browse views.'
status: draft
tags:
- vida-powers
- decision
- instruction-catalog
sources:
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
generated: { by: codex/gpt-6.1-sol, at: '2026-10-26T15:36:09Z' }
revision: '5'
---

# Decision

Accepted choice: On 2026-10-26 the owner requested implementation of a structure that supports the growing corpus and its script search. The owner selected Luna implementation, Beam validation and Root integration. Instructions retain their canonical IDs and files. Explicit form and domain metadata support optional filtering and generated browse views in the existing catalog.

Alternatives: topic folders require a placement decision for cross-domain instructions. Form folders expose form but still need domain metadata. Stable files with independent facets support several views from one canonical record. D16 chooses the third option. Prototype and query measurements are required evidence; this choice makes no speed or retrieval-quality claim.

Boundaries: capability and pattern tags keep their existing meanings. Products identify target products; donors remain provenance. Metadata classification does not admit sources or replace rights, fidelity, applicability, compatibility, policy or Runtime acceptance. D14/D15 gates remain independent. SR-92 owns the classification, filtering and migration contract. The accepted text-discovery field map does not establish full SR-73 implementation.

Version allocation: VPInstruction/v1.2 is the approved clean-cutover target for facets and descriptive approach assessments under SR-92. Future H2 VPInstruction/v2 preserves v1.2 metadata. This decision makes no dual-runtime or backward-compatibility commitment. Formation, delivery, installation and observed acceptance retain their owners.

Implementation status: the clean cutover to VPInstruction/v1.2 is complete — all 2,510 instructions carry the v1.2 marker, and the reader and checker accept that version only. Explicit facet filters, browse and converter-owned metadata preparation exist. Classification is complete for form and domain: 2,420 instructions are classified, each declaring at least one domain (790 carry more than one, across 24 form/domain combinations), and the remaining 90 carry an explicit unclassified reason. Approach assessments are absent from the corpus. AC-60, AC-61 and AC-62 now carry component evidence; AC-63 (converter-owned metadata batches) and AC-64 (the frozen 40-ID treatment) remain open, so rollout acceptance stays open.

The v1.2 foundation defines immutable descriptive vocabulary and semantic parsing. The reader, checker and approach selector are present; the corpus conversion and clean cutover are in place, while domain classification and approach assessments remain pending. Approach metadata does not grant permissions; profile policy and host/runtime authority remain binding. Search preserves uncertain and unassessed records, excluding only declared disjoint values; required and effective mandatory declared conflicts fail retrieval atomically and D12 exclusions remain binding.

## Current evidence

The owner subsequently authorized the compact retrieval refinement: explicit task-to-tag routing in vp-mode, multi-value CLI options, unique ID-and-description lists, one checked multi-ID instruction response and preserved opposite-rule handling. SR-93 and AC-65–AC-69 own this CLI projection; SR-92 metadata migration and D12 conflict authority stay unchanged. Approach selectors extend library search. Optional BM25 comparison is not a prerequisite for the reference route. The migrated suite and corpus checks pass on the current Source (659 passed, four expected Windows skips, zero failures, 693/693 functions and 5,402/5,402 lines; corpus 2,510 with zero issues), but AC-65–AC-69 acceptance and Runtime acceptance remain separate open gates.

The old-code baseline and same-input structure prototype are captured and independently reviewed. Stable files need zero projected path changes; form folders need 40; topic folders have 24 definite changes and 16 unresolved primary placements in the 40-ID fixture. These are structure projections, not a speed or retrieval-quality claim.

The historical v1.1 reader milestone passed 547 tests with one expected Windows skip, zero failures and unchanged coverage thresholds; retained LCOV records 557/557 functions and 4,438/4,438 lines. Typecheck, knip, formatting, then-current corpus checks and 24 frozen no-facet queries passed for those inputs. Beam accepted that reader delta and the separate 40-item model-classification ledger. At that milestone the corpus contained 2,510 legacy instructions. These receipts do not qualify the current v1.2-only reader or corpus transition. Exact evidence is retained in packages/powers/.tmp/panel/donor-migration-architecture-20261025/instruction-organization-20261026/implementation-r1/READER-ROOT-CLOSEOUT-r1.md.

The converter milestone passes 564 tests with one expected Windows skip, zero failures and 2,577 assertions. Retained LCOV records 577/577 functions and 4,635/4,635 lines under unchanged thresholds; typecheck and knip pass. Beam accepts the converter delta. Its tests verify body/provenance/map preservation, true no-ops, stale-input rejection and partial-effect recovery through the existing writer. The actual 40-ID fixture still requires independent review of its exact prepared plans before execution. Evidence is retained in the same work directory's CONVERTER-ROOT-CLOSEOUT-r1.md and converter-beam-review-r1.md.
