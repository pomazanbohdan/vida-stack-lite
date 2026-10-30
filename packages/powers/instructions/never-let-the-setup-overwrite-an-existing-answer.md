---
instruction_id: never-let-the-setup-overwrite-an-existing-answer
title: Never let the setup overwrite an existing answer
summary: "The setup never changes an answer that was already given; to change an answer, edit its key by hand in the file the setup reports for it."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: "A configuration answer has to change, or the setup step is about to run again."
conditions_does_not_apply_when: The answer has never been given and the setup asks for it the first time.
artifact_contract_output_type: answer-change
artifact_contract_required_data:
  - the answer
  - the file that holds it
  - the key to edit
artifact_contract_verified_by: "the setup leaves every answer that was already given unchanged, and the new answer is a hand edit"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/customization.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project/steps/auto-mode-config.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never let the setup overwrite an existing answer
The setup never changes an existing value.
To change an answer, edit its key in the file
it reports for it.

Ask a follow-up question only when the previous answer implies it; if the user cancels that follow-up, leave the existing value unchanged.
