---
instruction_id: make-every-requirement-falsifiable
title: Make every requirement falsifiable
summary: A requirement that no test or check could settle is not a requirement yet.
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: A requirement is written for a phase.
conditions_does_not_apply_when: The requirement is already stated as a pass or fail check.
artifact_contract_output_type: requirement-statement
artifact_contract_required_data:
  - the requirement
  - the check that would settle it
artifact_contract_verified_by: a test or check can be written that proves the requirement was met or not
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/spec.md
status: active
revision: 1
---

# Make every requirement falsifiable
Every requirement must be falsifiable — you can write a test or check that proves it was met or not. Vague requirements like "improve performance" are not allowed.
