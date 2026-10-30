---
instruction_id: decide-which-side-is-wrong-not-which-side-is-likely
title: "Decide which side is wrong, not which side is likely"
summary: A mismatch between what was declared and what was done is resolved by naming which side is wrong — the execution over-reached or the declaration under-declared — and acting on that one.
capability_tags:
  - triage-reports
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A check reports that the work touched something outside what it declared.
conditions_does_not_apply_when: The declaration and the work agree.
artifact_contract_output_type: mismatch-disposition
artifact_contract_required_data:
  - the reported path
  - which side is wrong
  - the action that follows
artifact_contract_verified_by: the disposition names the side that is wrong and the action matches it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/interpret-scope-conformance-warnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Decide which side is wrong, not which side is likely
Decide which side is wrong: either the executor committed something outside its brief (over-reach)
under-declared what the work actually needed to touch
If the executor over-reached, review that path's changes specifically — it is already merged into the phase branch, so treat the review as catching it before it travels further (into a PR, a release, or a later phase).
