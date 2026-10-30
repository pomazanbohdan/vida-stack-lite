---
instruction_id: satisfy-the-invariant-not-the-hint
title: "Satisfy the invariant, not the hint"
summary: The property that must hold binds; the suggested route is one example of a way to reach it.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A finding arrives with the property it requires and a suggested route.
conditions_does_not_apply_when: The finding arrives without the property it requires.
artifact_contract_output_type: issue-resolution
artifact_contract_required_data:
  - the property that had to hold
  - the mechanism used
  - the finding it resolves
artifact_contract_verified_by: the property holds and the mechanism is reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Satisfy the invariant, not the hint
**What binds and what does not.** `required_property` (the invariant that must hold), `description` (the evidence it does not) and `severity` are binding. `fix_hint` is **one example** of a route to that property — an illustration, never an instruction. You address an issue by making `required_property` true; the hint's own mechanism is optional
An older checker may return an issue with no `required_property`. Derive it from `dimension` + `description` and state the derived property in your revision summary. Never treat the absence of the field as licence to apply `fix_hint` literally
**Prefer the smallest sufficient mechanism.** If a smaller change than the hint makes `required_property` true, take it — that fully addresses the issue and must be reported as addressed, naming the property satisfied and the mechanism used
