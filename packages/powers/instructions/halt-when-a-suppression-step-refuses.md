---
instruction_id: halt-when-a-suppression-step-refuses
title: Halt when a suppression step refuses
summary: "A write that refuses is never discarded silently: the run stops instead of continuing as if everything had been recorded."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A step that is supposed to record something refuses or fails.
conditions_does_not_apply_when: The step succeeded.
artifact_contract_output_type: refusal-record
artifact_contract_required_data:
  - the refusal
  - the reason the run stopped
artifact_contract_verified_by: the run stopped at the refusal and did not continue as if the record existed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/complete-milestone/detail/elaboration.md
status: active
revision: 1
---

# Halt when a suppression step refuses
The step HALTS before closing if any failed
Must never be silently discarded and let the close proceed as if everything were suppressed.
