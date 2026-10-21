---
instruction_id: keep-an-additive-verification-step-additive
title: Keep an additive verification step additive
summary: "A verification step that only observes never halts the work, never fails the phase and never rewrites the record of the work."
capability_tags:
  - verify-work-results
pattern_tags:
  - graceful-degradation
conditions_applies_when: An observation-only verification step is about to run.
conditions_does_not_apply_when: The step is a gate that is meant to block.
artifact_contract_output_type: additive-verification
artifact_contract_required_data:
  - what the step observes
  - what it must not change
  - how an inability to observe is reported
artifact_contract_verified_by: the step observed and changed nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/live-dom-uat/fragments/execute-wave-post.md
status: active
revision: 1
---

# Keep an additive verification step additive
- This step is ADDITIVE. It never halts the wave, never fails the phase, and never rewrites SUMMARY.md. If you cannot look, say so and finish.
- Never invent a criterion. If the plan states no UI acceptance criteria, that is `outcome: nothing_to_report` / `reason: no_criteria`, and it is a perfectly good result.
