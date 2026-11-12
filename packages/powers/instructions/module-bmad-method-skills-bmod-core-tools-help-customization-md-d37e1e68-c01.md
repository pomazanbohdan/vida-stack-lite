---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmod-core-tools-help-customization-md-d37e1e68-c01"
title: "bmad-method: skills/bmod-core-tools/help/customization.md module"
summary: "Carrier for 3 atomic instructions from bmad-method:skills/bmod-core-tools/help/customization.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmod-core-tools/help/customization.md\"}"
atom_ids:
  - never-let-the-setup-overwrite-an-existing-answer
  - offer-only-the-fields-the-target-declares
  - reset-an-override-by-deleting-the-file-or-the-field
atom_count: 3
atoms: "[{\"atom_id\":\"never-let-the-setup-overwrite-an-existing-answer\",\"file_sha256\":\"eb9fb678c7142f243581320192b0c70ec92742ea0714713367255bd27d91172b\",\"content_sha256\":\"1542c5b22bd0a9ce0dac4c8073b447db1b8a065868659e2f36c0de830ba491fd\",\"file_bytes\":1640,\"body_bytes\":299},{\"atom_id\":\"offer-only-the-fields-the-target-declares\",\"file_sha256\":\"5753702d5a357ea3fe81e3f87a8bcd10cc7211bd48b6f4bf1c09df3d86ef82c7\",\"content_sha256\":\"9bb9ea9b6d490c3f2a105659043e39af4354d8394e7cc6b2d4102f30870b620d\",\"file_bytes\":1508,\"body_bytes\":174},{\"atom_id\":\"reset-an-override-by-deleting-the-file-or-the-field\",\"file_sha256\":\"4f3123908a1de772bec457697d2a748d9463f40a924dc3f3980be277675b6c0b\",\"content_sha256\":\"a8be68ed799fa7417003e533348562b9db193a4b3c8b936da1fa102a207bcc73\",\"file_bytes\":1258,\"body_bytes\":147}]"
carrier_sha256: 37d4574935531a7fa23378cca55f78b403eb5793614d3f4167ccd855c1b1c150
carrier_bytes: 4859
revision: 1
status: active
---
<!-- vpmodule:atom:begin never-let-the-setup-overwrite-an-existing-answer -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/customization.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project/steps/auto-mode-config.md
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
<!-- vpmodule:atom:end never-let-the-setup-overwrite-an-existing-answer -->
<!-- vpmodule:atom:begin offer-only-the-fields-the-target-declares -->
---
instruction_id: offer-only-the-fields-the-target-declares
title: Offer only the fields the target declares
summary: "A change may touch only the fields the target lists as changeable; that list ships with the target and is replaced by its updates, so nobody edits it, and a field that is not on the list is never invented."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: A change to the behaviour of an installed target has to be written as an override.
conditions_does_not_apply_when: The change is a change to the target itself rather than to its configuration.
artifact_contract_output_type: override-field-list
artifact_contract_required_data:
  - the fields the target declares as changeable
  - the field the change touches
  - the step logic the change may not touch
artifact_contract_verified_by: "every field in the override is one the target declares, and the target's own declaration is untouched"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/customization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Offer only the fields the target declares
It cannot change step logic.
Never invent a field.
The list is shipped with the target.
Updates overwrite it, so nobody edits it.
<!-- vpmodule:atom:end offer-only-the-fields-the-target-declares -->
<!-- vpmodule:atom:begin reset-an-override-by-deleting-the-file-or-the-field -->
---
instruction_id: reset-an-override-by-deleting-the-file-or-the-field
title: Reset an override by deleting the file or the field
summary: "An override is undone by deleting it: the whole file, or the one field, and the target falls back to the shipped defaults on its next run."
capability_tags:
  - write-configuration-override
pattern_tags:
  - instruction-authoring
conditions_applies_when: An override has to be undone.
conditions_does_not_apply_when: The override is being changed rather than removed.
artifact_contract_output_type: override-reset
artifact_contract_required_data:
  - the file or the field that is deleted
  - the layer the value falls back to
artifact_contract_verified_by: the target runs with the shipped defaults again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmod-core-tools/help/customization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Reset an override by deleting the file or the field
Delete the override file, or the one field.
The skill uses shipped defaults on its next run.
<!-- vpmodule:atom:end reset-an-override-by-deleting-the-file-or-the-field -->