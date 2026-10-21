---
instruction_id: treat-an-unprovenanced-inventory-as-a-non-exhaustive-list
title: Treat an unprovenanced inventory as a non-exhaustive list
summary: "Without a provenance line the inventory lists the components that are known to be good, and never closes the set."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: A component inventory is consulted while building a surface.
conditions_does_not_apply_when: The inventory carries a provenance line.
artifact_contract_output_type: inventory-interpretation
artifact_contract_required_data:
  - the provenance line
  - the scope of the inventory
artifact_contract_verified_by: the inventory is treated as non-exhaustive unless it carries a provenance line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/UI-SPEC.md
status: active
revision: 1
---

# Treat an unprovenanced inventory as a non-exhaustive list
Without a provenance line this table is a **non-exhaustive** list of known-good components and never a closed allowlist — the executor may use anything the design system exports
Checking for a component outside the table is the expected path, not an exception.
