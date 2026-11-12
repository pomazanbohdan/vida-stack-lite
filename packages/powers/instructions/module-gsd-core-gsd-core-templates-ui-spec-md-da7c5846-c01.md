---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-ui-spec-md-da7c5846-c01"
title: "gsd-core: gsd-core/templates/UI-SPEC.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/templates/UI-SPEC.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/UI-SPEC.md\"}"
atom_ids:
  - enumerate-the-inventory-from-the-installed-package-never-from-recall
  - reference-the-copy-contract-instead-of-restating-it
  - treat-an-unprovenanced-inventory-as-a-non-exhaustive-list
atom_count: 3
atoms: "[{\"atom_id\":\"enumerate-the-inventory-from-the-installed-package-never-from-recall\",\"file_sha256\":\"7c6079b652b87daa6dbc6d421f24cd41029b87dfca9d50b2a1c42425c3fbb71a\",\"content_sha256\":\"7e5eca718d598a206dfe7310058a177c5963267a4342d41bed1a6ba0ca7e1d8d\",\"file_bytes\":1457,\"body_bytes\":311},{\"atom_id\":\"reference-the-copy-contract-instead-of-restating-it\",\"file_sha256\":\"ee882bd0074c2a648e651b5f134eccdba5186726106e35708448a0fdada3c63a\",\"content_sha256\":\"c8544fd1b66257e0e777dabde3945ecea38710923ed26dc5eff8c8f304a2a74c\",\"file_bytes\":1271,\"body_bytes\":233},{\"atom_id\":\"treat-an-unprovenanced-inventory-as-a-non-exhaustive-list\",\"file_sha256\":\"ea278146f3630cc91df52143a4b0598cb4b84befdcdfef2d06f6e81f3fc96317\",\"content_sha256\":\"7ab5c870584257bcc1c28ddc7fe0e0cd9c3a91c9a88983569abacfc1acf2db2c\",\"file_bytes\":1438,\"body_bytes\":323}]"
carrier_sha256: f55217fbb70943ae4d7dbbd5313ea7257c5aa0a4f4b9693dd5cc55eb757d3faf
carrier_bytes: 4691
revision: 1
status: active
---
<!-- vpmodule:atom:begin enumerate-the-inventory-from-the-installed-package-never-from-recall -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UI-SPEC.md
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
<!-- vpmodule:atom:end enumerate-the-inventory-from-the-installed-package-never-from-recall -->
<!-- vpmodule:atom:begin reference-the-copy-contract-instead-of-restating-it -->
---
instruction_id: reference-the-copy-contract-instead-of-restating-it
title: Reference the copy contract instead of restating it
summary: "The state coverage references the copy rows rather than repeating the words, so the copy stays written in one place."
capability_tags:
  - design-user-interface
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A state coverage section and a copy contract both exist.
conditions_does_not_apply_when: There is no separate copy contract.
artifact_contract_output_type: copy-reference
artifact_contract_required_data:
  - the copy rows that are referenced
artifact_contract_verified_by: the state section references the copy rows and does not repeat them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Reference the copy contract instead of restating it
Empty-state and error-state COPY live in `## Copywriting Contract` above — this section covers
state coverage and REFERENCES those rows rather than restating the copy (de-dup).
<!-- vpmodule:atom:end reference-the-copy-contract-instead-of-restating-it -->
<!-- vpmodule:atom:begin treat-an-unprovenanced-inventory-as-a-non-exhaustive-list -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Treat an unprovenanced inventory as a non-exhaustive list
Without a provenance line this table is a **non-exhaustive** list of known-good components and never a closed allowlist — the executor may use anything the design system exports
Checking for a component outside the table is the expected path, not an exception.
<!-- vpmodule:atom:end treat-an-unprovenanced-inventory-as-a-non-exhaustive-list -->