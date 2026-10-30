---
instruction_id: distinguish-a-skipped-test-from-a-blocked-one
title: Distinguish a skipped test from a blocked one
summary: A skipped test and a blocked test are different outcomes and each carries its own reason.
capability_tags:
  - verify-work-results
pattern_tags:
  - report-triage
conditions_applies_when: A user acceptance test is not passed.
conditions_does_not_apply_when: The test passed.
artifact_contract_output_type: test-outcome
artifact_contract_required_data:
  - the outcome
  - the reason
  - the tag for a blocked test
artifact_contract_verified_by: a skipped test carries a reason and a blocked test carries a tag and a reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Distinguish a skipped test from a blocked one
`result` values: [pending], pass, issue, skipped, blocked
**If skipped: add `reason` if provided**
**If blocked: add `blocked_by` (tag) and `reason` (if provided)**
**blocked_by**: server | physical-device | release-build | third-party | prior-phase
