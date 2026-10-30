---
instruction_id: carry-pre-validated-decisions-forward-as-locked
title: Carry pre-validated decisions forward as locked
summary: A decision that was already validated in an earlier experiment is loaded as locked and is not asked again.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - frozen-intent
conditions_applies_when: A decision from an earlier experiment is available when the next stage starts.
conditions_does_not_apply_when: The decision was never validated.
artifact_contract_output_type: carried-forward-decisions
artifact_contract_required_data:
  - the decision
  - the source it was validated in
artifact_contract_verified_by: the carried decision is marked locked and is not re-asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/spike-and-sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Carry pre-validated decisions forward as locked
pre-validated decisions (layout, colour palette, typography, spacing) are treated as locked and are not re-asked.
The planner also reads spike findings when a `spike-findings-*` skill is present, so validated technical choices (which library, which protocol, which data format) flow directly into task plans without repeated explanation.
