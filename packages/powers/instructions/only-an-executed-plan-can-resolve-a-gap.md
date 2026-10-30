---
instruction_id: only-an-executed-plan-can-resolve-a-gap
title: Only an executed plan can resolve a gap
summary: A gap is closed by a plan that was executed and produced its summary; a hand-written resolution still blocks.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - verification-before-completion
conditions_applies_when: A failed check is about to be marked as resolved.
conditions_does_not_apply_when: The gap was never recorded.
artifact_contract_output_type: gap-resolution
artifact_contract_required_data:
  - the plan that resolved the gap
  - the date it was resolved
artifact_contract_verified_by: the resolution names a plan that exists with a matching summary and a later regression opens a new gap
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Only an executed plan can resolve a gap
it updates the entry IN PLACE — `status: failed` → `status: resolved` — and adds `resolved_by` (the resolving plan's basename) and `resolved_at` (the date).
a hand-written `status: resolved` with no valid `resolved_by` still blocks
A later regression against the same test gets a fresh `gap_id`, never a reopened resolved one.
