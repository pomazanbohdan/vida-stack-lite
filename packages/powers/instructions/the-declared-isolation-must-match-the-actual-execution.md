---
instruction_id: the-declared-isolation-must-match-the-actual-execution
title: The declared isolation must match the actual execution
summary: "When the isolation is degraded the fan-out is degraded with it, because announcing a sequential mode and then running in parallel is the one outcome the degradation exists to prevent."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: The isolation of the workers is degraded and several of them could run at once.
conditions_does_not_apply_when: Each worker is isolated and can run at the same time safely.
artifact_contract_output_type: isolation-fanout-decision
artifact_contract_required_data:
  - the isolation that was decided
  - the fan-out that follows from it
artifact_contract_verified_by: the declared isolation and the way the workers were started agree
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/diagnose-issues.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# The declared isolation must match the actual execution
Isolation decides the fan-out, not just the flag
The agents would all run against the primary checkout, so spawn them one at a time, waiting for each to return before spawning the next
Degrading the flag while keeping the parallelism would announce sequential mode and then do the opposite.
