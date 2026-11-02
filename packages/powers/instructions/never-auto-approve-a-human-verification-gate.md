---
instruction_id: never-auto-approve-a-human-verification-gate
title: Never auto-approve a human verification gate
summary: A gate that needs a person is never approved on their behalf.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - human-in-the-loop
conditions_applies_when: An automatic run reaches a gate that needs a person to verify something.
conditions_does_not_apply_when: The gate is a decision the run may take itself.
artifact_contract_output_type: gate-report
artifact_contract_required_data:
  - the gate
  - what the automatic mode did
artifact_contract_verified_by: the gate was presented to the person and nothing was approved on their behalf
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never auto-approve a human verification gate
**Carve-out — overrides all branches above.**
never auto-approve or auto-select. Present to user (standard flow).
Auth gates cannot be automated.
