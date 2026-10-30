---
instruction_id: reference-a-prior-summary-only-when-it-is-needed
title: Reference a prior summary only when it is needed
summary: "A prior plan is read only when this plan uses its types, its decision or its output; the chain is not built by reflex."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The context of a plan is assembled.
conditions_does_not_apply_when: The plan is the first in its wave.
artifact_contract_output_type: plan-context
artifact_contract_required_data:
  - the prior plans that are genuinely needed
  - the reason each is needed
artifact_contract_verified_by: no prior summary is referenced without a stated need
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/phase-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reference a prior summary only when it is needed
Only reference prior plan SUMMARYs if genuinely needed:
This plan uses types/exports from prior plan
Prior plan made decision that affects this plan
Do NOT reflexively chain: Plan 02 refs 01, Plan 03 refs 02...
