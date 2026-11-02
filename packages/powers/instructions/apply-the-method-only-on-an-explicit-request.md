---
instruction_id: apply-the-method-only-on-an-explicit-request
title: Apply the method only on an explicit request
summary: The workflow runs only when the user asks for it; an unasked invocation changes nothing.
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: The method could be run on the current request.
conditions_does_not_apply_when: The user asked for the method.
artifact_contract_output_type: invocation-decision
artifact_contract_required_data:
  - the request that triggered the run
artifact_contract_verified_by: the run happened because the request asked for it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/copilot-instructions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Apply the method only on an explicit request
Do not apply the workflows unless the user explicitly asks for them.
