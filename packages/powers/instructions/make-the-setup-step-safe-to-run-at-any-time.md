---
instruction_id: make-the-setup-step-safe-to-run-at-any-time
title: Make the setup step safe to run at any time
summary: The setup step creates and repairs what is installed and asks the new configuration questions; it is safe to run again at any time and is recommended after anything is installed or updated.
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: "The installation is set up, repaired or checked."
conditions_does_not_apply_when: Nothing was installed and nothing was updated.
artifact_contract_output_type: setup-step
artifact_contract_required_data:
  - what the setup creates and repairs
  - the questions it asks once
  - when it is run again
artifact_contract_verified_by: the setup can be run at any time without changing an answer that was already given
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/help.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Make the setup step safe to run at any time
It creates and repairs
the shared scripts other skills call,
and asks each installed module's new configuration questions.
Recommend it after anything is installed or updated.
