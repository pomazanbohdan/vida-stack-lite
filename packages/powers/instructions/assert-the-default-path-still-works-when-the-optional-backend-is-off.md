---
instruction_id: assert-the-default-path-still-works-when-the-optional-backend-is-off
title: Assert the default path still works when the optional backend is off
summary: An optional backend is shipped default-off and a regression test asserts the standard path on every combination where the backend is not available.
capability_tags:
  - verify-work-results
pattern_tags:
  - staged-exposure
conditions_applies_when: An optional execution backend is being introduced.
conditions_does_not_apply_when: The backend is the only way the work can run.
artifact_contract_output_type: default-path-regression
artifact_contract_required_data:
  - the combinations that are asserted
  - the standard path that is asserted
  - the default state of the backend
artifact_contract_verified_by: the standard path is asserted on every combination where the backend is unavailable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Assert the default path still works when the optional backend is off
- This is a release gate, not a nicety: a regression test asserts the inline fallback on every non-capable combination, so the capability is default-off and low-risk by construction.
