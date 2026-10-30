---
instruction_id: require-an-automated-verify-in-every-run-of-tasks
title: Require an automated verify in every run of tasks
summary: "A run of consecutive implementation tasks without an automated verification fails; the run of tasks is checked, not the plan as a whole."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The tasks of a plan are mapped to the waves they run in.
conditions_does_not_apply_when: The phase has no plan with tasks.
artifact_contract_output_type: verification-coverage-report
artifact_contract_required_data:
  - the wave
  - the tasks in the run
  - the count that carry an automated verify
artifact_contract_verified_by: no run of three consecutive tasks is left without an automated verify
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/nyquist-compliance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Require an automated verify in every run of tasks
Map tasks to waves. Per wave, any consecutive window of 3 implementation tasks must have ≥2 with `<automated>` verify. 3 consecutive without → **BLOCKING FAIL**
