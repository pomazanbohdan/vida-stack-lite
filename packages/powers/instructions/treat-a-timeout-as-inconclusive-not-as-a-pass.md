---
instruction_id: treat-a-timeout-as-inconclusive-not-as-a-pass
title: "Treat a timeout as inconclusive, not as a pass"
summary: A check that timed out does not mark the work as complete.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check finished by timing out instead of returning a result.
conditions_does_not_apply_when: The check returned a result.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the exit state
  - what stayed unproven
artifact_contract_verified_by: the timed-out check did not mark the work as complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat a timeout as inconclusive, not as a pass
Only update tracking when tests passed
If tests failed or timed out, skip the tracking update — plans should not be marked as complete when integration tests are failing or inconclusive.
Timeout (124) is treated as inconclusive — do NOT mark plans complete
Skipping tracking update — test suite timed out. Plans remain in-progress. Run tests manually to confirm.
