---
instruction_id: measure-stall-by-lack-of-progress-not-runtime
title: "Measure stall by lack of progress, not by runtime"
summary: "A stalled worker is judged by the absence of progress, not by how long it has run."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - graceful-degradation
conditions_applies_when: A delegated agent has been running long enough to look stalled.
conditions_does_not_apply_when: The agent has produced its result.
artifact_contract_output_type: stall-assessment
artifact_contract_required_data:
  - the observed activity
  - the threshold that was crossed
artifact_contract_verified_by: the threshold was measured against the absence of progress and not against the total runtime
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Measure stall by lack of progress, not by runtime
The threshold measures time WITHOUT PROGRESS, not total runtime.
