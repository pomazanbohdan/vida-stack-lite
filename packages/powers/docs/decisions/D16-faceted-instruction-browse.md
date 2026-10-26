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
generated: { by: codex/gpt-6.1-sol, at: '2026-10-26T12:02:01.380Z' }
revision: '3'
---

# Decision

Accepted choice: On 2026-10-26 the owner requested implementation of a structure that supports the growing corpus and its script search. The owner selected Luna implementation, Beam validation and Root integration. Instructions retain their canonical IDs and files. Explicit form and domain metadata support optional filtering and generated browse views in the existing catalog.

Alternatives: topic folders require a placement decision for cross-domain instructions. Form folders expose form but still need domain metadata. Stable files with independent facets support several views from one canonical record. D16 chooses the third option. Prototype and query measurements are required evidence; this choice makes no speed or retrieval-quality claim.

Boundaries: capability and pattern tags keep their existing meanings. Products identify target products; donors remain provenance. Metadata classification does not admit sources or replace rights, fidelity, applicability, compatibility, policy or Runtime acceptance. D14/D15 gates remain independent. SR-92 owns the classification, filtering and migration contract. The accepted text-discovery field map does not establish full SR-73 implementation.

Version allocation: VPInstruction/v1.1 carries the facet contract. Unmarked v1 stays supported; future H2 VPInstruction/v2 remains reserved. New readers support the selected old/new formats. Old installed readers are not claimed to read v1.1; formation, delivery, installation and observed acceptance retain their owners.

Implementation status: the v1.1 reader/schema, explicit facet filters, browse, opt-in strict corpus checking and converter-owned metadata preparation are implemented and independently reviewed. Actual metadata publication, the 40-ID treatment and full-corpus rollout remain open. AC-60 through AC-64 retain their open state until their complete evidence is reconciled; implementation checks do not close the migration criteria.

## Current evidence

The old-code baseline and same-input structure prototype are captured and independently reviewed. Stable files need zero projected path changes; form folders need 40; topic folders have 24 definite changes and 16 unresolved primary placements in the 40-ID fixture. These are structure projections, not a speed or retrieval-quality claim.

The reader milestone passes 547 tests with one expected Windows skip, zero failures and unchanged coverage thresholds; retained LCOV records 557/557 functions and 4,438/4,438 lines. Typecheck, knip, formatting and current-corpus checks pass. All 24 frozen no-facet queries retain exact metadata output. Beam accepts the reader delta and the separate 40-item model-classification ledger. The corpus still contains 2,510 legacy instructions; no facet migration or treatment is claimed. Exact evidence is retained in packages/powers/.tmp/panel/donor-migration-architecture-20261025/instruction-organization-20261026/implementation-r1/READER-ROOT-CLOSEOUT-r1.md.

The converter milestone passes 564 tests with one expected Windows skip, zero failures and 2,577 assertions. Retained LCOV records 577/577 functions and 4,635/4,635 lines under unchanged thresholds; typecheck and knip pass. Beam accepts the converter delta. Its tests verify body/provenance/map preservation, true no-ops, stale-input rejection and partial-effect recovery through the existing writer. The actual 40-ID fixture still requires independent review of its exact prepared plans before execution. Evidence is retained in the same work directory's CONVERTER-ROOT-CLOSEOUT-r1.md and converter-beam-review-r1.md.
