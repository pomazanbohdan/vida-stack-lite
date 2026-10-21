---
instruction_id: do-not-write-a-partial-artifact-when-the-delegated-step-fails
title: Do not write a partial artifact when the delegated step fails
summary: "When the delegated step fails, no partial and no empty report is written and the commit step is not reached; the failure is reported instead."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A delegated step that should produce a report failed.
conditions_does_not_apply_when: The delegated step returned a usable report.
artifact_contract_output_type: delegation-failure-record
artifact_contract_required_data:
  - the failure
  - the absence of a report
artifact_contract_verified_by: no partial or empty report exists and the commit step was not reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 1
---

# Do not write a partial artifact when the delegated step fails
If the Agent() call fails (agent error, timeout, or exception):
Do NOT create a partial or empty REVIEW.md. Exit workflow.
