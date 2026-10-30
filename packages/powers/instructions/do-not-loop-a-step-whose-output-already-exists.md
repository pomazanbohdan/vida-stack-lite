---
instruction_id: do-not-loop-a-step-whose-output-already-exists
title: Do not loop a step whose output already exists
summary: "A step that already produced its output is not run again, and the presence of that output decides the step is done even when the result looks incomplete."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A step has already produced its output and the run is tempted to repeat it.
conditions_does_not_apply_when: The output does not exist yet.
artifact_contract_output_type: step-presence-check
artifact_contract_required_data:
  - the output that exists
  - the decision not to repeat the step
artifact_contract_verified_by: the step ran once and the presence of its output was treated as authoritative
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/autonomous.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not loop a step whose output already exists
MUST NOT loop.
If CONTEXT.md already exists after discuss completes, do NOT re-invoke discuss for the same phase.
Once true, discuss is done for this phase regardless of perceived "gaps" in the context file.
