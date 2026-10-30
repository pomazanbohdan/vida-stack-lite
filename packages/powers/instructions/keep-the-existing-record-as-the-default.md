---
instruction_id: keep-the-existing-record-as-the-default
title: Keep the existing record as the default
summary: "When a record already exists, keeping it is the default because regenerating it can rewrite a decision a person already made while nobody is there to notice."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A record already exists and the workflow could regenerate it.
conditions_does_not_apply_when: No record exists yet.
artifact_contract_output_type: existing-record-decision
artifact_contract_required_data:
  - the existing record
  - the default taken
  - the reason the default is the non-destructive one
artifact_contract_verified_by: the existing record was kept unless a person asked for it to be rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ai-integration-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the existing record as the default
Skip is the auto choice because it is the only non-destructive one: "Update" re-runs framework selection with the existing spec as baseline, which can rewrite decisions a person already recorded in it, and nobody is present to notice
