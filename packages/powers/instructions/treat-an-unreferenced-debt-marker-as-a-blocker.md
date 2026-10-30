---
instruction_id: treat-an-unreferenced-debt-marker-as-a-blocker
title: Treat an unreferenced debt marker as a blocker
summary: A debt marker in the changed files blocks the close-out unless the same line points at follow-up work that exists.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The changed files carry a debt marker.
conditions_does_not_apply_when: Every marker names a follow-up item.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - each marker
  - the follow-up it names or the fact that it names none
artifact_contract_verified_by: no marker without a follow-up reference is left unreported and the status carries the gap
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat an unreferenced debt marker as a blocker
**Debt marker gate:** Any `TBD`, `FIXME`, or `XXX` marker in a file modified by this phase is a 🛑 BLOCKER unless the same line references formal follow-up work (`issue #123`, `PR #123`, `#123`, or `DEF-*`). Unreferenced markers mean completion is not auditable; set `status: gaps_found` and list each marker under `gaps`.
