---
instruction_id: enumerate-the-inventory-from-the-installed-package-never-from-recall
title: "Enumerate the inventory from the installed package, never from recall"
summary: "The inventory records the command that enumerated it, the count, the resolved package and the date, or why it could not be enumerated."
capability_tags:
  - audit-codebase
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A component inventory is written.
conditions_does_not_apply_when: The inventory was already enumerated and recorded.
artifact_contract_output_type: inventory-provenance
artifact_contract_required_data:
  - the command
  - the count
  - the resolved package and version
  - the date
artifact_contract_verified_by: the inventory carries a provenance line or a recorded reason it could not be enumerated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/UI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Enumerate the inventory from the installed package, never from recall
What the project's design system actually provides. Enumerate this from the installed
package — never from recall.
Enumerated by `<command>` — <N> components — `<package>@<version>` — `<YYYY-MM-DD>`.
Could not enumerate: <reason>.
