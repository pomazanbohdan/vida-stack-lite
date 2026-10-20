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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/customization.md
status: active
revision: 1
---

# Reset an override by deleting the file or the field
Delete the override file, or the one field.
The skill uses shipped defaults on its next run.
