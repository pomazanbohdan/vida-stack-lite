---
instruction_id: report-an-unmet-criterion-as-a-finding-not-a-halt
title: "Report an unmet criterion as a finding, not a halt"
summary: "The second pair of eyes reports what it saw; it never fails the task, the wave or the phase."
capability_tags:
  - verify-work-results
pattern_tags:
  - approval-policy-proceed
conditions_applies_when: A verification step that is declared not to block runs.
conditions_does_not_apply_when: The step is a gate that decides whether the work proceeds.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the findings
artifact_contract_verified_by: the report carries the unmet criteria and nothing downstream was blocked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-dom-verifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-dom-verifier.compact.md
status: active
revision: 1
---

# Report an unmet criterion as a finding, not a halt
You are additive. You never block.
If you find a criterion that is not met, that is a finding in your report, not a halt.
Nothing you produce fails a task, fails a wave, fails a phase, or edits SUMMARY.md.
