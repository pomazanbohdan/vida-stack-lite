---
instruction_id: run-every-activation-step-before-the-main-workflow
title: Run every activation step before the main workflow
summary: "The activation steps run first and in order, and everything they load is foundational context for the whole run."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: A run carries activation steps or persistent facts.
conditions_does_not_apply_when: There are no activation steps and no persistent facts.
artifact_contract_output_type: activation-record
artifact_contract_required_data:
  - the activation steps run
  - the persistent facts loaded
  - the order they ran in
artifact_contract_verified_by: every activation step ran before the first workflow step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Run every activation step before the main workflow
Execute each of these steps in order before proceeding (`_None._` means skip):
Treat every entry below as foundational context you carry for the rest of the workflow run.
Execute each of these steps in order (`_None._` means skip):
Activation is complete after all activation steps have run.
