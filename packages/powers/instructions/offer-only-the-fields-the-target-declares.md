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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/customization.md
status: active
revision: 1
---

# Offer only the fields the target declares
It cannot change step logic.
Never invent a field.
The list is shipped with the target.
Updates overwrite it, so nobody edits it.
