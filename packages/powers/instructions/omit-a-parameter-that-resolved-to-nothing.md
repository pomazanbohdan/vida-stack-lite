---
instruction_id: omit-a-parameter-that-resolved-to-nothing
title: Omit a parameter that resolved to nothing
summary: "When a resolved value is empty or an inherit marker, the parameter is left out of the call instead of being passed with the empty value."
capability_tags:
  - execute-plan
pattern_tags:
  - safe-defaults
conditions_applies_when: A value was resolved for a call parameter and the resolution came back empty or as an inherit marker.
conditions_does_not_apply_when: The parameter is mandatory and the call cannot be made without it.
artifact_contract_output_type: call-shape
artifact_contract_required_data:
  - the resolved value
  - whether the parameter was passed or omitted
artifact_contract_verified_by: no empty or inherit value is passed as a parameter and the parameter is absent instead
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/model-profile-resolution.md
status: active
revision: 1
---

# Omit a parameter that resolved to nothing
**omit, do not emit an empty model.** When the resolved value is `"inherit"` or empty, **omit the `model=` parameter entirely**
No model parameter is passed at all — `planner_model` resolved to `"inherit"` or empty, and omitting it inherits the orchestrator's model.
This is not cosmetic, and both values really occur.
