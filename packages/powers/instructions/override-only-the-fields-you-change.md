---
instruction_id: override-only-the-fields-you-change
title: Override only the fields you change
summary: "Write a sparse override with only the changed fields, so every omitted field stays inherited and the next update is not silently shadowed."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An installed behaviour is changed by an override on top of the shipped defaults.
conditions_does_not_apply_when: "The behaviour is written from scratch, with no installed default underneath."
artifact_contract_output_type: sparse-override
artifact_contract_required_data:
  - the changed fields
  - the inherited fields
  - the layer
artifact_contract_verified_by: the override holds only the fields that changed and the merged result still carries the current defaults
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/customize/customize-bmad.md
status: active
revision: 1
---

# Override only the fields you change
Instead, create sparse override files that contain only the fields you change.
Every field you omit is inherited from the layer below.
A full copy locks in today's defaults, so the next update ships new values that your override silently shadows.
Trim the override back to only the fields you changed.
An override cannot delete a base item.
The resolver reads three files and the highest wins:
