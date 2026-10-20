---
instruction_id: merge-the-override-layers-by-field-kind
title: Merge the override layers by field kind
summary: "Scalars are overridden, append arrays grow in order, and keyed arrays replace matching keys and append the rest; the shape of the value decides the merge, not the name of the field."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: More than one layer of configuration is resolved into the effective value.
conditions_does_not_apply_when: Only one layer exists.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the merge rule per field kind
  - the resolved value of the changed fields
artifact_contract_verified_by: each field kind is resolved by its own rule
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-core-tools/help/customization.md
status: active
revision: 2
---

# Merge the override layers by field kind
- Scalars (`icon`, `role`, `*_template`, `on_complete`) — override wins.
- Append arrays — team/user entries append in order.
- Keyed arrays of tables (menu items with `code` or `id`) — matching keys replace, new keys append.
The value's shape decides the merge. The field name does not.
An override cannot remove a shipped item. Replace a keyed item with one that does nothing.
Appended: shipped, then team, then user.
