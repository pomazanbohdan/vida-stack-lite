---
instruction_id: target-the-root-cause-category-in-a-gap-closure-plan
title: Target the root-cause category in a gap-closure plan
summary: "The fix plan names the category the gap came from — a plan deficiency, an execution miss or a changed assumption — and targets that, not the symptom."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A gap-closure plan is written for a reported gap.
conditions_does_not_apply_when: The gap has no known cause yet.
artifact_contract_output_type: root-cause-plan
artifact_contract_required_data:
  - the root-cause category
  - the fix that targets it
artifact_contract_verified_by: the fix targets the named category and not only the symptom
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Target the root-cause category in a gap-closure plan
Before writing the fix plan, apply a single "why" round: Why did this gap occur? Was it a plan deficiency (wrong task), an execution miss (correct task, wrong implementation), or a changed assumption (environment/dependency shift)? The fix plan must target the root cause category, not just the symptom
