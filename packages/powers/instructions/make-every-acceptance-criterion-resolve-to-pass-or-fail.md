---
instruction_id: make-every-acceptance-criterion-resolve-to-pass-or-fail
title: Make every acceptance criterion resolve to pass or fail
summary: A criterion that cannot be judged is not a criterion; it is an adjective.
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: Acceptance criteria are written.
conditions_does_not_apply_when: The criteria already resolve to pass or fail.
artifact_contract_output_type: acceptance-criterion
artifact_contract_required_data:
  - the criterion
  - the way it resolves
artifact_contract_verified_by: every criterion is a checkbox that resolves to pass or fail
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make every acceptance criterion resolve to pass or fail
Every acceptance criterion must be a checkbox that resolves to PASS or FAIL.
No "should feel good", "looks reasonable", or "generally works" — those are not checkboxes.
