---
instruction_id: derive-the-next-step-from-the-artifacts-not-the-pointer
title: "Derive the next step from the artifacts, not from the pointer"
summary: The next step is derived from what the artefacts show - a unit whose plans have no matching summaries is unfinished even when the pointer has moved past it.
capability_tags:
  - execute-plan
pattern_tags:
  - scope-routing
conditions_applies_when: The run has to decide what to do next.
conditions_does_not_apply_when: The next step is already decided and recorded.
artifact_contract_output_type: next-step-decision
artifact_contract_required_data:
  - the unfinished unit
  - the reason the pointer was not trusted
artifact_contract_verified_by: the next step follows the artefacts on disk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/next.md
status: active
revision: 1
---

# Derive the next step from the artifacts, not from the pointer
This catches the common failure mode where a session died mid-execution (hang, token exhaustion, API connection drop)
Stop at the first such phase.
This is the lowest-numbered phase that needs continued execution.
errors are surfaced rather than suppressed
Plans without summaries: unfinished.
The pointer is not evidence.
